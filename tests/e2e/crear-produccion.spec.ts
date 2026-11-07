import { expect, test } from '@playwright/test';

test.describe('Crear pregunta en producción', () => {
  test('la página no se publica y el menú no muestra la pestaña Crear', async ({ page }) => {
    const respuesta = await page.goto('/crear/');
    expect(respuesta?.status()).toBe(404);

    await page.goto('/');
    await expect(page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Crear' })).toHaveCount(0);
  });
});
