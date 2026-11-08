import { describe, expect, it } from 'vitest';
import {
  agregarPregunta,
  aArchivoJson,
  construirPregunta,
  nombreArchivoUnidad,
  quitarPregunta,
  reemplazarPregunta,
  sugerirId,
  type DatosFormulario,
} from '@/lib/crear/pregunta';
import { extraerSecciones } from '@/services/material';
import type { BancoPreguntas } from '@/types/quiz';

const datosValidos = (): DatosFormulario => ({
  id: 'u05-escalar-nueva',
  tema: 'Subconsulta escalar',
  enunciado: '¿Qué devuelve una subconsulta escalar?',
  opciones: [
    { texto: 'Una fila', explicacion: 'No.' },
    { texto: 'Un único valor', explicacion: 'Correcto.' },
    { texto: 'Una tabla', explicacion: 'No.' },
    { texto: 'Nada', explicacion: 'No.' },
  ],
  respuestaCorrecta: 'b',
  explicacion: 'Devuelve exactamente una fila y una columna.',
  resumen: '',
  material: [{ titulo: 'Escalares', ruta: 'unidad-05-subconsultas/subconsultas.html', seccion: 'escalares' }],
});

describe('construirPregunta', () => {
  it('arma una pregunta válida con las opciones a–d', () => {
    const resultado = construirPregunta(datosValidos(), []);
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.pregunta.opciones.map((o) => o.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(resultado.pregunta.respuestaCorrecta).toBe('b');
  });

  it('omite el resumen cuando está vacío y lo incluye cuando se completa', () => {
    const sinResumen = construirPregunta(datosValidos(), []);
    expect(sinResumen.ok && 'resumen' in sinResumen.pregunta).toBe(false);

    const conResumen = construirPregunta({ ...datosValidos(), resumen: '  Idea clave.  ' }, []);
    expect(conResumen.ok && conResumen.pregunta.resumen).toBe('Idea clave.');
  });

  it('informa cada campo faltante en español', () => {
    const resultado = construirPregunta(
      { ...datosValidos(), tema: '', enunciado: ' ', respuestaCorrecta: '', material: [] },
      [],
    );
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.errores).toEqual(
      expect.arrayContaining([
        'Falta el tema.',
        'Falta el enunciado.',
        'Elegí cuál es la respuesta correcta.',
        'Agregá al menos un material de estudio.',
      ]),
    );
  });

  it('rechaza identificadores repetidos o con formato inválido', () => {
    const repetido = construirPregunta(datosValidos(), ['u05-escalar-nueva']);
    expect(repetido.ok).toBe(false);

    const invalido = construirPregunta({ ...datosValidos(), id: 'Mi Pregunta' }, []);
    expect(invalido.ok).toBe(false);
  });

  it('exige texto y explicación en cada opción', () => {
    const datos = datosValidos();
    datos.opciones[2] = { texto: '', explicacion: '' };
    const resultado = construirPregunta(datos, []);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.errores).toEqual(
      expect.arrayContaining(['Falta el texto de la opción C.', 'Falta la explicación de la opción C.']),
    );
  });
});

describe('archivo de la unidad', () => {
  const banco: BancoPreguntas = {
    unidad: 5,
    titulo: 'Subconsultas',
    preguntas: [],
  };

  it('agrega la pregunta al final sin modificar el banco original', () => {
    const resultado = construirPregunta(datosValidos(), []);
    if (!resultado.ok) throw new Error('la pregunta de prueba debería ser válida');
    const actualizado = agregarPregunta(banco, resultado.pregunta);
    expect(actualizado.preguntas).toHaveLength(1);
    expect(banco.preguntas).toHaveLength(0);
  });

  it('genera JSON con sangría de 2 espacios y salto de línea final', () => {
    const texto = aArchivoJson(banco);
    expect(texto.endsWith('}\n')).toBe(true);
    expect(JSON.parse(texto)).toEqual(banco);
  });

  it('nombra el archivo como los del banco', () => {
    expect(nombreArchivoUnidad(5, 'subconsultas')).toBe('unidad-05-subconsultas.json');
  });
});

describe('sugerirId', () => {
  it('arma un identificador sin tildes ni espacios', () => {
    expect(sugerirId(5, 'Tabla derivada: alias obligatorio')).toBe('u05-tabla-derivada-alias-obligatorio');
    expect(sugerirId(7, 'Cláusula WITH CHECK')).toBe('u07-clausula-with-check');
  });

  it('devuelve vacío si el tema no tiene letras o números', () => {
    expect(sugerirId(5, '¿?')).toBe('');
  });
});

describe('extraerSecciones', () => {
  it('toma cada sección con su h2 sin cruzar a la siguiente', () => {
    const html = `
      <section class="hero" id="inicio"><h1>Título</h1></section>
      <section id="escalares"><h2>Subconsultas <em>escalares</em></h2><p>x</p></section>
      <section id="listas"><h2>Listas</h2></section>`;
    expect(extraerSecciones(html)).toEqual([
      { id: 'inicio', titulo: 'inicio' },
      { id: 'escalares', titulo: 'Subconsultas escalares' },
      { id: 'listas', titulo: 'Listas' },
    ]);
  });
});

describe('reemplazar y quitar preguntas', () => {
  const crearBanco = (ids: string[]): BancoPreguntas => {
    const base = construirPregunta(datosValidos(), []);
    if (!base.ok) throw new Error('la pregunta de prueba debería ser válida');
    return { unidad: 5, titulo: 'Subconsultas', preguntas: ids.map((id) => ({ ...base.pregunta, id })) };
  };

  it('reemplaza la pregunta con ese id sin tocar las demás', () => {
    const banco = crearBanco(['u05-a', 'u05-b']);
    const original = banco.preguntas.find((p) => p.id === 'u05-b');
    if (!original) throw new Error('falta la pregunta de prueba');
    const actualizado = reemplazarPregunta(banco, 'u05-b', { ...original, tema: 'Nuevo tema' });
    expect(actualizado.preguntas.map((p) => p.id)).toEqual(['u05-a', 'u05-b']);
    expect(actualizado.preguntas[1]?.tema).toBe('Nuevo tema');
    expect(original.tema).not.toBe('Nuevo tema');
  });

  it('agrega la pregunta si el id original no existe', () => {
    const banco = crearBanco(['u05-a']);
    const base = banco.preguntas[0];
    if (!base) throw new Error('falta la pregunta de prueba');
    const actualizado = reemplazarPregunta(banco, 'u05-x', { ...base, id: 'u05-nueva' });
    expect(actualizado.preguntas.map((p) => p.id)).toEqual(['u05-a', 'u05-nueva']);
  });

  it('quita la pregunta con ese id', () => {
    const banco = crearBanco(['u05-a', 'u05-b']);
    expect(quitarPregunta(banco, 'u05-a').preguntas.map((p) => p.id)).toEqual(['u05-b']);
    expect(banco.preguntas).toHaveLength(2);
  });
});
