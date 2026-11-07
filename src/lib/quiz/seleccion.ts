import type { PreguntaCuestionario } from '@/types/quiz';

/** Nombre del parámetro de la URL con las unidades elegidas: `?unidades=2&unidades=3`. */
export const PARAMETRO_UNIDADES = 'unidades';

/**
 * Lee las unidades elegidas desde una cadena de búsqueda de la URL.
 * Devuelve null si no hay ninguna unidad válida (en ese caso se usa el banco completo).
 */
export function unidadesDesdeBusqueda(busqueda: string): number[] | null {
  const valores = new URLSearchParams(busqueda).getAll(PARAMETRO_UNIDADES);
  const unidades = [...new Set(valores.map(Number))]
    .filter((n) => Number.isInteger(n) && n > 0)
    .sort((a, b) => a - b);
  return unidades.length > 0 ? unidades : null;
}

/** Conserva solo las preguntas de las unidades indicadas, sin cambiar el orden original. */
export function filtrarPorUnidades(
  preguntas: readonly PreguntaCuestionario[],
  unidades: readonly number[],
): PreguntaCuestionario[] {
  const elegidas = new Set(unidades);
  return preguntas.filter((pregunta) => elegidas.has(pregunta.unidad));
}

/** Título legible de la selección: "Unidad 2", "Unidades 2 y 3", "Unidades 1, 3 y 4". */
export function etiquetaUnidades(unidades: readonly number[]): string {
  if (unidades.length === 1) return `Unidad ${unidades[0]}`;
  const ultima = unidades[unidades.length - 1];
  const anteriores = unidades.slice(0, -1);
  return `Unidades ${anteriores.join(', ')} y ${ultima}`;
}

/** Cadena de búsqueda para una selección, p. ej. `?unidades=2&unidades=3`. */
export function busquedaUnidades(unidades: readonly number[]): string {
  const parametros = new URLSearchParams();
  for (const unidad of unidades) parametros.append(PARAMETRO_UNIDADES, String(unidad));
  return `?${parametros.toString()}`;
}
