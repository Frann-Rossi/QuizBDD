import { expect, test, type Locator, type Page } from '@playwright/test';
import { idIncorrecta, leerBanco, preguntaEnPantalla } from './ayudas';

const JUGADORES = ['Ana', 'Bruno', 'Carla'];

async function cargarJugadores(page: Page, nombres: string[]): Promise<Locator> {
  await page.goto('/juego/');
  const raiz = page.locator('[data-juego]');
  const inputs = raiz.locator('input[data-nombre]');
  while ((await inputs.count()) < nombres.length) await raiz.getByRole('button', { name: /Agregar jugador/ }).click();
  for (const [i, nombre] of nombres.entries()) await inputs.nth(i).fill(nombre);
  return raiz;
}

async function empezar(page: Page, nombres = JUGADORES, cantidad = '5'): Promise<Locator> {
  const raiz = await cargarJugadores(page, nombres);
  await raiz.locator(`input[name="cantidad"][value="${cantidad}"]`).check();
  await raiz.getByRole('button', { name: /Empezar partida/ }).click();
  await expect(raiz.locator('[data-vista-ronda]')).toBeVisible();
  return raiz;
}

/** Botón del jugador `nombre` dentro de la opción `opcionId`. */
function voto(raiz: Locator, opcionId: string, nombre: string): Locator {
  return raiz.locator(`[data-opciones] [data-opcion="${opcionId}"]`).getByRole('button', { name: `${nombre} vota`, exact: false });
}

test.describe('Modo juego · configuración', () => {
  test('arranca con 2 jugadores, permite agregar hasta 8 y no quitar por debajo de 2', async ({ page }) => {
    await page.goto('/juego/');
    const raiz = page.locator('[data-juego]');
    const inputs = raiz.locator('input[data-nombre]');
    const agregar = raiz.getByRole('button', { name: /Agregar jugador/ });

    await expect(inputs).toHaveCount(2);
    // Con el mínimo de jugadores el botón de quitar queda deshabilitado (y oculto, fuera del árbol accesible).
    await expect(raiz.locator('[data-lista-jugadores] > li').first().locator('button')).toBeDisabled();

    for (let i = 2; i < 8; i++) await agregar.click();
    await expect(inputs).toHaveCount(8);
    await expect(agregar).toBeDisabled();
    await expect(raiz.locator('[data-contador-jugadores]')).toHaveText('8/8');

    await raiz.getByRole('button', { name: 'Quitar jugador 8' }).click();
    await expect(inputs).toHaveCount(7);
    await expect(agregar).toBeEnabled();
  });

  test('rechaza nombres repetidos', async ({ page }) => {
    const raiz = await cargarJugadores(page, ['Ana', 'ana']);
    await raiz.getByRole('button', { name: /Empezar partida/ }).click();
    await expect(raiz.locator('[data-error-config]')).toContainText('está repetido');
    await expect(raiz.locator('[data-vista-config]')).toBeVisible();
  });

  test('usa "Jugador N" si un nombre queda vacío y recuerda los nombres', async ({ page }) => {
    const raiz = await cargarJugadores(page, ['Ana', '']);
    await raiz.getByRole('button', { name: /Empezar partida/ }).click();
    await expect(raiz.locator('[data-marcador]')).toContainText('Jugador 2');

    await page.reload();
    await expect(page.locator('input[data-nombre]').first()).toHaveValue('Ana');
  });

  test('respeta la cantidad de preguntas elegida', async ({ page }) => {
    const raiz = await empezar(page, JUGADORES, '5');
    await expect(raiz.locator('[data-ronda-progreso]')).toHaveText('Pregunta 1/5');
  });
});

