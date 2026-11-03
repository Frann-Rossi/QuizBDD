/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// getViteConfig reutiliza la configuración de Astro (alias, plugins)
// para que los tests resuelvan los módulos igual que la aplicación.
export default getViteConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
