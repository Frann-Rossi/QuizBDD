// @ts-check
import { rm } from 'node:fs/promises';
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { crearMiddlewareAutoria } from './autoria/servidor.mjs';

/**
 * Herramientas de autoría (Crear, Preguntas): solo funcionan con `astro dev`.
 * - El servidor de autoría (subir material y guardar bancos) se monta únicamente en desarrollo.
 * - Al terminar el build se borra la página «crear», así no queda publicada. (El enlace del menú
 *   se oculta en BaseLayout con import.meta.env.DEV.)
 */
const herramientasDeAutoria = {
  name: 'herramientas-de-autoria',
  hooks: {
    'astro:server:setup': /** @type {(opciones: { server: import('vite').ViteDevServer }) => void} */ (({ server }) => {
      server.middlewares.use(crearMiddlewareAutoria({ raiz: process.cwd() }));
    }),
    'astro:build:done': /** @type {(opciones: { dir: URL }) => Promise<void>} */ (async ({ dir }) => {
      await rm(new URL('./crear/', dir), { recursive: true, force: true });
    }),
  },
};

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  integrations: [herramientasDeAutoria],
  vite: {
    plugins: [tailwindcss()],
  },
});
