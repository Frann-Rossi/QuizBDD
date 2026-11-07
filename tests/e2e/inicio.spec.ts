import { expect, test } from '@playwright/test';
import { esperarSinDesbordeHorizontal } from './ayudas';

test.describe('Inicio', () => {
  test('muestra los modos de práctica y una tarjeta por unidad', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Quiz');
    await expect(page.getByRole('link', { name: /Todas las unidades/ })).toHaveAttribute('href', '/quiz/todas/');
    await expect(page.getByRole('link', { name: /Modo juego/ })).toHaveAttribute('href', '/juego/');

    const unidades = page.locator('a[href^="/quiz/unidad-"]');
    await expect(unidades).toHaveCount(3);
  });

  test('el total de preguntas coincide con la suma de las unidades', async ({ page }) => {
    await page.goto('/');
    const textoTotal = await page.getByText(/\d+ preguntas de \d+ unidades/).textContent();
    const total = Number(textoTotal?.match(/(\d+) preguntas/)?.[1]);

    const porUnidad = await page.locator('a[href^="/quiz/unidad-"]').evaluateAll((tarjetas) =>
      tarjetas.map((t) => Number(t.textContent?.match(/COUNT\(\*\) = (\d+)/)?.[1] ?? 0)),
    );
    expect(total).toBeGreaterThanOrEqual(139);
    expect(porUnidad.reduce((a, b) => a + b, 0)).toBe(total);
  });

  test('las tarjetas de unidad llevan a su cuestionario', async ({ page }) => {
    await page.goto('/');
    await page.locator('a[href="/quiz/unidad-6/"]').click();
    await expect(page).toHaveURL(/\/quiz\/unidad-6\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('CTE');
  });

  for (const ruta of ['/', '/quiz/todas/', '/quiz/unidad-5/', '/juego/']) {
    test(`no desborda horizontalmente: ${ruta}`, async ({ page }) => {
      await page.goto(ruta);
      await esperarSinDesbordeHorizontal(page);
    });
  }
});

test.describe('Tema claro / oscuro', () => {
  test('el selector tiene dos opciones y recuerda la elección', async ({ page }) => {
    await page.goto('/');
    const claro = page.getByRole('button', { name: 'Tema claro' });
    const oscuro = page.getByRole('button', { name: 'Tema oscuro' });
    await expect(page.locator('[data-tema-opcion]')).toHaveCount(2);

    await oscuro.click();
    await expect(page.locator('html')).toHaveAttribute('data-tema', 'oscuro');
    await expect(oscuro).toHaveAttribute('aria-pressed', 'true');
    await expect(claro).toHaveAttribute('aria-pressed', 'false');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-tema', 'oscuro');

    await page.getByRole('button', { name: 'Tema claro' }).click();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-tema', 'claro');
  });

  test.describe('sin preferencia guardada', () => {
    test.use({ colorScheme: 'dark' });

    test('usa el tema del sistema', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('html')).toHaveAttribute('data-tema', 'oscuro');
      await expect(page.getByRole('button', { name: 'Tema oscuro' })).toHaveAttribute('aria-pressed', 'true');
    });
  });

  test('los colores cambian de verdad al cambiar de tema', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Tema claro' }).click();
    const fondoClaro = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await page.getByRole('button', { name: 'Tema oscuro' }).click();
    const fondoOscuro = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(fondoOscuro).not.toBe(fondoClaro);
  });
});

test.describe('Material de estudio', () => {
  test('cada documento de material se publica', async ({ request }) => {
    for (const ruta of [
      '/material/unidad-05-subconsultas/subconsultas.html',
      '/material/unidad-06-cte/cte.html',
      '/material/unidad-07-vistas/vistas.html',
    ]) {
      const respuesta = await request.get(ruta);
      expect(respuesta.status(), ruta).toBe(200);
      expect(await respuesta.text()).toContain('<section');
    }
  });
});
