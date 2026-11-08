import { expect, test } from '@playwright/test';

/**
 * Pruebas HTTP de los endpoints del servidor de autoría (solo con npm run dev).
 * Cada caso se rechaza antes de escribir nada: no se modifica el material ni los bancos.
 */
test.describe('Servidor de autoría por HTTP', () => {
  test('rechaza una carpeta de unidad que no es válida', async ({ request }) => {
    const respuesta = await request.post('/__autoria/material?carpeta=..&nombre=x.pdf', { data: 'x' });
    expect(respuesta.status()).toBe(400);
  });

  test('rechaza subir a una carpeta que no existe', async ({ request }) => {
    const respuesta = await request.post('/__autoria/material?carpeta=unidad-99-nueva&nombre=x.pdf', { data: 'x' });
    expect(respuesta.status()).toBe(404);
  });

  test('rechaza un nombre de archivo con extensión no permitida', async ({ request }) => {
    const respuesta = await request.post('/__autoria/material?carpeta=unidad-01-introduccion&nombre=x.exe', { data: 'x' });
    expect(respuesta.status()).toBe(400);
  });

  test('no guarda un banco que no existe', async ({ request }) => {
    const respuesta = await request.post('/__autoria/banco?archivo=unidad-99-nueva.json', { data: { unidad: 99 } });
    expect(respuesta.status()).toBe(404);
  });

  test('rechaza un cuerpo que no es JSON válido', async ({ request }) => {
    const respuesta = await request.post('/__autoria/banco?archivo=unidad-01-introduccion.json', {
      headers: { 'Content-Type': 'application/json' },
      data: Buffer.from('{no es json'),
    });
    expect(respuesta.status()).toBe(400);
  });

  test('rechaza un banco que no cumple el esquema', async ({ request }) => {
    const respuesta = await request.post('/__autoria/banco?archivo=unidad-01-introduccion.json', { data: { unidad: 1 } });
    expect(respuesta.status()).toBe(422);
  });

  test('solo acepta POST', async ({ request }) => {
    const respuesta = await request.get('/__autoria/banco?archivo=unidad-01-introduccion.json');
    expect(respuesta.status()).toBe(405);
  });
});
