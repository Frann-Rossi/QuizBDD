import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { APIRoute, GetStaticPaths } from 'astro';

/**
 * Publica los documentos de `materialEstudio/` en `/material/...` sin duplicarlos:
 * la carpeta sigue siendo la única fuente del material.
 */
const CARPETA_MATERIAL = join(process.cwd(), 'materialEstudio');

export const getStaticPaths = (async () => {
  const archivos = await readdir(CARPETA_MATERIAL, { recursive: true });
  return archivos
    .filter((archivo) => archivo.endsWith('.html'))
    .map((archivo) => ({ params: { ruta: archivo.replaceAll('\\', '/') } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const html = await readFile(join(CARPETA_MATERIAL, params.ruta ?? ''), 'utf-8');
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
};
