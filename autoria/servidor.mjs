/**
 * Servidor de autoría: solo existe con `astro dev` (ver astro.config.mjs). Permite subir material
 * desde la PC a `materialEstudio/` y guardar cambios en los bancos de `src/content/preguntas/`.
 * En el build de producción no se monta nada: el sitio publicado no puede escribir archivos.
 *
 * Las funciones de este módulo no dependen de Astro: reciben las carpetas como parámetro, así
 * se prueban con carpetas temporales (tests/unit/autoria.test.ts).
 */
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { bancoPreguntasSchema } from '../src/lib/quiz/esquemas.ts';

export const RUTA_AUTORIA = '/__autoria';

const LIMITE_BYTES = 50 * 1024 * 1024;
const EXTENSIONES_MATERIAL = ['.pdf', '.html'];
const PATRON_CARPETA = /^unidad-\d{2}-[a-z0-9-]+$/i;
const PATRON_BANCO = /^unidad-\d{2}-[a-z0-9-]+\.json$/i;

export class ErrorAutoria extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

/** Nombre de archivo seguro: sin rutas, sin caracteres raros y con extensión permitida. */
export function nombreSeguro(nombre) {
  const base = basename(String(nombre ?? '')).normalize('NFC');
  const limpio = base
    .replace(/[^\p{L}\p{N}._ -]+/gu, '_')
    .replace(/\s+/g, ' ')
    .trim();
  if (!limpio || limpio.startsWith('.')) throw new ErrorAutoria(400, 'Nombre de archivo no válido.');
  if (!EXTENSIONES_MATERIAL.includes(extname(limpio).toLowerCase())) {
    throw new ErrorAutoria(400, 'Solo se pueden subir archivos .pdf o .html.');
  }
  return limpio;
}

function carpetaDeUnidad(carpetaMaterial, carpeta) {
  if (!PATRON_CARPETA.test(carpeta)) throw new ErrorAutoria(400, 'Carpeta de unidad no válida.');
  const ruta = join(carpetaMaterial, carpeta);
  if (!existsSync(ruta)) throw new ErrorAutoria(404, `No existe la carpeta ${carpeta} en materialEstudio/.`);
  return ruta;
}

/** Carpetas de unidad disponibles en `materialEstudio/`, p. ej. `unidad-01-introduccion`. */
export async function listarCarpetasMaterial(carpetaMaterial) {
  const entradas = await readdir(carpetaMaterial, { withFileTypes: true });
  return entradas
    .filter((entrada) => entrada.isDirectory() && PATRON_CARPETA.test(entrada.name))
    .map((entrada) => entrada.name)
    .sort();
}

/** Guarda un archivo subido en la carpeta de la unidad. Nunca sobrescribe un archivo existente. */
export async function guardarMaterial({ carpetaMaterial, carpeta, nombre, contenido }) {
  const dir = carpetaDeUnidad(carpetaMaterial, carpeta);
  const archivo = nombreSeguro(nombre);
  if (contenido.byteLength === 0) throw new ErrorAutoria(400, 'El archivo está vacío.');
  if (contenido.byteLength > LIMITE_BYTES) throw new ErrorAutoria(413, 'El archivo supera los 50 MB.');

  const destino = join(dir, archivo);
  if (existsSync(destino)) {
    throw new ErrorAutoria(409, `Ya existe ${archivo} en ${carpeta}. Renombralo antes de subirlo.`);
  }
  await mkdir(dir, { recursive: true });
  await writeFile(destino, contenido, { flag: 'wx' });
  return { ruta: `${carpeta}/${archivo}`, titulo: archivo.replace(/\.[^.]+$/, '') };
}

/** Comprueba que cada material del banco exista (y, en HTML, que la sección sea un id presente). */
export async function verificarMateriales(banco, carpetaMaterial) {
  const errores = [];
  for (const pregunta of banco.preguntas) {
    for (const material of pregunta.material) {
      const archivo = join(carpetaMaterial, material.ruta);
      if (!existsSync(archivo)) {
        errores.push(`${pregunta.id}: no existe el material ${material.ruta}.`);
        continue;
      }
      if (!material.ruta.toLowerCase().endsWith('.pdf')) {
        const html = await readFile(archivo, 'utf-8');
        if (!html.includes(`id="${material.seccion}"`)) {
          errores.push(`${pregunta.id}: la sección "${material.seccion}" no existe en ${material.ruta}.`);
        }
      }
    }
  }
  return errores;
}

/** Ids de las preguntas de todos los bancos, salvo el que se está guardando. */
async function idsDeOtrosBancos(carpetaPreguntas, archivoActual) {
  const ids = new Set();
  const archivos = (await readdir(carpetaPreguntas)).filter((a) => a.endsWith('.json') && a !== archivoActual);
  for (const archivo of archivos) {
    try {
      const banco = JSON.parse(await readFile(join(carpetaPreguntas, archivo), 'utf-8'));
      for (const pregunta of banco.preguntas ?? []) ids.add(pregunta.id);
    } catch {
      // Un banco que no se puede leer no bloquea el guardado: el build lo señala aparte.
    }
  }
  return ids;
}

