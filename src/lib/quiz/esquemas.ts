import { z } from 'astro/zod';
import type { BancoPreguntas, MaterialReferencia, Opcion, Pregunta } from '@/types/quiz';

const OPCION_IDS = ['a', 'b', 'c', 'd'] as const;

const textoRequerido = z.string().trim().min(1);

const opcionSchema = z.object({
  id: z.enum(OPCION_IDS),
  texto: textoRequerido,
  explicacion: textoRequerido,
}) satisfies z.ZodType<Opcion>;

const materialSchema = z.object({
  titulo: textoRequerido,
  ruta: textoRequerido,
  seccion: z.string().regex(/^[a-z0-9-]+$/, 'La sección debe ser un id HTML en minúsculas.'),
}) satisfies z.ZodType<MaterialReferencia>;

export const preguntaSchema = z
  .object({
    id: textoRequerido,
    tema: textoRequerido,
    enunciado: textoRequerido,
    opciones: z.tuple([opcionSchema, opcionSchema, opcionSchema, opcionSchema]),
    respuestaCorrecta: z.enum(OPCION_IDS),
    explicacion: textoRequerido,
    /** Resumen opcional del concepto; no es obligatorio en el banco. */
    resumen: textoRequerido.optional(),
    material: z.array(materialSchema).min(1),
  })
  .refine((pregunta) => new Set(pregunta.opciones.map((o) => o.id)).size === OPCION_IDS.length, {
    message: 'Las cuatro opciones deben tener identificadores distintos (a, b, c, d).',
    path: ['opciones'],
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
