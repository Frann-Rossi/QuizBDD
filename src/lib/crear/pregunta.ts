import { preguntaSchema } from '@/lib/quiz/esquemas';
import type { BancoPreguntas, MaterialReferencia, OpcionId, Pregunta } from '@/types/quiz';

/** Lo que el formulario entrega tal cual lo escribió la persona. */
export interface DatosFormulario {
  id: string;
  tema: string;
  enunciado: string;
  /** Exactamente cuatro, en el orden a, b, c, d. */
  opciones: { texto: string; explicacion: string }[];
  respuestaCorrecta: OpcionId | '';
  explicacion: string;
  resumen: string;
  material: MaterialReferencia[];
}

export type ResultadoConstruccion = { ok: true; pregunta: Pregunta } | { ok: false; errores: string[] };

const OPCION_IDS: readonly OpcionId[] = ['a', 'b', 'c', 'd'];
const PATRON_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Convierte los datos del formulario en una `Pregunta` válida.
 * Los mensajes de error están en español y pensados para quien carga la pregunta.
 * @param idsExistentes identificadores ya usados en el banco, para evitar duplicados.
 */
export function construirPregunta(datos: DatosFormulario, idsExistentes: readonly string[] = []): ResultadoConstruccion {
  const errores: string[] = [];
  const id = datos.id.trim();

  if (!id) errores.push('Falta el identificador de la pregunta.');
  else if (!PATRON_ID.test(id)) errores.push('El identificador solo puede tener minúsculas, números y guiones (ej.: u05-nueva-pregunta).');
  else if (idsExistentes.includes(id)) errores.push(`Ya existe una pregunta con el identificador "${id}".`);

  if (!datos.tema.trim()) errores.push('Falta el tema.');
  if (!datos.enunciado.trim()) errores.push('Falta el enunciado.');

  datos.opciones.forEach((opcion, indice) => {
    const letra = (OPCION_IDS[indice] ?? '').toUpperCase();
    if (!opcion.texto.trim()) errores.push(`Falta el texto de la opción ${letra}.`);
    if (!opcion.explicacion.trim()) errores.push(`Falta la explicación de la opción ${letra}.`);
  });

  if (!datos.respuestaCorrecta) errores.push('Elegí cuál es la respuesta correcta.');
  if (!datos.explicacion.trim()) errores.push('Falta la explicación general.');
  if (datos.material.length === 0) errores.push('Agregá al menos un material de estudio.');

  if (errores.length > 0) return { ok: false, errores };

  const resumen = datos.resumen.trim();
  const candidata = {
    id,
    tema: datos.tema.trim(),
    enunciado: datos.enunciado.trim(),
    opciones: datos.opciones.map((opcion, indice) => ({
      id: OPCION_IDS[indice],
      texto: opcion.texto.trim(),
      explicacion: opcion.explicacion.trim(),
    })),
    respuestaCorrecta: datos.respuestaCorrecta,
    explicacion: datos.explicacion.trim(),
    ...(resumen ? { resumen } : {}),
    material: datos.material,
  };

  // Red de seguridad: el mismo esquema que valida el banco al compilar.
  const resultado = preguntaSchema.safeParse(candidata);
  if (!resultado.success) {
    return {
      ok: false,
      errores: resultado.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    };
  }
  return { ok: true, pregunta: resultado.data as Pregunta };
}

/** Devuelve un banco nuevo con la pregunta al final. No modifica el original. */
export function agregarPregunta(banco: BancoPreguntas, pregunta: Pregunta): BancoPreguntas {
  return { ...banco, preguntas: [...banco.preguntas, pregunta] };
}

/** Texto del archivo JSON con el mismo formato que los del banco (sangría de 2 espacios). */
export function aArchivoJson(banco: BancoPreguntas): string {
  return `${JSON.stringify(banco, null, 2)}\n`;
}

/** Nombre de archivo que el proyecto usa para cada unidad, p. ej. `unidad-05-subconsultas.json`. */
export function nombreArchivoUnidad(unidad: number, slug: string): string {
  return `unidad-${String(unidad).padStart(2, '0')}-${slug}.json`;
}

/** Genera un identificador sugerido a partir de la unidad y el tema, p. ej. `u05-tabla-derivada`. */
export function sugerirId(unidad: number, tema: string): string {
  const slug = tema
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  return slug ? `u${String(unidad).padStart(2, '0')}-${slug}` : '';
}
