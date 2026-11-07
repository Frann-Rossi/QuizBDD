import { expect, test, type Page } from '@playwright/test';
import { idIncorrecta, leerBanco, posicionEnPantalla, preguntaEnPantalla } from './ayudas';

import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

/** Cantidad de unidades = cantidad de archivos JSON del banco (así no se rompe al agregar una unidad). */
const CANTIDAD_UNIDADES = readdirSync(resolve(process.cwd(), 'src/content/preguntas')).filter((a) => a.endsWith('.json')).length;

const LETRAS = ['A', 'B', 'C', 'D'];

async function abrir(page: Page, ruta = '/quiz/unidad-5/') {
  await page.goto(ruta);
  const raiz = page.locator('[data-cuestionario]');
  await expect(raiz.locator('[data-vista-pregunta]')).toBeVisible();
  return { raiz, banco: await leerBanco(raiz) };
}

test.describe('Cuestionario individual', () => {
  test('al acertar muestra "¡Correcto!", bloquea las opciones y marca el progreso', async ({ page }) => {
    const { raiz, banco } = await abrir(page);
    const pregunta = await preguntaEnPantalla(raiz, banco);

    await raiz.locator(`button[data-opcion="${pregunta.respuestaCorrecta}"]`).click();

    await expect(raiz.locator('[data-retro-titulo]')).toHaveText('¡Correcto!');
    await expect(raiz.locator('[data-retro-estado]')).toContainText('Query OK');
    for (const boton of await raiz.locator('button[data-opcion]').all()) await expect(boton).toBeDisabled();
    await expect(raiz.locator('[data-segmentos] > span').first()).toHaveClass(/bg-ok/);
    await expect(raiz.locator('[data-puntaje]')).toHaveText('1 correcta de 1');
  });

  test('al fallar indica la letra correcta y explica por qué la elegida está mal', async ({ page }) => {
    const { raiz, banco } = await abrir(page);
    const pregunta = await preguntaEnPantalla(raiz, banco);
    const elegida = idIncorrecta(pregunta);

    await raiz.locator(`button[data-opcion="${elegida}"]`).click();

    const letraCorrecta = LETRAS[await posicionEnPantalla(raiz.locator('[data-opciones]'), pregunta.respuestaCorrecta)];
    const explicacionElegida = pregunta.opciones.find((o) => o.id === elegida)?.explicacion ?? '';

    await expect(raiz.locator('[data-retro-titulo]')).toHaveText('Incorrecto');
    await expect(raiz.locator('[data-retro-cuerpo]')).toContainText(`La respuesta correcta es la ${letraCorrecta}`);
    await expect(raiz.locator('[data-retro-cuerpo]')).toContainText(explicacionElegida);
    await expect(raiz.locator(`button[data-opcion="${elegida}"]`)).toHaveClass(/border-error/);
    await expect(raiz.locator(`button[data-opcion="${pregunta.respuestaCorrecta}"]`)).toHaveClass(/border-ok/);
  });

  test('los enlaces al material apuntan a una sección existente', async ({ page, request }) => {
    const { raiz, banco } = await abrir(page);
    const pregunta = await preguntaEnPantalla(raiz, banco);
    await raiz.locator(`button[data-opcion="${pregunta.respuestaCorrecta}"]`).click();

    const enlace = raiz.locator('[data-retro-enlaces] a').first();
    await expect(enlace).toHaveAttribute('target', '_blank');
    const href = (await enlace.getAttribute('href')) ?? '';
    const [ruta, seccion] = href.split('#');
    const respuesta = await request.get(ruta ?? '');
    expect(respuesta.status()).toBe(200);
    expect(await respuesta.text()).toContain(`id="${seccion}"`);
  });

  test('el SQL del enunciado se muestra resaltado', async ({ page }) => {
    const { raiz } = await abrir(page);
    // Avanzar hasta encontrar una pregunta con SQL en el enunciado (casi todas lo tienen).
    for (let i = 0; i < 10; i++) {
      if ((await raiz.locator('[data-enunciado] .text-sql-clave').count()) > 0) break;
      await raiz.locator('button[data-opcion]').first().click();
      await raiz.locator('[data-siguiente]').click();
    }
    await expect(raiz.locator('[data-enunciado] .text-sql-clave').first()).toBeVisible();
  });

  test('recorre la unidad completa, muestra el resultado y permite reintentar', async ({ page }) => {
    test.slow();
    const { raiz, banco } = await abrir(page, '/quiz/unidad-7/');
    let correctas = 0;

    for (let i = 0; i < banco.length; i++) {
      await expect(raiz.locator('[data-progreso]')).toHaveText(`Pregunta ${i + 1}/${banco.length}`);
      const pregunta = await preguntaEnPantalla(raiz, banco);
      const acertar = i % 3 !== 0;
      await raiz
        .locator(`button[data-opcion="${acertar ? pregunta.respuestaCorrecta : idIncorrecta(pregunta)}"]`)
        .click();
      if (acertar) correctas++;
      await raiz.locator('[data-siguiente]').click();
    }

    const vistaResultado = raiz.locator('[data-vista-resultado]');
    await expect(vistaResultado).toBeVisible();
    await expect(raiz.locator('[data-resultado-puntaje]')).toHaveText(`${correctas}/${banco.length}`);
    await expect(raiz.locator('[data-repaso-lista] > li')).toHaveCount(banco.length - correctas);

    await raiz.locator('[data-reintentar]').click();
    await expect(raiz.locator('[data-progreso]')).toHaveText(`Pregunta 1/${banco.length}`);
    await expect(raiz.locator('[data-puntaje]')).toHaveText('0 correctas de 0');
  });

  test('al repetir, la respuesta correcta no queda en la misma posición que la vez anterior', async ({ page }) => {
    test.slow();
    const { raiz, banco } = await abrir(page, '/quiz/unidad-6/');
    const posicionAnterior = new Map<string, number>();

    // Primera vuelta completa: registrar dónde estuvo la correcta de cada pregunta.
    for (let i = 0; i < banco.length; i++) {
      const pregunta = await preguntaEnPantalla(raiz, banco);
      posicionAnterior.set(pregunta.id, await posicionEnPantalla(raiz.locator('[data-opciones]'), pregunta.respuestaCorrecta));
      await raiz.locator(`button[data-opcion="${pregunta.respuestaCorrecta}"]`).click();
      await raiz.locator('[data-siguiente]').click();
    }

    // Segunda vuelta: ninguna correcta repite su posición.
    await raiz.locator('[data-reintentar]').click();
    for (let i = 0; i < banco.length; i++) {
      const pregunta = await preguntaEnPantalla(raiz, banco);
      const ahora = await posicionEnPantalla(raiz.locator('[data-opciones]'), pregunta.respuestaCorrecta);
      expect(ahora, `posición de la correcta en ${pregunta.id}`).not.toBe(posicionAnterior.get(pregunta.id));
      await raiz.locator(`button[data-opcion="${pregunta.respuestaCorrecta}"]`).click();
      await raiz.locator('[data-siguiente]').click();
    }
  });

  test('con "Anterior" se vuelve a una pregunta respondida, que queda bloqueada con su respuesta', async ({ page }) => {
    const { raiz, banco } = await abrir(page);
    const anterior = raiz.locator('[data-anterior]');
    const siguiente = raiz.locator('[data-siguiente]');

    await expect(anterior).toBeHidden();
    await expect(siguiente).toBeHidden();

    const primera = await preguntaEnPantalla(raiz, banco);
    const elegida = idIncorrecta(primera);
    await raiz.locator(`button[data-opcion="${elegida}"]`).click();
    await siguiente.click();

    // En la segunda pregunta, sin responder, se puede volver.
    await expect(raiz.locator('[data-progreso]')).toHaveText(`Pregunta 2/${banco.length}`);
    const segunda = await preguntaEnPantalla(raiz, banco);
    await anterior.click();

    await expect(raiz.locator('[data-progreso]')).toHaveText(`Pregunta 1/${banco.length}`);
    expect((await preguntaEnPantalla(raiz, banco)).id).toBe(primera.id);
    await expect(raiz.locator('[data-retro-titulo]')).toHaveText('Incorrecto');
    await expect(raiz.locator(`button[data-opcion="${elegida}"]`)).toHaveClass(/border-error/);
    for (const boton of await raiz.locator('button[data-opcion]').all()) await expect(boton).toBeDisabled();
    await expect(raiz.locator('[data-puntaje]')).toHaveText('0 correctas de 1');
    await expect(anterior).toBeHidden();

    // Al avanzar se retoma la segunda pregunta, todavía sin responder.
    await siguiente.click();
    expect((await preguntaEnPantalla(raiz, banco)).id).toBe(segunda.id);
    await expect(raiz.locator('[data-retro]')).toBeHidden();
    await expect(siguiente).toBeHidden();
    await expect(raiz.locator('button[data-opcion]').first()).toBeEnabled();
  });

  test('el modo mezclado incluye preguntas de varias unidades', async ({ page }) => {
    const { raiz, banco } = await abrir(page, '/quiz/todas/');
    expect(new Set(banco.map((p) => p.unidad)).size).toBe(CANTIDAD_UNIDADES);
    await expect(raiz.locator('[data-etiqueta]')).toContainText(/Unidad \d/);
  });
});
