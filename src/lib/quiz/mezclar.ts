import type { Pregunta } from '@/types/quiz';

/** Función que devuelve un número en [0, 1), como `Math.random`. Inyectable para tests. */
export type Aleatorio = () => number;

/** Devuelve una copia mezclada del arreglo (algoritmo de Fisher-Yates). No modifica el original. */
export function mezclar<T>(items: readonly T[], aleatorio: Aleatorio = Math.random): T[] {
  const copia = [...items];
  for (let i = copia.length - 1; i > 0; i--) {
    intercambiar(copia, i, Math.floor(aleatorio() * (i + 1)));
  }
  return copia;
}

function intercambiar<T>(items: T[], i: number, j: number): void {
  const temporal = items[i] as T;
  items[i] = items[j] as T;
  items[j] = temporal;
}

/** Posición (0–3) en la que quedó la respuesta correcta. */
export function posicionCorrecta(pregunta: Pregunta): number {
  return pregunta.opciones.findIndex((opcion) => opcion.id === pregunta.respuestaCorrecta);
}

/**
 * Mezcla las opciones de una pregunta. Si se indica `evitarPosicion`, garantiza que la
 * respuesta correcta NO quede en esa posición, para que no se pueda memorizar el lugar.
 */
export function mezclarOpciones<P extends Pregunta>(
  pregunta: P,
  evitarPosicion?: number,
  aleatorio: Aleatorio = Math.random,
): P {
  const opciones = mezclar(pregunta.opciones, aleatorio);
  const actual = opciones.findIndex((opcion) => opcion.id === pregunta.respuestaCorrecta);

  if (evitarPosicion !== undefined && actual === evitarPosicion && opciones.length > 1) {
    // Mover la correcta a cualquiera de las otras posiciones, elegida al azar.
    const desplazamiento = 1 + Math.floor(aleatorio() * (opciones.length - 1));
    intercambiar(opciones, actual, (actual + desplazamiento) % opciones.length);
  }

  // mezclar conserva la longitud, así que el resultado sigue teniendo cuatro opciones.
  return { ...pregunta, opciones: opciones as Pregunta['opciones'] };
}
