/**
 * Secciones de un documento HTML del material: cada `<section id="...">` con el texto de su primer `h2`.
 * Lo usan la página Crear (al subir un HTML) y la lista de material, así que no depende de Astro.
 */
export function extraerSecciones(html) {
  const patron = /<section[^>]*\sid="([^"]+)"((?:(?!<section)[\s\S])*?)(?=<section|$)/g;
  return [...html.matchAll(patron)].flatMap(([, id = '', contenido = '']) => {
    if (!id) return [];
    const h2 = contenido.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)?.[1] ?? '';
    const titulo = h2.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    return [{ id, titulo: titulo || id }];
  });
}
