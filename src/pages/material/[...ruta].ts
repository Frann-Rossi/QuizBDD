import { readdir, readFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import type { APIRoute, GetStaticPaths } from 'astro';

/**
 * Publica los documentos de `materialEstudio/` (HTML y PDF) en `/material/...` sin duplicarlos:
 * la carpeta sigue siendo la única fuente del material.
 */
const CARPETA_MATERIAL = join(process.cwd(), 'materialEstudio');

const TIPOS: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.pdf': 'application/pdf',
};

export const getStaticPaths = (async () => {
  const archivos = await readdir(CARPETA_MATERIAL, { recursive: true });
  return archivos
    .filter((archivo) => extname(archivo).toLowerCase() in TIPOS)
    .map((archivo) => ({ params: { ruta: archivo.replaceAll('\\', '/') } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const ruta = params.ruta ?? '';
  const tipo = TIPOS[extname(ruta).toLowerCase()];
  const archivo = resolve(CARPETA_MATERIAL, ruta);
  // No se sirve nada fuera de la carpeta de material.
  if (!tipo || !archivo.startsWith(resolve(CARPETA_MATERIAL) + sep)) {
    return new Response('No encontrado', { status: 404 });
  }
  const contenido = await readFile(archivo);
  return new Response(contenido, { headers: { 'Content-Type': tipo } });
};
