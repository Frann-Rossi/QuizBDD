import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ErrorAutoria,
  crearMiddlewareAutoria,
  esLocal,
  guardarBanco,
  guardarMaterial,
  listarCarpetasMaterial,
  nombreSeguro,
} from '../../autoria/servidor.mjs';

const CARPETA = 'unidad-01-introduccion';
const BANCO = 'unidad-01-introduccion.json';

let raiz: string;
let carpetaMaterial: string;
let carpetaPreguntas: string;

/** Banco mínimo válido que referencia un PDF por página. */
function bancoConPdf(ruta = `${CARPETA}/guia.pdf`, seccion = 'pagina-2', id = 'u01-prueba') {
  const opciones = ['a', 'b', 'c', 'd'].map((id) => ({ id, texto: `Opción ${id}`, explicacion: `Explicación ${id}` }));
  return {
    unidad: 1,
    titulo: 'Introducción',
    preguntas: [
      {
        id,
        tema: 'Prueba',
        enunciado: '¿Pregunta de prueba?',
        opciones,
        respuestaCorrecta: 'a',
        explicacion: 'Explicación general.',
        material: [{ titulo: 'Guía', ruta, seccion }],
      },
    ],
  };
}

beforeEach(async () => {
  raiz = await mkdtemp(join(tmpdir(), 'autoria-'));
  carpetaMaterial = join(raiz, 'materialEstudio');
  carpetaPreguntas = join(raiz, 'src', 'content', 'preguntas');
  await mkdir(join(carpetaMaterial, CARPETA), { recursive: true });
  await mkdir(carpetaPreguntas, { recursive: true });
  await writeFile(join(carpetaMaterial, CARPETA, 'guia.pdf'), 'pdf de prueba');
  await writeFile(join(carpetaPreguntas, BANCO), JSON.stringify({ unidad: 1, titulo: 'x', preguntas: [] }));
});

afterEach(async () => {
  await rm(raiz, { recursive: true, force: true });
});

describe('nombreSeguro', () => {
  it('quita las rutas y deja solo el nombre del archivo', () => {
    expect(nombreSeguro('../../secreto/guia.pdf')).toBe('guia.pdf');
  });

  it('rechaza extensiones que no son PDF ni HTML', () => {
    expect(() => nombreSeguro('script.js')).toThrow(ErrorAutoria);
    expect(() => nombreSeguro('.oculto.pdf')).toThrow(ErrorAutoria);
  });
});

describe('guardarMaterial', () => {
  it('guarda un PDF nuevo en la carpeta de la unidad', async () => {
    const resultado = await guardarMaterial({
      carpetaMaterial,
      carpeta: CARPETA,
      nombre: 'Clase 2.pdf',
      contenido: Buffer.from('contenido'),
    });
    expect(resultado).toEqual({ ruta: `${CARPETA}/Clase 2.pdf`, titulo: 'Clase 2' });
    expect(await readFile(join(carpetaMaterial, CARPETA, 'Clase 2.pdf'), 'utf-8')).toBe('contenido');
  });

  it('no sobrescribe un archivo que ya existe', async () => {
    await expect(
      guardarMaterial({ carpetaMaterial, carpeta: CARPETA, nombre: 'guia.pdf', contenido: Buffer.from('otro') }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('rechaza carpetas que no son de unidad o no existen', async () => {
    await expect(
      guardarMaterial({ carpetaMaterial, carpeta: '../fuera', nombre: 'a.pdf', contenido: Buffer.from('x') }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      guardarMaterial({ carpetaMaterial, carpeta: 'unidad-09-nueva', nombre: 'a.pdf', contenido: Buffer.from('x') }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('rechaza archivos vacíos', async () => {
    await expect(
      guardarMaterial({ carpetaMaterial, carpeta: CARPETA, nombre: 'vacio.pdf', contenido: Buffer.alloc(0) }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('lista solo las carpetas de unidad', async () => {
    await mkdir(join(carpetaMaterial, 'otra-cosa'));
    expect(await listarCarpetasMaterial(carpetaMaterial)).toEqual([CARPETA]);
  });
});

describe('guardarBanco', () => {
  it('guarda un banco válido que referencia un PDF por página', async () => {
    const resultado = await guardarBanco({
      carpetaPreguntas,
      carpetaMaterial,
      archivo: BANCO,
      datos: bancoConPdf(),
    });
    expect(resultado).toEqual({ archivo: BANCO, preguntas: 1 });
    const guardado = JSON.parse(await readFile(join(carpetaPreguntas, BANCO), 'utf-8'));
    expect(guardado.preguntas[0].id).toBe('u01-prueba');
  });

  it('rechaza una sección de PDF que no es una página', async () => {
    await expect(
      guardarBanco({ carpetaPreguntas, carpetaMaterial, archivo: BANCO, datos: bancoConPdf(undefined, 'escalares') }),
    ).rejects.toMatchObject({ status: 422 });
  });

  it('rechaza material que no existe', async () => {
    await expect(
      guardarBanco({
        carpetaPreguntas,
        carpetaMaterial,
        archivo: BANCO,
        datos: bancoConPdf(`${CARPETA}/no-existe.pdf`),
      }),
    ).rejects.toMatchObject({ status: 422 });
  });

  it('no crea bancos nuevos ni acepta nombres fuera del patrón', async () => {
    await expect(
      guardarBanco({ carpetaPreguntas, carpetaMaterial, archivo: 'unidad-09-nueva.json', datos: bancoConPdf() }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      guardarBanco({ carpetaPreguntas, carpetaMaterial, archivo: '../x.json', datos: bancoConPdf() }),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe('acceso solo desde esta PC', () => {
  function respuestaFalsa() {
    return {
      statusCode: 0,
      headers: {} as Record<string, string>,
      body: '',
      setHeader(nombre: string, valor: string) {
        this.headers[nombre] = valor;
      },
      end(cuerpo: string) {
        this.body = cuerpo;
      },
    };
  }

  it('reconoce solo las direcciones locales', () => {
    expect(esLocal({ socket: { remoteAddress: '127.0.0.1' } })).toBe(true);
    expect(esLocal({ socket: { remoteAddress: '::1' } })).toBe(true);
    expect(esLocal({ socket: { remoteAddress: '192.168.1.5' } })).toBe(false);
    expect(esLocal({ socket: {} })).toBe(false);
  });

  it('responde 403 a una petición de otra máquina, sin tocar archivos', async () => {
    const middleware = crearMiddlewareAutoria({ raiz });
    const res = respuestaFalsa();
    const req = { method: 'POST', url: `/__autoria/banco?archivo=${BANCO}`, socket: { remoteAddress: '192.168.1.5' } };
    await middleware(req, res, () => {});
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(await readFile(join(carpetaPreguntas, BANCO), 'utf-8')).preguntas).toEqual([]);
  });
});

describe('ids únicos en todo el banco', () => {
  it('rechaza guardar una pregunta con un id que ya existe en otra unidad', async () => {
    const otro = bancoConPdf(undefined, undefined, 'u02-ajena');
    otro.unidad = 2;
    await writeFile(join(carpetaPreguntas, 'unidad-02-otra.json'), JSON.stringify(otro));

    const datos = bancoConPdf(undefined, undefined, 'u02-ajena');
    await expect(
      guardarBanco({ carpetaPreguntas, carpetaMaterial, archivo: BANCO, datos }),
    ).rejects.toMatchObject({ status: 422 });
  });
});
