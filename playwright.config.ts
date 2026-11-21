import { defineConfig, devices } from '@playwright/test';

/**
 * Suite E2E de obrabase.
 * Corre contra un build de producción en MODO DEMO (sin Supabase): los datos viven
 * en el localStorage de cada contexto de navegador, así que cada test arranca limpio
 * y nunca toca la base real.
 *
 *   npm run test:e2e          → corre todo
 *   npm run test:e2e:ui       → interfaz visual
 *   npm run test:e2e:report   → abre el último reporte HTML
 */
const PORT = 4174;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'es-AR',
    colorScheme: 'light',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 850 } }, grepInvert: /@mobile/ },
    // Celular (Chromium emulando un Pixel): solo los tests marcados @mobile.
    { name: 'mobile', use: { ...devices['Pixel 7'] }, grep: /@mobile/ },
  ],
  webServer: {
    command: `npm run build:demo && npx vite preview --mode demo --outDir dist-demo --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
