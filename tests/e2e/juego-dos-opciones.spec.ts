import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * El banco real tiene preguntas de cuatro opciones. Para probar el juego con dos, la página se
 * intercepta en el navegador y cada pregunta se reduce a dos opciones (a y b). No se toca el banco.
 */
async function reducirADosOpciones(page: Page) {
  await page.route('**/juego/', async (ruta) => {
    const respuesta = await ruta.fetch();
    const html = await respuesta.text();
    const nuevo = html.replace(/(<script[^>]*data-preguntas[^>]*>)([\s\S]*?)(<\/script>)/, (_m, a, json, c) => {
      const preguntas = JSON.parse(json);
      const reducidas = preguntas.map((p: { opciones: { id: string }[]; respuestaCorrecta: string }) => {
        const correcta = p.opciones.find((o) => o.id === p.respuestaCorrecta);
        const otra = p.opciones.find((o) => o.id !== p.respuestaCorrecta);
        return { ...p, opciones: [{ ...correcta, id: 'a' }, { ...otra, id: 'b' }], respuestaCorrecta: 'a' };
      });
      return a + JSON.stringify(reducidas).replace(/</g, '\u003c') + c;
    });
    await ruta.fulfill({ response: respuesta, body: nuevo });
  });
}

async function empezar(page: Page): Promise<Locator> {
  await page.goto('/juego/');
  const raiz = page.locator('[data-juego]');
  const inputs = raiz.locator('input[data-nombre]');
  while ((await inputs.count()) < 3) await raiz.getByRole('button', { name: /Agregar jugador/ }).click();
  for (const [i, nombre] of ['Ana', 'Bruno', 'Carla'].entries()) await inputs.nth(i).fill(nombre);
  await raiz.locator('input[name="cantidad"][value="5"]').check();
  await raiz.getByRole('button', { name: /Empezar partida/ }).click();
  await expect(raiz.locator('[data-vista-ronda]')).toBeVisible();
  return raiz;
}

test.describe('Modo juego con preguntas de dos opciones', () => {
  test('muestra solo dos opciones y revela quién acertó en cada ronda', async ({ page }) => {
    await reducirADosOpciones(page);
    const raiz = await empezar(page);
    const revelar = raiz.getByRole('button', { name: /Revelar respuesta/ });

    for (let ronda = 1; ronda <= 3; ronda++) {
      await expect(raiz.locator('[data-opciones] [data-opcion]')).toHaveCount(2);
      await raiz.locator('[data-opciones] [data-opcion="a"]').getByRole('button', { name: /Ana vota/ }).click();
      await raiz.locator('[data-opciones] [data-opcion="a"]').getByRole('button', { name: /Bruno vota/ }).click();
      await raiz.locator('[data-opciones] [data-opcion="b"]').getByRole('button', { name: /Carla vota/ }).click();
      await expect(revelar).toBeEnabled();
      await revelar.click();
      await expect(raiz.locator('[data-revelacion-titulo]')).toHaveText('Acertaron Ana y Bruno');
      await expect(raiz.locator('[data-opciones] [data-opcion]')).toHaveCount(2);
      await raiz.getByRole('button', { name: /Siguiente|Ver ranking|Ver resultado/ }).first().click();
    }
  });
});

test.describe('Modo juego sin material de estudio', () => {
  test('al revelar, el bloque de material se oculta si la pregunta no tiene referencias', async ({ page }) => {
    await page.route('**/juego/', async (ruta) => {
      const respuesta = await ruta.fetch();
      const html = await respuesta.text();
      const nuevo = html.replace(/(<script[^>]*data-preguntas[^>]*>)([\s\S]*?)(<\/script>)/, (_m, a, json, c) => {
        const preguntas = JSON.parse(json).map((p: object) => ({ ...p, material: [] }));
        return a + JSON.stringify(preguntas).replace(/</g, '\u003c') + c;
      });
      await ruta.fulfill({ response: respuesta, body: nuevo });
    });
    const raiz = await empezar(page);
    await raiz.locator('[data-opciones] [data-opcion="a"]').getByRole('button', { name: /Ana vota/ }).click();
    await raiz.locator('[data-opciones] [data-opcion="a"]').getByRole('button', { name: /Bruno vota/ }).click();
    await raiz.locator('[data-opciones] [data-opcion="b"]').getByRole('button', { name: /Carla vota/ }).click();
    await raiz.getByRole('button', { name: /Revelar respuesta/ }).click();
    await expect(raiz.locator('[data-revelacion-titulo]')).toBeVisible();
    await expect(raiz.locator('[data-enlaces]').locator('..')).toBeHidden();
  });
});
