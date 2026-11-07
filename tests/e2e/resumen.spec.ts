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
