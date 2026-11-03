import { defineConfig, devices } from '@playwright/test';

const PUERTO = 4322;

/**
 * Tests de interfaz (end-to-end) sobre el sitio construido.
 * Usan el Chrome instalado en la máquina (channel: 'chrome'), sin descargar navegadores aparte.
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
    { name: 'escritorio', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    { name: 'celular', use: { ...devices['Pixel 7'], channel: 'chrome' } },
  ],
  webServer: {
    command: `npm run build && npx astro preview --port ${PUERTO}`,
    url: `http://localhost:${PUERTO}`,
    reuseExistingServer: !process.env['CI'],
    timeout: 180_000,
  },
});
