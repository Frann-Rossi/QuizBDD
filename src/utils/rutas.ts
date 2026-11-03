import type { MaterialReferencia } from '@/types/quiz';

/** Identificador de ruta del cuestionario con todas las unidades mezcladas. */
export const MODO_TODAS = 'todas';

/** `5` → `"unidad-5"`, usado en `/quiz/unidad-5`. */
export function modoUnidad(unidad: number): string {
  return `unidad-${unidad}`;
}

export function rutaCuestionario(modo: string): string {
  return `/quiz/${modo}/`;
}

/** URL pública de una sección del material de estudio, p. ej. `/material/unidad-05-subconsultas/subconsultas.html#escalares`. */
export function urlMaterial(material: MaterialReferencia): string {
  return `/material/${material.ruta}#${material.seccion}`;
}
