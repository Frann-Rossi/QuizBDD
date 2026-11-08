import { z } from 'astro/zod';
import type { BancoPreguntas, MaterialReferencia, Opcion, Pregunta } from '@/types/quiz';

const OPCION_IDS = ['a', 'b', 'c', 'd'] as const;

const textoRequerido = z.string().trim().min(1);

const opcionSchema = z.object({
  id: z.enum(OPCION_IDS),
  texto: textoRequerido,
  explicacion: textoRequerido,
}) satisfies z.ZodType<Opcion>;

const materialSchema = z
  .object({
    titulo: textoRequerido,
    ruta: textoRequerido,
    seccion: z.string().regex(/^[a-z0-9-]+$/, 'La sección debe ser un id HTML en minúsculas.'),
  })
  // Sin imports del proyecto: este esquema también lo carga el servidor de autoría (ver autoria/servidor.mjs).
  .refine((material) => !/\.pdf$/i.test(material.ruta) || /^pagina-\d+$/.test(material.seccion), {
    message: 'Para un PDF, la sección debe ser una página con el formato "pagina-N".',
    path: ['seccion'],
  }) satisfies z.ZodType<MaterialReferencia>;

export const preguntaSchema = z
  .object({
    id: textoRequerido,
    tema: textoRequerido,
    enunciado: textoRequerido,
    opciones: z.array(opcionSchema).min(2).max(4),
    respuestaCorrecta: z.enum(OPCION_IDS),
    /** Explicación general opcional. */
    explicacion: textoRequerido.optional(),
    /** Resumen opcional del concepto; no es obligatorio en el banco. */
    resumen: textoRequerido.optional(),
    /** Material opcional: una pregunta puede no tener referencias. */
    material: z.array(materialSchema),
  })
  .refine((pregunta) => new Set(pregunta.opciones.map((o) => o.id)).size === pregunta.opciones.length, {
    message: 'Las opciones deben tener identificadores distintos.',
    path: ['opciones'],
  })
  .refine((pregunta) => pregunta.opciones.some((o) => o.id === pregunta.respuestaCorrecta), {
    message: 'La respuesta correcta debe ser una de las opciones.',
    path: ['respuestaCorrecta'],
  }) satisfies z.ZodType<Pregunta>;

export const bancoPreguntasSchema = z
  .object({
    unidad: z.number().int().positive(),
    titulo: textoRequerido,
    preguntas: z.array(preguntaSchema).min(1),
  })
  .refine((banco) => new Set(banco.preguntas.map((p) => p.id)).size === banco.preguntas.length, {
    message: 'Los identificadores de las preguntas deben ser únicos dentro del banco.',
    path: ['preguntas'],
  }) satisfies z.ZodType<BancoPreguntas>;
