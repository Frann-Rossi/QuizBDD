import type { OpcionId, Pregunta, ResultadoRespuesta } from '@/types/quiz';

/**
 * Evalúa la opción elegida para una pregunta y devuelve la información
 * necesaria para mostrar la retroalimentación al estudiante.
 */
export function evaluarRespuesta(pregunta: Pregunta, opcionElegida: OpcionId): ResultadoRespuesta {
  const opcionSeleccionada = pregunta.opciones.find((o) => o.id === opcionElegida);
  const opcionCorrecta = pregunta.opciones.find((o) => o.id === pregunta.respuestaCorrecta);

  if (!opcionSeleccionada || !opcionCorrecta) {
    throw new Error(`La pregunta "${pregunta.id}" no contiene la opción "${opcionElegida}".`);
  }

  return {
    esCorrecta: opcionSeleccionada.id === opcionCorrecta.id,
    opcionSeleccionada,
    opcionCorrecta,
    explicacion: pregunta.explicacion,
    material: pregunta.material,
  };
}
