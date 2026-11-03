import { expect, type Locator, type Page } from '@playwright/test';
import type { PreguntaCuestionario } from '../../src/types/quiz';

/**
 * Las preguntas y sus opciones se mezclan al azar, así que los tests no dependen de un orden:
 * leen el banco incrustado en la página y buscan la pregunta que se está mostrando.
 */
export async function leerBanco(raiz: Locator): Promise<PreguntaCuestionario[]> {
  const json = await raiz.locator('script[data-preguntas]').textContent();
  return JSON.parse(json ?? '[]') as PreguntaCuestionario[];
}

export async function preguntaEnPantalla(raiz: Locator, banco: PreguntaCuestionario[]): Promise<PreguntaCuestionario> {
  const enunciado = await raiz.locator('[data-enunciado]').textContent();
  const pregunta = banco.find((p) => p.enunciado === enunciado);
  if (!pregunta) throw new Error(`No se encontró en el banco la pregunta: ${enunciado}`);
  return pregunta;
}

export function idIncorrecta(pregunta: PreguntaCuestionario): string {
  const opcion = pregunta.opciones.find((o) => o.id !== pregunta.respuestaCorrecta);
  if (!opcion) throw new Error('La pregunta no tiene opciones incorrectas.');
  return opcion.id;
}

/** Posición (0–3) en pantalla de la opción con ese id. */
export async function posicionEnPantalla(contenedor: Locator, opcionId: string): Promise<number> {
  const ids = await contenedor.locator('[data-opcion]').evaluateAll((nodos) =>
    nodos.map((n) => (n as HTMLElement).dataset['opcion']),
  );
  return ids.indexOf(opcionId);
}

/** Comprueba que la página no tenga desplazamiento horizontal (nada se sale del ancho). */
export async function esperarSinDesbordeHorizontal(page: Page): Promise<void> {
  const { scroll, ancho } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    ancho: document.documentElement.clientWidth,
  }));
  expect(scroll, 'la página no debe desbordar horizontalmente').toBeLessThanOrEqual(ancho);
}
