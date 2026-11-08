import { describe, expect, it } from 'vitest';
import { bancoPreguntasSchema, preguntaSchema } from '@/lib/quiz/esquemas';
import { crearPregunta } from '../fixtures';

describe('preguntaSchema', () => {
  it('acepta una pregunta válida', () => {
    expect(preguntaSchema.safeParse(crearPregunta()).success).toBe(true);
  });

  it('acepta preguntas de dos, tres o cuatro opciones', () => {
    const [a, b, c] = crearPregunta().opciones;
    expect(preguntaSchema.safeParse({ ...crearPregunta(), opciones: [a, b] }).success).toBe(true);
    expect(preguntaSchema.safeParse({ ...crearPregunta(), opciones: [a, b, c] }).success).toBe(true);
  });

  it('rechaza preguntas con una sola opción o con más de cuatro', () => {
    const [a, b, c, d] = crearPregunta().opciones;
    expect(preguntaSchema.safeParse({ ...crearPregunta(), opciones: [a] }).success).toBe(false);
    const quinta = { ...a, id: 'd', texto: 'Quinta' };
    expect(preguntaSchema.safeParse({ ...crearPregunta(), opciones: [a, b, c, d, quinta] }).success).toBe(false);
  });

  it('rechaza una respuesta correcta que no está entre las opciones', () => {
    const [a, b] = crearPregunta().opciones;
    expect(preguntaSchema.safeParse({ ...crearPregunta(), opciones: [a, b], respuestaCorrecta: 'd' }).success).toBe(false);
  });

  it('rechaza opciones con identificadores repetidos', () => {
    const [a, b, c] = crearPregunta().opciones;
    const opciones = [a, b, c, { ...c, texto: 'Repetida' }];
    expect(preguntaSchema.safeParse({ ...crearPregunta(), opciones }).success).toBe(false);
  });

  it('acepta preguntas sin material de estudio ni explicación general', () => {
    const pregunta = crearPregunta({ material: [] });
    const { explicacion: _sinExplicacion, ...sinExplicacion } = pregunta;
    expect(preguntaSchema.safeParse(pregunta).success).toBe(true);
    expect(preguntaSchema.safeParse(sinExplicacion).success).toBe(true);
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