test.describe('Modo juego · votación', () => {
  test('cada opción muestra a todos los jugadores, en orden, para votar', async ({ page }) => {
    const raiz = await empezar(page);
    const opciones = raiz.locator('[data-opciones] [data-opcion]');
    await expect(opciones).toHaveCount(4);
    for (const opcion of await opciones.all()) {
      await expect(opcion.locator('button[data-jugador]')).toHaveText(JUGADORES);
    }
  });

  test('un voto por jugador: votar otra opción lo mueve y tocar de nuevo lo quita', async ({ page }) => {
    const raiz = await empezar(page);
    const ids = await raiz.locator('[data-opciones] [data-opcion]').evaluateAll((n) => n.map((e) => (e as HTMLElement).dataset['opcion'] ?? ''));
    const [primera = 'a', segunda = 'b'] = ids;

    await voto(raiz, primera, 'Ana').click();
    await expect(voto(raiz, primera, 'Ana')).toHaveAttribute('aria-pressed', 'true');
    await expect(raiz.locator('[data-votacion-conteo]')).toHaveText('Votaron 1/3');

    await voto(raiz, segunda, 'Ana').click();
    await expect(voto(raiz, primera, 'Ana')).toHaveAttribute('aria-pressed', 'false');
    await expect(voto(raiz, segunda, 'Ana')).toHaveAttribute('aria-pressed', 'true');
    await expect(raiz.locator('[data-votacion-conteo]')).toHaveText('Votaron 1/3');

    await voto(raiz, segunda, 'Ana').click();
    await expect(voto(raiz, segunda, 'Ana')).toHaveAttribute('aria-pressed', 'false');
    await expect(raiz.locator('[data-votacion-conteo]')).toHaveText('Votaron 0/3');
  });

  test('"Revelar" se habilita recién cuando votaron todos y muestra quién acertó', async ({ page }) => {
    const raiz = await empezar(page);
    const banco = await leerBanco(raiz);
    const pregunta = await preguntaEnPantalla(raiz, banco);
    const incorrecta = idIncorrecta(pregunta);
    const revelar = raiz.getByRole('button', { name: /Revelar respuesta/ });

    await voto(raiz, pregunta.respuestaCorrecta, 'Ana').click();
    await voto(raiz, incorrecta, 'Bruno').click();
    await expect(revelar).toBeDisabled();
    await expect(raiz.locator('[data-votacion-faltan]')).toHaveText('Falta votar: Carla');

    await voto(raiz, pregunta.respuestaCorrecta, 'Carla').click();
    await expect(revelar).toBeEnabled();
    await revelar.click();

    await expect(raiz.locator('[data-revelacion-titulo]')).toHaveText('Acertaron Ana y Carla');
    const resultados = raiz.locator('[data-resultados-ronda] > li');
    await expect(resultados).toHaveCount(3);
    await expect(resultados.nth(0)).toHaveAttribute('aria-label', /^Ana: correcto/);
    await expect(resultados.nth(1)).toHaveAttribute('aria-label', /^Bruno: incorrecto/);

    // Quién votó cada opción queda a la vista, con color de acierto o error.
    const correcta = raiz.locator(`[data-opciones] [data-opcion="${pregunta.respuestaCorrecta}"]`);
    await expect(correcta).toHaveClass(/border-ok/);
    await expect(correcta.locator('[data-zona-votos]')).toContainText('Ana');
    await expect(correcta.locator('[data-zona-votos]')).toContainText('Carla');
    await expect(raiz.locator(`[data-opciones] [data-opcion="${incorrecta}"] [data-zona-votos]`)).toContainText('Bruno');

    await expect(raiz.locator('[data-marcador]')).toContainText('Ana1');
    await expect(raiz.locator('[data-marcador]')).toContainText('Bruno0');
  });

  test('el orden de los jugadores es siempre el mismo (el jugador 1 primero)', async ({ page }) => {
    const raiz = await empezar(page);
    const banco = await leerBanco(raiz);

    for (let ronda = 0; ronda < 3; ronda++) {
      await expect(raiz.locator('[data-marcador] > li > span:first-child')).toHaveText(JUGADORES);
      await expect(raiz.locator('[data-opciones] [data-opcion]').first().locator('button[data-jugador]')).toHaveText(JUGADORES);

      const pregunta = await preguntaEnPantalla(raiz, banco);
      for (const nombre of JUGADORES) await voto(raiz, pregunta.respuestaCorrecta, nombre).click();
      await raiz.getByRole('button', { name: /Revelar respuesta/ }).click();
      await raiz.locator('[data-siguiente]').click();
    }
  });

  test('una partida completa termina con el ranking correcto', async ({ page }) => {
    const raiz = await empezar(page, JUGADORES, '5');
    const banco = await leerBanco(raiz);

    // Ana acierta siempre, Bruno en las rondas pares (3 de 5), Carla nunca.
    for (let ronda = 0; ronda < 5; ronda++) {
      const pregunta = await preguntaEnPantalla(raiz, banco);
      await voto(raiz, pregunta.respuestaCorrecta, 'Ana').click();
      await voto(raiz, ronda % 2 === 0 ? pregunta.respuestaCorrecta : idIncorrecta(pregunta), 'Bruno').click();
      await voto(raiz, idIncorrecta(pregunta), 'Carla').click();
      await raiz.getByRole('button', { name: /Revelar respuesta/ }).click();
      await raiz.locator('[data-siguiente]').click();
    }

    await expect(raiz.locator('[data-vista-final]')).toBeVisible();
    await expect(raiz.locator('[data-ganador]')).toHaveText('¡Ganó Ana!');
    const filas = raiz.locator('[data-ranking] > li');
    await expect(filas.nth(0)).toContainText('Ana');
    await expect(filas.nth(0)).toContainText('5/5');
    await expect(filas.nth(1)).toContainText('Bruno');
    await expect(filas.nth(1)).toContainText('3/5');
    await expect(filas.nth(2)).toContainText('Carla');
    await expect(filas.nth(2)).toContainText('0/5');

    await raiz.getByRole('button', { name: /Revancha/ }).click();
    await expect(raiz.locator('[data-ronda-progreso]')).toHaveText('Pregunta 1/5');
    await expect(raiz.locator('[data-marcador]')).toContainText('Ana0');
  });

  test('con 8 jugadores de nombres largos no desborda la pantalla', async ({ page }) => {
    const nombres = ['Valentina', 'Bartolomé', 'Maximiliano', 'Guadalupe', 'Hernán', 'Florencia', 'Ezequiel', 'Josefina'];
    await empezar(page, nombres);
    const { scroll, ancho } = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      ancho: document.documentElement.clientWidth,
    }));
    expect(scroll).toBeLessThanOrEqual(ancho);
  });
});
