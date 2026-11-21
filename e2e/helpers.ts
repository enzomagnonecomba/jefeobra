import { expect, type Page } from '@playwright/test';

export type Rol = 'jefe_obra' | 'compras' | 'direccion_obra';
export interface Sesion { rol?: Rol; plan?: 'inicial' | 'profesional' | 'estudio'; lang?: 'es' | 'en' | 'pt'; theme?: 'light' | 'dark'; nombre?: string }

/**
 * Prepara el navegador ANTES de cargar la app: sesión demo iniciada con el rol/plan
 * pedido, idioma y tema. (Cada test usa un contexto nuevo → datos demo limpios.)
 */
export async function loginDemo(page: Page, s: Sesion = {}) {
  const meta = { rol: s.rol ?? 'jefe_obra', plan: s.plan ?? 'profesional', nombre: s.nombre ?? 'Demo' };
  await page.addInitScript(([m, lang, theme]) => {
    if (sessionStorage.getItem('__e2e_init')) return; // solo la primera carga
    sessionStorage.setItem('__e2e_init', '1');
    localStorage.setItem('mock_login', '1');
    localStorage.setItem('mock_meta', m);
    localStorage.setItem('obrabase:lang', lang);
    localStorage.setItem('obrabase:theme', theme);
  }, [JSON.stringify(meta), s.lang ?? 'es', s.theme ?? 'light'] as const);
}

/** Solo idioma/tema, sin sesión (para la landing y el login). */
export async function prefs(page: Page, lang: 'es' | 'en' | 'pt' = 'es', theme: 'light' | 'dark' = 'light') {
  await page.addInitScript(([l, th]) => {
    if (sessionStorage.getItem('__e2e_prefs')) return;
    sessionStorage.setItem('__e2e_prefs', '1');
    localStorage.setItem('obrabase:lang', l);
    localStorage.setItem('obrabase:theme', th);
  }, [lang, theme] as const);
}

/** "$ 587.500" → 587500 */
export const money = (s: string | null) => Number((s ?? '').replace(/[^\d-−]/g, '').replace('−', '-'));

/** Valor numérico de una StatCard por su etiqueta. */
export async function statValue(page: Page, label: string) {
  const card = page.locator('div.rounded-2xl', { has: page.getByText(label, { exact: true }) }).first();
  return money(await card.locator('p.text-2xl').first().textContent());
}

/** La página no debe poder desplazarse en horizontal. */
export async function expectNoHorizontalOverflow(page: Page) {
  const { sw, w } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
  expect(sw, `scrollWidth ${sw} > viewport ${w}`).toBeLessThanOrEqual(w);
}

/** Abre un menú desplegable propio (Select) y elige una opción por texto. */
export async function pick(page: Page, trigger: ReturnType<Page['getByRole']>, option: string | RegExp) {
  await trigger.click();
  await page.getByRole('listbox').getByRole('option', { name: option }).click();
}

/** Junta errores de consola y de página para afirmar que no hubo ninguno. */
export function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  return errors;
}
