import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

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

/** Busca cada `<section id="...">` y el primer `h2` que aparece dentro de ella (sin cruzar a otra sección). */
export function extraerSecciones(html: string): SeccionMaterial[] {
  const patron = /<section[^>]*\sid="([^"]+)"((?:(?!<section)[\s\S])*?)(?=<section|$)/g;
  return [...html.matchAll(patron)].flatMap(([, id = '', contenido = '']) => {
    if (!id) return [];
    const h2 = contenido.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)?.[1] ?? '';
    const titulo = h2.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    return [{ id, titulo: titulo || id }];
  });
}
