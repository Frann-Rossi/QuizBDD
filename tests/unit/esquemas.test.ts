import { describe, expect, it } from 'vitest';
import { bancoPreguntasSchema, preguntaSchema } from '@/lib/quiz/esquemas';
import { crearPregunta } from '../fixtures';

describe('preguntaSchema', () => {
  it('acepta una pregunta válida', () => {
    expect(preguntaSchema.safeParse(crearPregunta()).success).toBe(true);
  });

  it('rechaza preguntas que no tienen exactamente cuatro opciones', () => {
    const [a, b, c] = crearPregunta().opciones;
    expect(preguntaSchema.safeParse({ ...crearPregunta(), opciones: [a, b, c] }).success).toBe(false);
  });

  it('rechaza opciones con identificadores repetidos', () => {
    const [a, b, c] = crearPregunta().opciones;
    const opciones = [a, b, c, { ...c, texto: 'Repetida' }];
    expect(preguntaSchema.safeParse({ ...crearPregunta(), opciones }).success).toBe(false);
  });

  it('rechaza preguntas sin material de estudio', () => {
    expect(preguntaSchema.safeParse(crearPregunta({ material: [] })).success).toBe(false);
  });

  it('rechaza textos vacíos', () => {
    expect(preguntaSchema.safeParse(crearPregunta({ enunciado: '   ' })).success).toBe(false);
  });
});

describe('bancoPreguntasSchema', () => {
  it('rechaza preguntas con identificadores repetidos dentro del banco', () => {
    const banco = { unidad: 1, titulo: 'Unidad', preguntas: [crearPregunta(), crearPregunta()] };
    expect(bancoPreguntasSchema.safeParse(banco).success).toBe(false);
  });
});
