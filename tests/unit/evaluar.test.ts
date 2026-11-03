import { describe, expect, it } from 'vitest';
import { evaluarRespuesta } from '@/lib/quiz/evaluar';
import { crearPregunta } from '../fixtures';

describe('evaluarRespuesta', () => {
  const pregunta = crearPregunta();

  it('marca como correcta la opción que coincide con la respuesta', () => {
    const resultado = evaluarRespuesta(pregunta, 'b');

    expect(resultado.esCorrecta).toBe(true);
    expect(resultado.opcionSeleccionada.id).toBe('b');
    expect(resultado.opcionCorrecta.id).toBe('b');
  });

  it('marca como incorrecta otra opción e informa cuál era la correcta', () => {
    const resultado = evaluarRespuesta(pregunta, 'c');

    expect(resultado.esCorrecta).toBe(false);
    expect(resultado.opcionSeleccionada.explicacion).toBe('Por qué C');
    expect(resultado.opcionCorrecta.id).toBe('b');
  });

  it('incluye la explicación general y el material de estudio', () => {
    const resultado = evaluarRespuesta(pregunta, 'a');

    expect(resultado.explicacion).toBe(pregunta.explicacion);
    expect(resultado.material).toEqual(pregunta.material);
  });
});
