import { expect, test } from '@playwright/test';
import { leerBanco, preguntaEnPantalla } from './ayudas';

/** Responde la pregunta en pantalla con la opción correcta y devuelve la pregunta. */
async function responderCorrectamente(page: import('@playwright/test').Page) {
  const raiz = page.locator('[data-cuestionario]');
  const banco = await leerBanco(raiz);
  const pregunta = await preguntaEnPantalla(raiz, banco);
  await raiz.locator(`button[data-opcion="${pregunta.respuestaCorrecta}"]`).click();
  return { raiz, pregunta };
}

test.describe('Resumen en la explicación', () => {
  test('muestra el resumen al responder cuando la pregunta lo tiene', async ({ page }) => {
    await page.goto('/quiz/unidad-1/');
    const { raiz, pregunta } = await responderCorrectamente(page);

    expect(pregunta.resumen, 'la unidad 1 debería tener resumen').toBeTruthy();
    const cuerpo = raiz.locator('[data-retro-cuerpo]');
    await expect(cuerpo.getByText('Resumen', { exact: true })).toBeVisible();
    await expect(cuerpo).toContainText(pregunta.resumen ?? '');
  });

  test('no muestra el bloque de resumen si la pregunta no lo tiene', async ({ page }) => {
    await page.goto('/quiz/unidad-5/');
    const { raiz, pregunta } = await responderCorrectamente(page);

    expect(pregunta.resumen, 'la unidad 5 no tiene resúmenes').toBeUndefined();
    await expect(raiz.locator('[data-retro-cuerpo]').getByText('Resumen', { exact: true })).toHaveCount(0);
  });
});

test.describe('Resumen en el modo juego', () => {
  test('la explicación al revelar muestra el resumen de la pregunta', async ({ page }) => {
    // Todas las preguntas reciben un resumen de prueba (en el navegador, sin tocar el banco).
    await page.route('**/juego/', async (ruta) => {
      const respuesta = await ruta.fetch();
      const html = await respuesta.text();
      const nuevo = html.replace(/(<script[^>]*data-preguntas[^>]*>)([\s\S]*?)(<\/script>)/, (_m, a, json, c) => {
        const preguntas = JSON.parse(json);
        const conResumen = preguntas.map((p: { resumen?: string }) => ({ ...p, resumen: 'Resumen de prueba.' }));
        return a + JSON.stringify(conResumen).replace(/</g, '\\u003c') + c;
      });
      await ruta.fulfill({ response: respuesta, body: nuevo });
    });

    await page.goto('/juego/');
    const raiz = page.locator('[data-juego]');
    const inputs = raiz.locator('input[data-nombre]');
    while ((await inputs.count()) < 2) await raiz.getByRole('button', { name: /Agregar jugador/ }).click();
    await inputs.nth(0).fill('Ana');
    await inputs.nth(1).fill('Bruno');
    await raiz.getByRole('button', { name: /Empezar partida/ }).click();
    await expect(raiz.locator('[data-vista-ronda]')).toBeVisible();

    await raiz.locator('[data-opciones] [data-opcion]').first().getByRole('button', { name: /Ana vota/ }).click();
    await raiz.locator('[data-opciones] [data-opcion]').first().getByRole('button', { name: /Bruno vota/ }).click();
    await raiz.getByRole('button', { name: /Revelar respuesta/ }).click();

    await expect(raiz.locator('[data-explicacion]').getByText('Resumen', { exact: true })).toBeVisible();
    await expect(raiz.locator('[data-explicacion]')).toContainText('Resumen de prueba.');
  });
});
