/**
 * Serializa datos para incrustarlos en `<script type="application/json">`.
 * Se escapa "<" para que ningún texto pueda cerrar la etiqueta `<script>`.
 */
export function serializarParaScript(datos: unknown): string {
  return JSON.stringify(datos).replaceAll('<', '\\u003c');
}
