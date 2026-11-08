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

test('importar un JSON válido agrega sus preguntas a la unidad elegida', async ({ page }) => {
  const preguntas = [
    {
      id: 'u01-prueba-importar-1',
      tema: 'Importación de prueba',
      enunciado: '¿Pregunta importada?',
      opciones: [
        { id: 'a', texto: 'Sí', explicacion: 'Correcta.' },
        { id: 'b', texto: 'No', explicacion: 'Incorrecta.' },
      ],
      respuestaCorrecta: 'a',
      material: [],
    },
    {
      id: 'u01-prueba-importar-2',
      tema: 'Importación de prueba con material',
      enunciado: '¿Otra pregunta importada?',
      opciones: [
        { id: 'a', texto: 'No', explicacion: 'Incorrecta.' },
        { id: 'b', texto: 'Sí', explicacion: 'Correcta.' },
        { id: 'c', texto: 'Tal vez', explicacion: 'Incorrecta.' },
      ],
      respuestaCorrecta: 'b',
      explicacion: 'Explicación general.',
      material: [{ titulo: 'Subconsultas', ruta: 'unidad-05-subconsultas/subconsultas.html', seccion: 'escalares' }],
    },
  ];
  await page.goto('/crear/');
  await page.locator('#campo-unidad').selectOption('1');
  await page.locator('#campo-json').setInputFiles({
    name: 'preguntas.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(preguntas)),
  });
  await expect(async () => {
    await page.locator('#boton-importar').click();
    await expect(page.locator('#estado-importacion')).toContainText('Importadas 2', { timeout: 2000 });
  }).toPass();

  const ids = leer(ARCHIVO_1).preguntas.map((p) => p.id);
  expect(ids).toContain('u01-prueba-importar-1');
  expect(ids).toContain('u01-prueba-importar-2');
});
