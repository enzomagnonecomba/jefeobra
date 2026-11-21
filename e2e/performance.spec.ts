import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { loginDemo, prefs } from './helpers';

/**
 * Presupuestos de rendimiento (build de producción servido localmente).
 * Los umbrales son conservadores para no dar falsos negativos en máquinas lentas;
 * los valores medidos quedan adjuntos a cada test en el reporte HTML.
 */
const BUDGET = {
  lcpMs: 2500,          // Core Web Vitals "bueno"
  cls: 0.1,             // Core Web Vitals "bueno"
  dclMs: 2000,
  routeChangeMs: 1500,
  entryJsGzipKB: 260,   // JS inicial (gzip)
  totalCssGzipKB: 20,
};

async function webVitals(page: Page) {
  return page.evaluate(() => new Promise<{ lcp: number; cls: number; dcl: number; load: number }>((resolve) => {
    let lcp = 0; let cls = 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) lcp = Math.max(lcp, e.startTime); }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) if (!e.hadRecentInput) cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
    setTimeout(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      resolve({ lcp, cls, dcl: nav.domContentLoadedEventEnd, load: nav.loadEventEnd });
    }, 1500);
  }));
}

test.describe('Rendimiento', () => {
  test('landing: LCP, CLS y DCL dentro del presupuesto', async ({ page }, info) => {
    await prefs(page);
    await page.goto('/', { waitUntil: 'load' });
    const v = await webVitals(page);
    await info.attach('web-vitals-landing', { body: JSON.stringify(v, null, 2), contentType: 'application/json' });
    expect(v.lcp).toBeLessThan(BUDGET.lcpMs);
    expect(v.cls).toBeLessThan(BUDGET.cls);
    expect(v.dcl).toBeLessThan(BUDGET.dclMs);
  });

  test('dashboard: LCP y CLS dentro del presupuesto', async ({ page }, info) => {
    await loginDemo(page);
    await page.goto('/app/obra/resumen', { waitUntil: 'load' });
    await expect(page.getByRole('heading', { name: 'Resumen de obra' })).toBeVisible();
    const v = await webVitals(page);
    await info.attach('web-vitals-dashboard', { body: JSON.stringify(v, null, 2), contentType: 'application/json' });
    expect(v.lcp).toBeLessThan(BUDGET.lcpMs);
    expect(v.cls).toBeLessThan(BUDGET.cls);
  });

  test('navegar entre módulos es rápido', async ({ page }, info) => {
    await loginDemo(page);
    await page.goto('/app/obra/resumen');
    await expect(page.getByRole('heading', { name: 'Resumen de obra' })).toBeVisible();
    const tiempos: Record<string, number> = {};
    for (const [link, titulo] of [['Tablero de tareas', 'Seguimiento'], ['Caja chica', 'Caja Chica'], ['Mis pedidos', 'Mis pedidos'], ['Fletes', 'Fletes']]) {
      const t0 = Date.now();
      await page.locator('aside nav').getByRole('link', { name: link, exact: true }).click();
      await expect(page.locator('main h1').first()).toHaveText(titulo);
      tiempos[link] = Date.now() - t0;
    }
    await info.attach('cambio-de-ruta-ms', { body: JSON.stringify(tiempos, null, 2), contentType: 'application/json' });
    for (const [k, ms] of Object.entries(tiempos)) expect(ms, k).toBeLessThan(BUDGET.routeChangeMs);
  });

  test('la landing no descarga el código del dashboard (code splitting)', async ({ page }) => {
    await prefs(page);
    const scripts: string[] = [];
    page.on('request', (r) => { if (r.resourceType() === 'script') scripts.push(r.url()); });
    await page.goto('/', { waitUntil: 'networkidle' });
    expect(scripts.length).toBeGreaterThan(0);
    for (const chunk of ['Layout', 'Seguimiento', 'PanelEstudio', 'Equipo', 'Pedidos', 'Minutas']) {
      expect(scripts.some((u) => u.includes(`/${chunk}-`)), chunk).toBe(false);
    }
  });

  test('tamaño del bundle inicial dentro del presupuesto', async ({}, info) => {
    const root = path.resolve(process.cwd(), 'dist-demo');
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const entries = [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.(?:js|css))"/g)].map((m) => m[1]);
    const gz = (f: string) => zlib.gzipSync(fs.readFileSync(path.join(root, f))).length / 1024;
    const js = entries.filter((f) => f.endsWith('.js')).reduce((a, f) => a + gz(f), 0);
    const css = entries.filter((f) => f.endsWith('.css')).reduce((a, f) => a + gz(f), 0);
    await info.attach('bundle-kb-gzip', { body: JSON.stringify({ js: +js.toFixed(1), css: +css.toFixed(1), entries }, null, 2), contentType: 'application/json' });
    expect(js).toBeLessThan(BUDGET.entryJsGzipKB);
    expect(css).toBeLessThan(BUDGET.totalCssGzipKB);
  });

  test('no hay pedidos de red fallidos ni recursos 404', async ({ page }) => {
    await loginDemo(page);
    const fallidos: string[] = [];
    page.on('response', (r) => { if (r.status() >= 400 && new URL(r.url()).host === new URL(page.url() || 'http://x').host) fallidos.push(`${r.status()} ${r.url()}`); });
    page.on('requestfailed', (r) => { if (!r.url().includes('fonts.g')) fallidos.push(`failed ${r.url()}`); });
    for (const ruta of ['/', '/app/obra/resumen', '/app/seguimiento', '/app/pedidos/calculos']) await page.goto(ruta, { waitUntil: 'networkidle' });
    expect(fallidos).toEqual([]);
  });

  test('carga rápida en celular (CPU 4x más lenta) @mobile', async ({ page }, info) => {
    await prefs(page);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.goto('/', { waitUntil: 'load' });
    const v = await webVitals(page);
    await info.attach('web-vitals-mobile-cpu4x', { body: JSON.stringify(v, null, 2), contentType: 'application/json' });
    expect(v.lcp).toBeLessThan(4000); // "necesita mejoras" recién arriba de 4 s
    expect(v.cls).toBeLessThan(BUDGET.cls);
  });
});
