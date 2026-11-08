import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

/**
 * Prueba el flujo real de Editar → Guardar. Escribe en los bancos de las unidades 1 y 2, así que
 * guarda los originales al empezar y los restaura siempre al terminar (también si algo falla).
 */
const RAIZ = join(process.cwd(), 'src', 'content', 'preguntas');
const ARCHIVO_1 = join(RAIZ, 'unidad-01-introduccion.json');
const ARCHIVO_2 = join(RAIZ, 'unidad-02-consultas-basicas.json');
const ID = 'u01-clave-candidata';

const originales = { uno: readFileSync(ARCHIVO_1, 'utf-8'), dos: readFileSync(ARCHIVO_2, 'utf-8') };
const leer = (ruta: string) => JSON.parse(readFileSync(ruta, 'utf-8')) as { preguntas: { id: string; tema: string }[] };

test.afterAll(() => {
  writeFileSync(ARCHIVO_1, originales.uno);
  writeFileSync(ARCHIVO_2, originales.dos);
});

test.describe.configure({ mode: 'serial' });

test('editar una pregunta y guardarla reemplaza su contenido en el banco', async ({ page }) => {
  await page.goto(`/crear/?editar=${ID}`);
  await expect(page.locator('#aviso-edicion')).toBeVisible();
  await page.locator('#campo-tema').fill('Clave candidata (prueba de guardado)');
  // El script de la página se carga después del HTML: se reintenta el guardado hasta que responda.
  await expect(async () => {
    await page.locator('#boton-guardar-banco').click();
    await expect(page.locator('#mensaje-estado')).toContainText('Guardado en unidad-01-introduccion.json', { timeout: 2000 });
  }).toPass();
  const pregunta = leer(ARCHIVO_1).preguntas.find((p) => p.id === ID);
  expect(pregunta?.tema).toBe('Clave candidata (prueba de guardado)');
});

test('cambiar la unidad de una pregunta la mueve al banco nuevo', async ({ page }) => {
  await page.goto(`/crear/?editar=${ID}`);
  await expect(page.locator('#aviso-edicion')).toBeVisible();
  await page.locator('#campo-unidad').selectOption('2');
  await expect(async () => {
    await page.locator('#boton-guardar-banco').click();
    await expect(page.locator('#mensaje-estado')).toContainText('Guardado en unidad-02-consultas-basicas.json', { timeout: 2000 });
  }).toPass();
  expect(leer(ARCHIVO_1).preguntas.some((p) => p.id === ID)).toBe(false);
  expect(leer(ARCHIVO_2).preguntas.some((p) => p.id === ID)).toBe(true);
});
