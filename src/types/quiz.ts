/** Identificador de cada una de las cuatro opciones de una pregunta. */
export type OpcionId = 'a' | 'b' | 'c' | 'd';

export interface Opcion {
  id: OpcionId;
  texto: string;
  /** Por qué esta opción es correcta o incorrecta. */
  explicacion: string;
}

/** Referencia a un documento dentro de la carpeta `materialEstudio/`. */
export interface MaterialReferencia {
  titulo: string;
  /** Ruta relativa a `materialEstudio/`, p. ej. `unidad-05-subconsultas/subconsultas.html`. */
  ruta: string;
  /** `id` de la sección dentro del documento, p. ej. `escalares` (→ `subconsultas.html#escalares`). */
  seccion: string;
}

export interface Pregunta {
  id: string;
  tema: string;
  enunciado: string;
  /** Entre dos y cuatro opciones, con identificadores `a`, `b`, `c` y `d` (en ese orden). */
  opciones: Opcion[];
  respuestaCorrecta: OpcionId;
  /** Explicación general del concepto evaluado (opcional). */
  explicacion?: string | undefined;
  /** Resumen breve del concepto (opcional). */
  resumen?: string | undefined;
  material: MaterialReferencia[];
}

/** Banco de preguntas de una unidad (un archivo JSON por unidad). */
export interface BancoPreguntas {
  unidad: number;
  titulo: string;
  preguntas: Pregunta[];
}

/** Pregunta lista para usar en un cuestionario, con los datos de su unidad. */
export interface PreguntaCuestionario extends Pregunta {
  unidad: number;
  tituloUnidad: string;
}

export interface ResumenCuestionario {
  total: number;
  correctas: number;
  incorrectas: number;
  /** Porcentaje de respuestas correctas, redondeado a entero (0–100). */
  porcentaje: number;
}

export interface ResultadoRespuesta {
  esCorrecta: boolean;
  opcionSeleccionada: Opcion;
  opcionCorrecta: Opcion;
  explicacion?: string | undefined;
  material: MaterialReferencia[];
}
