import { expect, test } from '@playwright/test';

test.describe('Herramientas de autoría en producción', () => {
  test('Crear no se publica y no aparece en el menú', async ({ page }) => {
    const respuesta = await page.goto('/crear/');
    expect(respuesta?.status()).toBe(404);

    await page.goto('/');
    await expect(page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Crear' })).toHaveCount(0);
  });

  test('Preguntas no se publica y no aparece en el menú', async ({ page }) => {
    const respuesta = await page.goto('/preguntas/');
    expect(respuesta?.status()).toBe(404);

    await page.goto('/');
    await expect(page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Preguntas' })).toHaveCount(0);
  });
});
