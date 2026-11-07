import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { bancoPreguntasSchema } from '../../src/lib/quiz/esquemas';

test.describe('Crear pregunta', () => {
  test('arma una pregunta con material, vista previa y descarga un JSON válido para el banco', async ({ page }) => {
    await page.goto('/crear/');

    await page.locator('#campo-unidad').selectOption('5');
    await page.locator('#campo-tema').fill('Prueba escalar');
    await expect(page.locator('#campo-id')).toHaveValue('u05-prueba-escalar');

    await page.locator('#campo-enunciado').fill('¿Qué devuelve una subconsulta escalar?');
    const textos = ['Una fila', 'Un único valor', 'Una tabla', 'Nada'];
    for (const [indice, letra] of ['a', 'b', 'c', 'd'].entries()) {
      await page.locator(`#opcion-${letra}-texto`).fill(textos[indice] ?? '');
      await page.locator(`#opcion-${letra}-explicacion`).fill(`Explicación de ${letra}.`);
    }
    await page.locator('#respuesta-b').check();
    await page.locator('#campo-explicacion').fill('Devuelve un valor.');
    await page.locator('#campo-resumen').fill('Un único valor para comparar.');

    await page.locator('#campo-documento').selectOption('unidad-05-subconsultas/subconsultas.html');
    await page.locator('#campo-seccion').selectOption('escalares');
    await page.getByRole('button', { name: '+ Agregar material' }).click();
    await expect(page.locator('#lista-material a')).toHaveAttribute(
      'href',
      '/material/unidad-05-subconsultas/subconsultas.html#escalares',
    );

    await page.getByRole('button', { name: /Vista previa/ }).click();
    await expect(page.locator('#vista-previa')).toContainText('"respuestaCorrecta": "b"');

    const [descarga] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Descargar JSON/ }).click(),
    ]);
    expect(descarga.suggestedFilename()).toBe('unidad-05-subconsultas.json');

    const ruta = await descarga.path();
    expect(ruta).toBeTruthy();
    const contenido: unknown = JSON.parse(await readFile(ruta!, 'utf-8'));

    // El archivo descargado debe cumplir el esquema completo del banco (el mismo que valida el build).
    const validacion = bancoPreguntasSchema.safeParse(contenido);
    expect(validacion.success, JSON.stringify(validacion.error?.issues, null, 2)).toBe(true);

    const banco = bancoPreguntasSchema.parse(contenido);
    expect(banco.unidad).toBe(5);
    const nueva = banco.preguntas.at(-1);
    expect(nueva?.id).toBe('u05-prueba-escalar');
    expect(nueva?.respuestaCorrecta).toBe('b');
    expect(nueva?.resumen).toBe('Un único valor para comparar.');
    expect(nueva?.material).toEqual([
      expect.objectContaining({ ruta: 'unidad-05-subconsultas/subconsultas.html', seccion: 'escalares' }),
    ]);
  });

  test('muestra los errores en español cuando falta información', async ({ page }) => {
    await page.goto('/crear/');
    // Cada select tiene un nombre accesible propio (no el texto de sus opciones).
    await expect(page.getByRole('combobox', { name: 'Unidad', exact: true })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Documento', exact: true })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Sección', exact: true })).toBeVisible();
    await page.getByRole('button', { name: /Vista previa/ }).click();
    await expect(page.locator('#lista-errores')).toContainText('Falta el enunciado.');
    await expect(page.locator('#lista-errores')).toContainText('Agregá al menos un material de estudio.');
  });

  test('no agrega material si no se eligió documento ni sección', async ({ page }) => {
    await page.goto('/crear/');
    await expect(page.locator('#campo-seccion')).toBeDisabled();

    await page.getByRole('button', { name: '+ Agregar material' }).click();
    await expect(page.locator('#lista-material li')).toHaveCount(0);
    await expect(page.getByRole('status')).toContainText('Primero elegí un documento.');

    await page.locator('#campo-documento').selectOption('unidad-05-subconsultas/subconsultas.html');
    await expect(page.locator('#campo-seccion')).toBeEnabled();
    await page.getByRole('button', { name: '+ Agregar material' }).click();
    await expect(page.locator('#lista-material li')).toHaveCount(0);
    await expect(page.getByRole('status')).toContainText('Elegí la sección del documento.');
  });

  test('la pestaña Crear está en el menú, visible en escritorio y celular, y lleva al formulario', async ({ page }) => {
    await page.goto('/');

    const menu = page.getByRole('navigation', { name: 'Principal' });
    const pestana = menu.getByRole('link', { name: 'Crear' });
    await expect(pestana).toBeVisible();
    await expect(pestana).toHaveAttribute('href', '/crear/');

    await pestana.click();
    await expect(page).toHaveURL(/\/crear\/$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Crear pregunta' })).toBeVisible();
    await expect(page.locator('#formulario-pregunta')).toBeVisible();
  });

  test('la página Crear no desborda horizontalmente', async ({ page }) => {
    await page.goto('/crear/');
    const desborde = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(desborde).toBeLessThanOrEqual(0);
  });
});