/**
 * Reemplaza un banco existente por el que llega desde el formulario, después de validarlo con
 * el mismo esquema que usa el build. No crea bancos nuevos.
 */
export async function guardarBanco({ carpetaPreguntas, carpetaMaterial, archivo, datos }) {
  if (!PATRON_BANCO.test(archivo)) throw new ErrorAutoria(400, 'Nombre de banco no válido.');
  const destino = join(carpetaPreguntas, archivo);
  if (!existsSync(destino)) throw new ErrorAutoria(404, `No existe el banco ${archivo}.`);

  const validacion = bancoPreguntasSchema.safeParse(datos);
  if (!validacion.success) {
    const errores = validacion.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new ErrorAutoria(422, errores.join(' · '));
  }
  const erroresMaterial = await verificarMateriales(validacion.data, carpetaMaterial);
  if (erroresMaterial.length > 0) throw new ErrorAutoria(422, erroresMaterial.join(' · '));

  // Los ids deben ser únicos en todo el banco, no solo dentro de cada unidad.
  const idsDeOtros = await idsDeOtrosBancos(carpetaPreguntas, archivo);
  const repetidos = validacion.data.preguntas.map((p) => p.id).filter((id) => idsDeOtros.has(id));
  if (repetidos.length > 0) {
    throw new ErrorAutoria(422, `Ya existe otra pregunta con el id: ${repetidos.join(', ')}.`);
  }

  await writeFile(destino, `${JSON.stringify(validacion.data, null, 2)}\n`, 'utf-8');
  return { archivo, preguntas: validacion.data.preguntas.length };
}

function leerCuerpo(req) {
  return new Promise((resolver, rechazar) => {
    const fragmentos = [];
    let total = 0;
    req.on('data', (fragmento) => {
      total += fragmento.length;
      if (total > LIMITE_BYTES) {
        rechazar(new ErrorAutoria(413, 'El archivo supera los 50 MB.'));
        req.destroy();
        return;
      }
      fragmentos.push(fragmento);
    });
    req.on('end', () => resolver(Buffer.concat(fragmentos)));
    req.on('error', rechazar);
  });
}

const DIRECCIONES_LOCALES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

/** Solo se acepta la petición si viene de esta misma PC (aunque el servidor esté expuesto con --host). */
export function esLocal(req) {
  return DIRECCIONES_LOCALES.has(req.socket?.remoteAddress ?? '');
}

function responder(res, estado, cuerpo) {
  res.statusCode = estado;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(cuerpo));
}

/**
 * Middleware de Vite/Astro. Rutas:
 *  - POST /__autoria/material?carpeta=unidad-01-introduccion&nombre=guia.pdf  (cuerpo: el archivo)
 *  - POST /__autoria/banco?archivo=unidad-05-subconsultas.json                  (cuerpo: el banco en JSON)
 */
export function crearMiddlewareAutoria({ raiz }) {
  const carpetaMaterial = join(raiz, 'materialEstudio');
  const carpetaPreguntas = join(raiz, 'src', 'content', 'preguntas');

  return async (req, res, next) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (!url.pathname.startsWith(RUTA_AUTORIA)) return next();
    if (!esLocal(req)) return responder(res, 403, { error: 'Solo disponible desde esta misma PC.' });

    try {
      if (req.method !== 'POST') throw new ErrorAutoria(405, 'Método no permitido.');
      const accion = url.pathname.slice(RUTA_AUTORIA.length);

      if (accion === '/material') {
        const resultado = await guardarMaterial({
          carpetaMaterial,
          carpeta: url.searchParams.get('carpeta') ?? '',
          nombre: url.searchParams.get('nombre') ?? '',
          contenido: await leerCuerpo(req),
        });
        return responder(res, 201, resultado);
      }

      if (accion === '/banco') {
        let datos;
        try {
          datos = JSON.parse((await leerCuerpo(req)).toString('utf-8'));
        } catch {
          throw new ErrorAutoria(400, 'El cuerpo no es JSON válido.');
        }
        const resultado = await guardarBanco({
          carpetaPreguntas,
          carpetaMaterial,
          archivo: url.searchParams.get('archivo') ?? '',
          datos,
        });
        return responder(res, 200, resultado);
      }

      throw new ErrorAutoria(404, 'Acción no encontrada.');
    } catch (error) {
      if (error instanceof ErrorAutoria) return responder(res, error.status, { error: error.message });
      console.error('[autoria]', error);
      return responder(res, 500, { error: 'Error interno al guardar.' });
    }
  };
}
