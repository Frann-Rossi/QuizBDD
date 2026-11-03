import { describe, expect, it } from 'vitest';
import { aPreguntasCuestionario, prepararCuestionario, resumirResultados } from '@/lib/quiz/cuestionario';
import { evaluarRespuesta } from '@/lib/quiz/evaluar';
import { mezclar, mezclarOpciones, posicionCorrecta } from '@/lib/quiz/mezclar';
import { crearPregunta } from '../fixtures';

/** Generador pseudoaleatorio determinista para tests reproducibles. */
function aleatorioConSemilla(semilla: number): () => number {
  let estado = semilla;
  return () => {
    estado = (estado * 1103515245 + 12345) % 2 ** 31;
    return estado / 2 ** 31;
  };
}

describe('mezclar', () => {
  it('conserva los mismos elementos y no modifica el original', () => {
    const original = [1, 2, 3, 4, 5, 6];
    const resultado = mezclar(original, aleatorioConSemilla(7));

    expect(original).toEqual([1, 2, 3, 4, 5, 6]);
    expect([...resultado].sort()).toEqual(original);
  });

  it('produce el orden esperado de Fisher-Yates para un generador conocido', () => {
    // Con aleatorio() = 0 cada paso intercambia la posición i con la 0.
    expect(mezclar([1, 2, 3, 4], () => 0)).toEqual([2, 3, 4, 1]);
  });

  it('puede producir órdenes distintos con distintas semillas', () => {
    const items = Array.from({ length: 10 }, (_, i) => i);
    expect(mezclar(items, aleatorioConSemilla(1))).not.toEqual(mezclar(items, aleatorioConSemilla(2)));
  });
});

describe('mezclarOpciones', () => {
  const pregunta = crearPregunta(); // correcta: 'b'

  it('nunca deja la respuesta correcta en la posición a evitar', () => {
    for (let semilla = 1; semilla <= 200; semilla++) {
      for (let evitar = 0; evitar < 4; evitar++) {
        const resultado = mezclarOpciones(pregunta, evitar, aleatorioConSemilla(semilla));
        expect(posicionCorrecta(resultado)).not.toBe(evitar);
        expect(resultado.opciones.map((o) => o.id).sort()).toEqual(['a', 'b', 'c', 'd']);
      }
    }
  });

  it('reparte la respuesta correcta en las cuatro posiciones', () => {
    const posiciones = new Set<number>();
    const aleatorio = aleatorioConSemilla(11);
    for (let i = 0; i < 100; i++) posiciones.add(posicionCorrecta(mezclarOpciones(pregunta, undefined, aleatorio)));
    expect([...posiciones].sort()).toEqual([0, 1, 2, 3]);
  });

  it('cambia de lugar la correcta en intentos sucesivos', () => {
    const aleatorio = aleatorioConSemilla(4);
    let anterior = posicionCorrecta(mezclarOpciones(pregunta, undefined, aleatorio));
    for (let intento = 0; intento < 50; intento++) {
      const actual = posicionCorrecta(mezclarOpciones(pregunta, anterior, aleatorio));
      expect(actual).not.toBe(anterior);
      anterior = actual;
    }
  });
});

describe('aPreguntasCuestionario', () => {
  it('agrega a cada pregunta el número y el título de su unidad', () => {
    const banco = { unidad: 6, titulo: 'CTE', preguntas: [crearPregunta()] };
    const [pregunta] = aPreguntasCuestionario(banco);

    expect(pregunta?.unidad).toBe(6);
    expect(pregunta?.tituloUnidad).toBe('CTE');
    expect(pregunta?.id).toBe('test-pregunta');
  });
});

describe('prepararCuestionario', () => {
  const preguntas = ['p1', 'p2', 'p3', 'p4', 'p5'].map((id) => crearPregunta({ id }));

  it('incluye todas las preguntas exactamente una vez', () => {
    const resultado = prepararCuestionario(preguntas, aleatorioConSemilla(3));
    expect(resultado.map((p) => p.id).sort()).toEqual(['p1', 'p2', 'p3', 'p4', 'p5']);
  });

  it('mantiene las cuatro opciones y la respuesta correcta de cada pregunta', () => {
    for (const pregunta of prepararCuestionario(preguntas, aleatorioConSemilla(5))) {
      expect(pregunta.opciones.map((o) => o.id).sort()).toEqual(['a', 'b', 'c', 'd']);
      expect(pregunta.respuestaCorrecta).toBe('b');
      expect(evaluarRespuesta(pregunta, 'b').esCorrecta).toBe(true);
    }
  });

  it('respeta las posiciones previas para no repetir el lugar de la correcta', () => {
    const previas = new Map(preguntas.map((p) => [p.id, 2]));
    for (const pregunta of prepararCuestionario(preguntas, aleatorioConSemilla(8), previas)) {
      expect(posicionCorrecta(pregunta)).not.toBe(2);
    }
  });

  it('no modifica las preguntas originales', () => {
    prepararCuestionario(preguntas, aleatorioConSemilla(9));
    expect(preguntas.map((p) => p.id)).toEqual(['p1', 'p2', 'p3', 'p4', 'p5']);
    expect(preguntas[0]?.opciones.map((o) => o.id)).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('resumirResultados', () => {
  const pregunta = crearPregunta();

  it('cuenta correctas e incorrectas y calcula el porcentaje redondeado', () => {
    const resultados = [
      evaluarRespuesta(pregunta, 'b'),
      evaluarRespuesta(pregunta, 'a'),
      evaluarRespuesta(pregunta, 'b'),
    ];

    expect(resumirResultados(resultados)).toEqual({ total: 3, correctas: 2, incorrectas: 1, porcentaje: 67 });
  });

  it('devuelve 0 % cuando no hay respuestas', () => {
    expect(resumirResultados([])).toEqual({ total: 0, correctas: 0, incorrectas: 0, porcentaje: 0 });
  });
});
