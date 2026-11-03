import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { bancoPreguntasSchema } from '@/lib/quiz/esquemas';

/**
 * Banco de preguntas: un archivo JSON por unidad en `src/content/preguntas/`.
 * Astro valida cada archivo contra el esquema durante `dev` y `build`.
 */
const preguntas = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/preguntas' }),
  schema: bancoPreguntasSchema,
});

export const collections = { preguntas };
