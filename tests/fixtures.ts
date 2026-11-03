import type { Pregunta } from '@/types/quiz';

/** Pregunta válida de referencia para los tests. */
export function crearPregunta(cambios: Partial<Pregunta> = {}): Pregunta {
  return {
    id: 'test-pregunta',
    tema: 'Tema de prueba',
    enunciado: '¿Cuál es la opción correcta?',
    opciones: [
      { id: 'a', texto: 'Opción A', explicacion: 'Por qué A' },
      { id: 'b', texto: 'Opción B', explicacion: 'Por qué B' },
      { id: 'c', texto: 'Opción C', explicacion: 'Por qué C' },
      { id: 'd', texto: 'Opción D', explicacion: 'Por qué D' },
    ],
    respuestaCorrecta: 'b',
    explicacion: 'Explicación general',
    material: [{ titulo: 'Material', ruta: 'unidad-00/material.html', seccion: 'intro' }],
    ...cambios,
  };
}
