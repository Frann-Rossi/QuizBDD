/**
 * Tokenizador mínimo para resaltar SQL dentro de los textos de las preguntas.
 * Solo reconoce palabras clave en MAYÚSCULAS, para no confundirlas con texto en castellano.
 */
export type TipoToken = 'texto' | 'clave' | 'funcion' | 'cadena' | 'numero';

export interface TokenSql {
  tipo: TipoToken;
  texto: string;
}

const PALABRAS_CLAVE = new Set([
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'ANY', 'SOME', 'ALL', 'AS', 'WITH',
  'RECURSIVE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'ON', 'GROUP', 'BY', 'ORDER', 'HAVING', 'DISTINCT',
  'UNION', 'CREATE', 'REPLACE', 'VIEW', 'ALTER', 'DROP', 'IF', 'TABLE', 'INSERT', 'INTO', 'UPDATE',
  'SET', 'DELETE', 'CHECK', 'OPTION', 'DESC', 'ASC', 'NULL', 'LIMIT', 'SHOW', 'VALUES', 'DATABASE',
  'LOCAL', 'CASCADED', 'IS',
]);

const FUNCIONES = new Set(['COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'COALESCE', 'ROUND']);

const PATRON = /('[^']*')|\b(\d+(?:\.\d+)?)\b|\b([A-Z_]{2,})\b/g;

export function tokenizarSql(texto: string): TokenSql[] {
  const tokens: TokenSql[] = [];
  const agregar = (tipo: TipoToken, valor: string): void => {
    if (!valor) return;
    const ultimo = tokens.at(-1);
    if (tipo === 'texto' && ultimo?.tipo === 'texto') ultimo.texto += valor;
    else tokens.push({ tipo, texto: valor });
  };

  let posicion = 0;
  for (const coincidencia of texto.matchAll(PATRON)) {
    const [completo, cadena, numero, palabra] = coincidencia;
    const inicio = coincidencia.index;
    agregar('texto', texto.slice(posicion, inicio));

    if (cadena) agregar('cadena', cadena);
    else if (numero) agregar('numero', numero);
    else if (palabra && PALABRAS_CLAVE.has(palabra)) agregar('clave', palabra);
    else if (palabra && FUNCIONES.has(palabra)) agregar('funcion', palabra);
    else agregar('texto', completo);

    posicion = inicio + completo.length;
  }
  agregar('texto', texto.slice(posicion));
  return tokens;
}
