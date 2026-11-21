import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { expectNoHorizontalOverflow, loginDemo, prefs, type Rol } from './helpers';

const PUBLICAS = ['/', '/login', '/registro'];
const JEFE = ['/app/obra/resumen', '/app/seguimiento', '/app/pedidos/nuevo', '/app/pedidos/mis-pedidos', '/app/pedidos/calculos',
  '/app/obra/caja-chica', '/app/obra/jornales', '/app/obra/minutas', '/app/servicios/seguros', '/app/recursos/epp', '/app/planes', '/app/obras'];

// ---------------------------------------------------------------- Responsive
test.describe('Responsive', () => {
  for (const [w, h] of [[375, 812], [768, 1024], [1280, 800]]) {
    test(`sin scroll horizontal a ${w}px`, async ({ page }) => {
      test.setTimeout(90_000);
      await page.setViewportSize({ width: w, height: h });
      await loginDemo(page, { plan: 'estudio' });
      for (const ruta of [...PUBLICAS.slice(0, 1), ...JEFE, '/app/equipo']) {
        await page.goto(ruta);
        await expect(page.locator('main, #root > div').first()).toBeVisible();
        await expectNoHorizontalOverflow(page);
      }
    });
  }

  test('el Kanban se desliza por columnas y las tablas pasan a tarjetas @mobile', async ({ page }) => {
    await loginDemo(page);
    await page.goto('/app/seguimiento');
    const col = page.getByTestId('col-por_comenzar');
    const box = await col.boundingBox();
    expect(box!.width).toBeGreaterThan(page.viewportSize()!.width * 0.7);
    await page.goto('/app/obra/caja-chica');
    await expect(page.locator('table')).toBeHidden();
    await expect(page.getByText('Combustible camioneta').first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('el encabezado del panel entra en el celular @mobile', async ({ page }) => {
    await loginDemo(page);
    await page.goto('/app/obra/resumen');
    await expectNoHorizontalOverflow(page);
    await expect(page.getByRole('button', { name: 'Mi cuenta' })).toBeInViewport();
    await page.getByRole('button', { name: 'Abrir menú' }).click();
    await expect(page.getByRole('link', { name: 'Tablero de tareas' }).last()).toBeVisible();
  });
});

// ---------------------------------------------------------------- Accesibilidad
test.describe('Accesibilidad (axe-core, WCAG 2.1 A/AA)', () => {
  const casos: { nombre: string; ruta: string; rol?: Rol; theme?: 'light' | 'dark' }[] = [
    { nombre: 'landing', ruta: '/' },
    { nombre: 'login', ruta: '/login' },
    { nombre: 'registro', ruta: '/registro' },
    { nombre: 'resumen', ruta: '/app/obra/resumen', rol: 'jefe_obra' },
    { nombre: 'kanban', ruta: '/app/seguimiento', rol: 'jefe_obra' },
    { nombre: 'caja chica', ruta: '/app/obra/caja-chica', rol: 'jefe_obra' },
    { nombre: 'nuevo pedido', ruta: '/app/pedidos/nuevo', rol: 'jefe_obra' },
    { nombre: 'panel compras', ruta: '/app/estudio', rol: 'compras' },
    { nombre: 'resumen dirección', ruta: '/app/estudio', rol: 'direccion_obra' },
    { nombre: 'resumen (modo oscuro)', ruta: '/app/obra/resumen', rol: 'jefe_obra', theme: 'dark' },
  ];
  for (const c of casos) {
    test(`sin violaciones críticas ni serias: ${c.nombre}`, async ({ page }, info) => {
      if (c.rol) await loginDemo(page, { rol: c.rol, theme: c.theme }); else await prefs(page, 'es', c.theme);
      await page.goto(c.ruta);
      await expect(page.locator('h1').first()).toBeVisible();
      await page.waitForTimeout(2000); // esperar a que terminen las animaciones de entrada (si no, axe mide colores a medio fundido)
      const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      const graves = res.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
      await info.attach('axe', { body: JSON.stringify(res.violations.map((v) => ({ id: v.id, impact: v.impact, nodos: v.nodes.length, ejemplo: v.nodes[0]?.target })), null, 2), contentType: 'application/json' });
      expect(graves.map((v) => `${v.id} (${v.impact}, ${v.nodes.length}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
    });
  }

  test('los menús desplegables se usan con teclado', async ({ page }) => {
    await loginDemo(page);
    await page.goto('/app/seguimiento');
    await page.getByRole('button', { name: 'Nueva tarea', exact: true }).click();
    const prioridad = page.getByRole('dialog').getByRole('button', { name: 'Prioridad' });
    await prioridad.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('listbox')).toBeVisible();
    await page.keyboard.press('Home');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('listbox')).toBeHidden();
    await expect(prioridad).toContainText('Crítica');
    await prioridad.press('ArrowDown');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('listbox')).toBeHidden();
  });

  test('las ventanas modales tienen rol dialog y nombre', async ({ page }) => {
    await loginDemo(page);
    await page.goto('/app/obra/caja-chica');
    await page.getByRole('button', { name: 'Agregar movimiento' }).first().click();
    await expect(page.getByRole('dialog', { name: 'Agregar movimiento' })).toBeVisible();
  });

  test('todas las imágenes e íconos interactivos tienen nombre accesible', async ({ page }) => {
    await loginDemo(page);
    await page.goto('/app/obra/resumen');
    const sinNombre = await page.locator('button, a').evaluateAll((els) => els
      .filter((e) => (e as HTMLElement).offsetParent !== null)
      .filter((e) => !(e.textContent ?? '').trim() && !e.getAttribute('aria-label') && !e.getAttribute('title'))
      .map((e) => e.outerHTML.slice(0, 80)));
    expect(sinNombre).toEqual([]);
  });
});

// ---------------------------------------------------------------- Idiomas
test.describe('Internacionalización', () => {
  const NAV_ES = ['Tablero de tareas', 'Nuevo pedido', 'Mis pedidos', 'Caja chica', 'Jornales', 'Fletes', 'Herramientas']; // 'Seguros' se escribe igual en portugués
  for (const [lang, esperado] of [['en', ['Task board', 'New order', 'Petty cash', 'Freight']], ['pt', ['Quadro de tarefas', 'Novo pedido', 'Caixa pequeno', 'Fretes']]] as const) {
    test(`la app completa se traduce a ${lang}`, async ({ page }) => {
      await loginDemo(page, { lang });
      await page.goto('/app/obra/resumen');
      await expect(page.locator('aside nav a').first()).toBeVisible();
      const nav = (await page.locator('aside nav a').allTextContents()).map((s) => s.trim());
      for (const e of esperado) expect(nav).toContain(e);
      for (const es of NAV_ES) expect(nav).not.toContain(es);
      await expect(page.locator('html')).toHaveAttribute('lang', lang);
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1 })).not.toContainText('Orden, trazabilidad');
    });
  }

  test('cambiar idioma desde el selector persiste al recargar', async ({ page }) => {
    await prefs(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Idioma' }).click();
    await page.getByRole('option', { name: /English/ }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Order, traceability and');
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Order, traceability and');
  });
});

// ---------------------------------------------------------------- Tema
test.describe('Modo oscuro', () => {
  test('se activa, persiste y se aplica antes del primer render', async ({ page }) => {
    await prefs(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Cambiar a modo oscuro' }).first().click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    // En la recarga la clase ya está en el HTML inicial (script en <head>): sin destello claro.
    const darkAlInicio: boolean[] = [];
    await page.exposeFunction('__reportDark', (v: boolean) => darkAlInicio.push(v));
    await page.addInitScript(() => document.addEventListener('readystatechange', () => {
      if (document.readyState === 'interactive') (window as unknown as { __reportDark: (v: boolean) => void }).__reportDark(document.documentElement.classList.contains('dark'));
    }));
    await page.reload();
    await expect.poll(() => darkAlInicio[0]).toBe(true);
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).not.toBe('rgb(250, 249, 246)');
  });
});

// ---------------------------------------------------------------- Robustez
test.describe('Robustez', () => {
  test('rutas desconocidas redirigen sin romper', async ({ page }) => {
    await prefs(page);
    await page.goto('/no-existe/para-nada');
    await expect(page).toHaveURL(/\/$/);
    await loginDemo(page);
    await page.goto('/app/no-existe');
    await expect(page).toHaveURL(/\/app\/obra\/resumen$/);
  });

  test('los datos persisten al recargar', async ({ page }) => {
    await loginDemo(page);
    await page.goto('/app/seguimiento');
    const col = page.getByTestId('col-por_comenzar');
    await col.getByPlaceholder('+ Tarea rápida (Enter)').fill('Persistente QA');
    await col.getByPlaceholder('+ Tarea rápida (Enter)').press('Enter');
    await expect(col.getByText('Persistente QA')).toBeVisible();
    await page.reload();
    await expect(page.getByTestId('col-por_comenzar').getByText('Persistente QA')).toBeVisible();
  });

  test('funciona sin localStorage disponible (modo privado estricto)', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new Error('bloqueado'); } });
    });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
