import { describe, expect, it } from 'vitest';
import { MODELO_PREGUNTAS } from '@/lib/crear/modelo';
import { leerImportacion } from '@/lib/crear/importar';
import { bancoPreguntasSchema } from '@/lib/quiz/esquemas';

describe('modelo de JSON', () => {
  it('es un banco válido según el esquema del proyecto', () => {
    expect(bancoPreguntasSchema.safeParse(MODELO_PREGUNTAS).success).toBe(true);
  });

  it('muestra los dos casos: 4 opciones con material, y 2 opciones sin material ni explicación', () => {
    const [cuatro, dos] = MODELO_PREGUNTAS.preguntas;
    expect(cuatro?.opciones).toHaveLength(4);
    expect(cuatro?.material.length).toBeGreaterThan(0);
    expect(dos?.opciones).toHaveLength(2);
    expect(dos?.material).toEqual([]);
    expect(dos && 'explicacion' in dos).toBe(false);
  });
});

describe('leerImportacion', () => {
  const texto = JSON.stringify(MODELO_PREGUNTAS);

  it('acepta un banco completo o una lista de preguntas', () => {
    const desdeBanco = leerImportacion(texto, []);
    expect(desdeBanco.ok && desdeBanco.preguntas).toHaveLength(MODELO_PREGUNTAS.preguntas.length);
    const desdeLista = leerImportacion(JSON.stringify(MODELO_PREGUNTAS.preguntas), []);
    expect(desdeLista.ok).toBe(true);
  });

  it('rechaza un texto que no es JSON', () => {
    const resultado = leerImportacion('{no es json', []);
    expect(resultado).toEqual({ ok: false, errores: ['El archivo no es un JSON válido.'] });
  });

  it('dice en qué pregunta está el error', () => {
    const malo = { ...MODELO_PREGUNTAS.preguntas[0], opciones: [MODELO_PREGUNTAS.preguntas[0]?.opciones[0]] };
    const resultado = leerImportacion(JSON.stringify([malo]), []);
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.errores.some((e) => e.startsWith('Pregunta 1:'))).toBe(true);
  });

  it('no acepta ids repetidos, ni contra el banco ni dentro del archivo', () => {
    const contraBanco = leerImportacion(texto, ['u05-modelo-escalar']);
    expect(contraBanco.ok).toBe(false);
    const dentro = leerImportacion(JSON.stringify([MODELO_PREGUNTAS.preguntas[0], MODELO_PREGUNTAS.preguntas[0]]), []);
    expect(dentro.ok).toBe(false);
  });

  it('rechaza un archivo sin preguntas', () => {
    expect(leerImportacion('[]', []).ok).toBe(false);
    expect(leerImportacion('{"unidad":5}', []).ok).toBe(false);
  });
});
