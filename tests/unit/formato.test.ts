import { describe, expect, it } from 'vitest';
import { formatearUnidad, pluralizar } from '@/utils/formato';

describe('pluralizar', () => {
  it('usa el singular cuando la cantidad es 1', () => {
    expect(pluralizar(1, 'pregunta', 'preguntas')).toBe('1 pregunta');
  });

  it('usa el plural para 0 y para cantidades mayores a 1', () => {
    expect(pluralizar(0, 'pregunta', 'preguntas')).toBe('0 preguntas');
    expect(pluralizar(3, 'pregunta', 'preguntas')).toBe('3 preguntas');
  });
});

describe('formatearUnidad', () => {
  it('antepone la palabra "Unidad" al número', () => {
    expect(formatearUnidad(5)).toBe('Unidad 5');
  });
});
