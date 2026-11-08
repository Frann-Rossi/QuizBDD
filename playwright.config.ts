import { defineConfig, devices } from '@playwright/test';

const PUERTO = 4322;
// Puerto por defecto de `astro dev`: si ya hay un servidor de desarrollo, Playwright lo reutiliza.
const PUERTO_DESARROLLO = 4321;

/** Herramientas de autoría (Crear, Preguntas): solo existen con el servidor de desarrollo. */
const SOLO_DESARROLLO = /(crear|preguntas)\.spec\.ts/;

/**
 * Tests de interfaz (end-to-end). Usan el Chrome instalado en la máquina (channel: 'chrome'),
 * sin descargar navegadores aparte.
 *
 * - Escritorio y celular: sobre el sitio construido (producción).
 * - Desarrollo (crear.spec.ts y preguntas.spec.ts): Crear y Preguntas solo existen con `astro dev`.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PUERTO}`,
    channel: 'chrome',
    trace: 'retain-on-failure',
    // Sin animaciones de desplazamiento: los tests no esperan a que termine cada scroll suave.
    contextOptions: { reducedMotion: 'reduce' },
  },
  projects: [
    {
      name: 'escritorio',
      testIgnore: SOLO_DESARROLLO,
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
    {
      name: 'celular',
      testIgnore: SOLO_DESARROLLO,
      use: { ...devices['Pixel 7'], channel: 'chrome' },
    },
    {
      name: 'desarrollo-escritorio',
      testMatch: SOLO_DESARROLLO,
      use: { ...devices['Desktop Chrome'], channel: 'chrome', baseURL: `http://localhost:${PUERTO_DESARROLLO}` },
    },
    {
      name: 'desarrollo-celular',
      testMatch: SOLO_DESARROLLO,
      use: { ...devices['Pixel 7'], channel: 'chrome', baseURL: `http://localhost:${PUERTO_DESARROLLO}` },
    },
  ],
  webServer: [
    {
      command: `npm run build && npx astro preview --port ${PUERTO}`,
      url: `http://localhost:${PUERTO}`,
      reuseExistingServer: !process.env['CI'],
      timeout: 180_000,
    },
    {
      command: `npx astro dev --port ${PUERTO_DESARROLLO}`,
      url: `http://localhost:${PUERTO_DESARROLLO}`,
      reuseExistingServer: !process.env['CI'],
      timeout: 180_000,
    },
  ],
});
