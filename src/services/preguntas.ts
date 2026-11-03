import { getCollection } from 'astro:content';
import type { BancoPreguntas } from '@/types/quiz';

/** Devuelve todos los bancos de preguntas ordenados por número de unidad. */
export async function obtenerBancosPreguntas(): Promise<BancoPreguntas[]> {
  const entradas = await getCollection('preguntas');
  return entradas.map((entrada) => entrada.data).sort((a, b) => a.unidad - b.unidad);
}
