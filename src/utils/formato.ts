/** Devuelve "1 pregunta" o "N preguntas" según la cantidad. */
export function pluralizar(cantidad: number, singular: string, plural: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : plural}`;
}

/** Formatea el número de unidad para mostrarlo en la interfaz: `5` → "Unidad 5". */
export function formatearUnidad(unidad: number): string {
  return `Unidad ${unidad}`;
}
