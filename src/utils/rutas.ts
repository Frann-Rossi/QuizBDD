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

/** Un documento PDF subido desde la PC (los HTML del material tienen secciones con id). */
export function esPdf(ruta: string): boolean {
  return ruta.toLowerCase().endsWith('.pdf');
}

/** `pagina-3` → 3; cualquier otra sección → null. */
export function numeroPagina(seccion: string): number | null {
  const coincidencia = /^pagina-(\d+)$/.exec(seccion);
  return coincidencia ? Number(coincidencia[1]) : null;
}

/**
 * URL pública de una sección del material de estudio, p. ej.
 * `/material/unidad-05-subconsultas/subconsultas.html#escalares`, o de una página de un PDF:
 * `/material/unidad-01-introduccion/guia.pdf#page=3`.
 */
export function urlMaterial(material: MaterialReferencia): string {
  const base = `/material/${material.ruta}`;
  if (esPdf(material.ruta)) {
    const pagina = numeroPagina(material.seccion);
    return pagina ? `${base}#page=${pagina}` : base;
  }
  return `${base}#${material.seccion}`;
}
