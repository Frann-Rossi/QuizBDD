import { preguntaSchema } from '@/lib/quiz/esquemas';
import type { Pregunta } from '@/types/quiz';

export type ResultadoImportacion = { ok: true; preguntas: Pregunta[] } | { ok: false; errores: string[] };

/**
 * Lee un JSON con preguntas (una lista, o un banco con la propiedad `preguntas`) y valida cada una
 * con el esquema del banco. Los errores dicen en qué pregunta están.
 * @param idsExistentes ids ya usados en el banco, para no repetirlos.
 */
export function leerImportacion(texto: string, idsExistentes: readonly string[]): ResultadoImportacion {
  let datos: unknown;
  try {
    datos = JSON.parse(texto);
  } catch {
    return { ok: false, errores: ['El archivo no es un JSON válido.'] };
  }

  const lista = Array.isArray(datos)
    ? datos
    : typeof datos === 'object' && datos !== null && Array.isArray((datos as { preguntas?: unknown }).preguntas)
      ? (datos as { preguntas: unknown[] }).preguntas
      : null;
  if (!lista) return { ok: false, errores: ['El JSON debe tener una lista "preguntas" (o ser una lista de preguntas).'] };
  if (lista.length === 0) return { ok: false, errores: ['No hay preguntas para importar.'] };

  const errores: string[] = [];
  const preguntas: Pregunta[] = [];
  const ids = new Set(idsExistentes);
  lista.forEach((crudo, indice) => {
    const numero = indice + 1;
    const resultado = preguntaSchema.safeParse(crudo);
    if (!resultado.success) {
      for (const issue of resultado.error.issues) {
        errores.push(`Pregunta ${numero}: ${issue.path.join('.') || 'pregunta'}: ${issue.message}`);
      }
      return;
    }
    const pregunta = resultado.data as Pregunta;
    if (ids.has(pregunta.id)) {
      errores.push(`Pregunta ${numero}: el id "${pregunta.id}" ya existe en el banco o en el archivo.`);
      return;
    }
    ids.add(pregunta.id);
    preguntas.push(pregunta);
  });

  return errores.length > 0 ? { ok: false, errores } : { ok: true, preguntas };
}
