import type {
  BancoPreguntas,
  Pregunta,
  PreguntaCuestionario,
  ResultadoRespuesta,
  ResumenCuestionario,
} from '@/types/quiz';
import { mezclar, mezclarOpciones, type Aleatorio } from './mezclar';

/** Convierte un banco de una unidad en preguntas que conocen su unidad de origen. */
export function aPreguntasCuestionario(banco: BancoPreguntas): PreguntaCuestionario[] {
  return banco.preguntas.map((pregunta) => ({
    ...pregunta,
    unidad: banco.unidad,
    tituloUnidad: banco.titulo,
  }));
}

/**
 * Mezcla el orden de las preguntas y el de las opciones de cada una. No modifica el original.
 * @param posicionesPrevias id de pregunta → posición donde estuvo la respuesta correcta la última
 *   vez; la correcta no se repetirá en ese lugar.
 */
export function prepararCuestionario<P extends Pregunta>(
  preguntas: readonly P[],
  aleatorio: Aleatorio = Math.random,
  posicionesPrevias: ReadonlyMap<string, number> = new Map(),
): P[] {
  return mezclar(preguntas, aleatorio).map((pregunta) =>
    mezclarOpciones(pregunta, posicionesPrevias.get(pregunta.id), aleatorio),
  );
}

export function resumirResultados(resultados: readonly ResultadoRespuesta[]): ResumenCuestionario {
  const total = resultados.length;
  const correctas = resultados.filter((r) => r.esCorrecta).length;
  return {
    total,
    correctas,
    incorrectas: total - correctas,
    porcentaje: total === 0 ? 0 : Math.round((correctas / total) * 100),
  };
}
