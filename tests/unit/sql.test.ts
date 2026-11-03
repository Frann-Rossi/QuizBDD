import { describe, expect, it } from 'vitest';
import { tokenizarSql } from '@/utils/sql';

describe('tokenizarSql', () => {
  it('reconoce palabras clave, funciones, cadenas y números', () => {
    expect(tokenizarSql("SELECT AVG(precio) FROM productos WHERE categoria = 'Libreria' AND precio > 20000")).toEqual([
      { tipo: 'clave', texto: 'SELECT' },
      { tipo: 'texto', texto: ' ' },
      { tipo: 'funcion', texto: 'AVG' },
      { tipo: 'texto', texto: '(precio) ' },
      { tipo: 'clave', texto: 'FROM' },
      { tipo: 'texto', texto: ' productos ' },
      { tipo: 'clave', texto: 'WHERE' },
      { tipo: 'texto', texto: ' categoria = ' },
      { tipo: 'cadena', texto: "'Libreria'" },
      { tipo: 'texto', texto: ' ' },
      { tipo: 'clave', texto: 'AND' },
      { tipo: 'texto', texto: ' precio > ' },
      { tipo: 'numero', texto: '20000' },
    ]);
  });

  it('no resalta palabras en minúscula ni siglas que no son SQL', () => {
    expect(tokenizarSql('Las vistas no guardan datos, según la UTN.')).toEqual([
      { tipo: 'texto', texto: 'Las vistas no guardan datos, según la UTN.' },
    ]);
  });

  it('no parte identificadores con números como u05', () => {
    expect(tokenizarSql('id u05')).toEqual([{ tipo: 'texto', texto: 'id u05' }]);
  });

  it('conserva el texto original al unir los tokens', () => {
    const texto = 'WITH RECURSIVE numeros AS (SELECT 1 AS n UNION ALL SELECT n + 1 FROM numeros WHERE n < 4)';
    expect(tokenizarSql(texto).map((t) => t.texto).join('')).toBe(texto);
  });

  it('devuelve vacío para texto vacío', () => {
    expect(tokenizarSql('')).toEqual([]);
  });
});
