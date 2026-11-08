import type { BancoPreguntas } from '@/types/quiz';

/**
 * Modelo de JSON para cargar preguntas. Quien arme preguntas a partir de un PDF puede tomar este
 * formato, completarlo y subirlo en Crear → «Importar preguntas desde un JSON».
 *
 * Reglas (las mismas que valida el banco):
 * - De 2 a 4 opciones, con ids a, b, c, d (en ese orden) y una respuestaCorrecta que sea una de ellas.
 * - La explicación general, el resumen y el material son opcionales. El material puede ser
 *   un HTML del material (con `seccion` = id de una sección) o un PDF (con `seccion` = "pagina-N").
 * - Los ids de pregunta son únicos en todo el banco (p. ej. u05-tema-corto).
 */
export const MODELO_PREGUNTAS: BancoPreguntas = {
  unidad: 5,
  titulo: 'Subconsultas',
  preguntas: [
    {
      id: 'u05-modelo-escalar',
      tema: 'Subconsulta escalar',
      enunciado: '¿Qué devuelve una subconsulta escalar?',
      opciones: [
        { id: 'a', texto: 'Una fila con varias columnas.', explicacion: 'Eso describe una subconsulta de fila, no una escalar.' },
        { id: 'b', texto: 'Un único valor.', explicacion: 'Correcto: devuelve una fila y una columna, es decir, un solo valor.' },
        { id: 'c', texto: 'Una tabla temporal.', explicacion: 'Una subconsulta no crea tablas; su resultado solo se usa dentro de la sentencia.' },
        { id: 'd', texto: 'Una lista de valores.', explicacion: 'Una lista de valores corresponde a una subconsulta de lista.' },
      ],
      respuestaCorrecta: 'b',
      explicacion: 'Una subconsulta escalar devuelve exactamente un valor y puede usarse donde va un valor simple.',
      resumen: 'Escalar = un solo valor.',
      material: [
        {
          titulo: 'Unidad 5 · Subconsultas escalares',
          ruta: 'unidad-05-subconsultas/subconsultas.html',
          seccion: 'escalares',
        },
      ],
    },
    {
      id: 'u05-modelo-verdadero',
      tema: 'Verdadero o falso',
      enunciado: 'Una subconsulta puede usarse dentro de una cláusula WHERE.',
      opciones: [
        { id: 'a', texto: 'Verdadero', explicacion: 'Correcto: las subconsultas pueden ubicarse en WHERE.' },
        { id: 'b', texto: 'Falso', explicacion: 'Es falso: WHERE es una de las cláusulas donde se usan.' },
      ],
      respuestaCorrecta: 'a',
      material: [],
    },
  ],
};
