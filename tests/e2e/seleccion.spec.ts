import { expect, test, type Page } from '@playwright/test';
import { leerBanco } from './ayudas';

/**
 * El banco incrustado trae todas las preguntas: el filtro se aplica en el navegador.
 * Por eso se verifica lo que se muestra: el total de la sesión y la unidad de la primera pregunta.
 */
async function verSesion(page: Page, unidades: number[]) {
  const banco = await leerBanco(page.locator('[data-cuestionario]'));
  const esperadas = banco.filter((p) => unidades.includes(p.unidad)).length;
  await expect(page.locator('[data-progreso]')).toHaveText(`Pregunta 1/${esperadas}`);
  const etiqueta = (await page.locator('[data-etiqueta]').textContent()) ?? '';
  expect(unidades).toContain(Number(etiqueta.match(/^Unidad (\d+)/)?.[1]));
}

test.describe('Elegir unidades', () => {
  test('desde el inicio se llega a la selección, y Empezar está deshabilitado sin unidades', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /Elegir unidades/ }).click();
    await expect(page).toHaveURL(/\/seleccion\/$/);
    await expect(page.getByRole('button', { name: /Empezar/ })).toBeDisabled();
  });

  test('repasa solo las unidades 2 y 3 elegidas', async ({ page }) => {
    await page.goto('/seleccion/');
    await page.getByLabel(/Unidad 2/).check();
    await page.getByLabel(/Unidad 3/).check();
    await expect(page.locator('#resumen-seleccion')).toContainText('2 unidades');
    await page.getByRole('button', { name: /Empezar/ }).click();

    await expect(page).toHaveURL(/\/quiz\/todas\/\?unidades=2&unidades=3$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Unidades 2 y 3');
    await verSesion(page, [2, 3]);
  });

  test('combina unidades no consecutivas: 1, 3 y 4', async ({ page }) => {
    await page.goto('/seleccion/');
    await page.getByLabel(/Unidad 1/).check();
    await page.getByLabel(/Unidad 3/).check();
    await page.getByLabel(/Unidad 4/).check();
    await page.getByRole('button', { name: /Empezar/ }).click();

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Unidades 1, 3 y 4');
    await verSesion(page, [1, 3, 4]);
  });

  test('sin el parámetro, el modo todas sigue mostrando varias unidades', async ({ page }) => {
    await page.goto('/quiz/todas/');
    const banco = await leerBanco(page.locator('[data-cuestionario]'));
    expect(new Set(banco.map((p) => p.unidad)).size).toBeGreaterThan(3);
  });
});
