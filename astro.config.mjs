// @ts-check
import { rm } from 'node:fs/promises';
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

/**
 * «Crear» es una herramienta de autoría: solo se usa en desarrollo. Al terminar el build se
 * borra su página generada, así no queda publicada. (El enlace del menú se oculta aparte, en
 * BaseLayout, con import.meta.env.DEV.)
 */
const ocultarCrearEnProduccion = {
  name: 'ocultar-crear-en-produccion',
  hooks: {
    'astro:build:done': /** @type {(opciones: { dir: URL }) => Promise<void>} */ (async ({ dir }) => {
      await rm(new URL('./crear/', dir), { recursive: true, force: true });
    }),
  },
};

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  integrations: [ocultarCrearEnProduccion],
  vite: {
    plugins: [tailwindcss()],
  },
});
