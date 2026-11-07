import { describe, expect, it } from 'vitest';
import {
  busquedaUnidades,
  etiquetaUnidades,
  filtrarPorUnidades,
  unidadesDesdeBusqueda,
} from '@/lib/quiz/seleccion';
import type { PreguntaCuestionario } from '@/types/quiz';

const pregunta = (id: string, unidad: number): PreguntaCuestionario => ({
  id,
  tema: 't',
  enunciado: 'e',
  opciones: [
    { id: 'a', texto: 'x', explicacion: 'x' },
    { id: 'b', texto: 'x', explicacion: 'x' },
    { id: 'c', texto: 'x', explicacion: 'x' },
    { id: 'd', texto: 'x', explicacion: 'x' },
  ],
  respuestaCorrecta: 'a',
  explicacion: 'x',
  material: [{ titulo: 'x', ruta: 'x.html', seccion: 'x' }],
  unidad,
  tituloUnidad: `Unidad ${unidad}`,
});

describe('unidadesDesdeBusqueda', () => {
  it('lee las unidades repetidas en la URL, ordenadas y sin duplicados', () => {
    expect(unidadesDesdeBusqueda('?unidades=3&unidades=1&unidades=3')).toEqual([1, 3]);
  });

  it('devuelve null cuando no hay selección o no tiene unidades válidas', () => {
    expect(unidadesDesdeBusqueda('')).toBeNull();
    expect(unidadesDesdeBusqueda('?otro=2')).toBeNull();
    expect(unidadesDesdeBusqueda('?unidades=abc&unidades=-1&unidades=0')).toBeNull();
  });

  it('ignora los valores no válidos y conserva los demás', () => {
    expect(unidadesDesdeBusqueda('?unidades=2&unidades=x&unidades=4.5')).toEqual([2]);
  });
});

describe('filtrarPorUnidades', () => {
  const banco = [pregunta('p1', 1), pregunta('p2', 2), pregunta('p3', 3), pregunta('p4', 2)];

  it('conserva solo las preguntas de las unidades elegidas, en su orden', () => {
    expect(filtrarPorUnidades(banco, [2, 3]).map((p) => p.id)).toEqual(['p2', 'p3', 'p4']);
  });

  it('devuelve vacío si ninguna pregunta pertenece a las unidades', () => {
    expect(filtrarPorUnidades(banco, [9])).toEqual([]);
  });
});

describe('etiquetaUnidades', () => {
  it('describe una, dos o más unidades', () => {
    expect(etiquetaUnidades([2])).toBe('Unidad 2');
    expect(etiquetaUnidades([2, 3])).toBe('Unidades 2 y 3');
    expect(etiquetaUnidades([1, 3, 4])).toBe('Unidades 1, 3 y 4');
  });
});

describe('busquedaUnidades', () => {
  it('arma la búsqueda que luego lee unidadesDesdeBusqueda', () => {
    const busqueda = busquedaUnidades([1, 3, 4]);
    expect(busqueda).toBe('?unidades=1&unidades=3&unidades=4');
    expect(unidadesDesdeBusqueda(busqueda)).toEqual([1, 3, 4]);
  });
});
