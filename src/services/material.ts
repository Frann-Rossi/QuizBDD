import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { extraerSecciones } from '../../autoria/secciones.mjs';

export interface SeccionMaterial {
  /** `id` HTML de la sección, p. ej. `escalares`. */
  id: string;
  /** Título visible de la sección (su primer `h2`), o el id si no tiene. */
  titulo: string;
}

export interface DocumentoMaterial {
  /** Ruta relativa a `materialEstudio/`, p. ej. `unidad-05-subconsultas/subconsultas.html`. */
  ruta: string;
  titulo: string;
  secciones: SeccionMaterial[];
}

const CARPETA_MATERIAL = join(process.cwd(), 'materialEstudio');

/** Lista los documentos de `materialEstudio/` con sus secciones, leyendo los HTML en el build. */
export async function obtenerDocumentosMaterial(): Promise<DocumentoMaterial[]> {
  const archivos = (await readdir(CARPETA_MATERIAL, { recursive: true }))
    .map((archivo) => archivo.replaceAll('\\', '/'))
    .filter((archivo) => archivo.endsWith('.html'))
    .sort();

  return Promise.all(
    archivos.map(async (ruta) => {
      const html = await readFile(join(CARPETA_MATERIAL, ruta), 'utf-8');
      const titulo = html.match(/<title>([^<]*)<\/title>/)?.[1]?.trim() || ruta;
      return { ruta, titulo, secciones: extraerSecciones(html) };
    }),
  );
}

/** Secciones de un HTML del material (la lógica vive en autoria/secciones.mjs, compartida con el servidor). */
export { extraerSecciones };
