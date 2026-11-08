import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

/**
 * Estos tests solo leen y abren formularios: no guardan ni eliminan nada del banco real.
 * El borrado se cancela en el diálogo de confirmación.
 */
const banco = JSON.parse(readFileSync(join(process.cwd(), 'src/content/preguntas/unidad-01-introduccion.json'), 'utf-8'));

test.describe('Preguntas (herramienta de autoría)', () => {
  test('lista las preguntas de cada unidad con su cantidad', async ({ page }) => {
    await page.goto('/preguntas/');
    await expect(page.getByRole('heading', { level: 1, name: 'Preguntas' })).toBeVisible();
    await expect(page.locator('section[data-unidad="1"] li[data-pregunta]')).toHaveCount(banco.preguntas.length);
  });

  test('el buscador muestra solo las preguntas que coinciden', async ({ page }) => {
    await page.goto('/preguntas/');
    await page.locator('#buscar-pregunta').fill('u01-clave-candidata');
    await expect(page.locator('li[data-pregunta]:visible')).toHaveCount(1);
    await expect(page.locator('li[data-pregunta]:visible')).toContainText('u01-clave-candidata');
  });

  test('editar abre el formulario de Crear con la pregunta cargada', async ({ page }) => {
    await page.goto('/preguntas/');
    const pregunta = banco.preguntas.find((p: { id: string }) => p.id === 'u01-clave-candidata');
    await page.locator('li[data-pregunta="u01-clave-candidata"] a', { hasText: 'Editar' }).click();

    await expect(page).toHaveURL(/\/crear\/\?editar=u01-clave-candidata$/);
    await expect(page.locator('#aviso-edicion')).toBeVisible();
    await expect(page.locator('#campo-tema')).toHaveValue(pregunta.tema);
    await expect(page.locator('#campo-enunciado')).toHaveValue(pregunta.enunciado);
    await expect(page.locator(`#respuesta-${pregunta.respuestaCorrecta}`)).toBeChecked();
  });

  test('cancelar la eliminación no cambia nada', async ({ page }) => {
    const pedidos: string[] = [];
    page.on('request', (pedido) => {
      if (pedido.url().includes('/__autoria/')) pedidos.push(pedido.url());
    });
    page.on('dialog', (dialogo) => dialogo.dismiss());

    await page.goto('/preguntas/');
    const antes = await page.locator('section[data-unidad="1"] li[data-pregunta]').count();
    await page.locator('button[data-eliminar="u01-clave-candidata"]').click();

    await expect(page.locator('section[data-unidad="1"] li[data-pregunta]')).toHaveCount(antes);
    expect(pedidos).toHaveLength(0);
  });
});

test.describe('Preguntas en el menú y en celular', () => {
  test('el menú muestra Preguntas en cualquier tamaño y la página no desborda', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Preguntas' })).toBeVisible();

    await page.goto('/preguntas/');
    const desborde = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(desborde).toBeLessThanOrEqual(0);
  });
});
