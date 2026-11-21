import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { loginDemo, prefs } from './helpers';

const ROOT = process.cwd(); // Playwright corre desde la raíz del proyecto
const XSS = `<img src=x onerror="window.__xss=1">"><script>window.__xss=2</script>`;

test.describe('Seguridad · aplicación', () => {
  test('XSS: el contenido cargado por usuarios se muestra como texto', async ({ page }) => {
    await loginDemo(page);
    await page.goto('/app/seguimiento');
    const col = page.getByTestId('col-por_comenzar');
    await col.getByPlaceholder('+ Tarea rápida (Enter)').fill(XSS);
    await col.getByPlaceholder('+ Tarea rápida (Enter)').press('Enter');
    await expect(col.getByText(XSS)).toBeVisible();

    await page.goto('/app/obra/minutas');
    await page.getByRole('button', { name: 'Nueva minuta' }).first().click();
    await page.getByRole('dialog').getByPlaceholder('Reunión semanal de coordinación').fill(XSS);
    await page.getByRole('dialog').locator('textarea').fill(XSS);
    await page.getByRole('dialog').getByRole('button', { name: 'Guardar minuta' }).click();
    await expect(page.getByRole('heading', { name: XSS })).toBeVisible();

    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
    expect(await page.locator('main img[src="x"]').count()).toBe(0);
  });

  test('XSS: un token malicioso en la URL de invitación no se ejecuta', async ({ page }) => {
    await loginDemo(page);
    await page.goto(`/invitacion/${encodeURIComponent('<script>window.__xss=3</script>')}`);
    await expect(page.getByText('Este link de invitación no existe o fue revocado.')).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
  });

  for (const next of ['https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)']) {
    test(`open redirect bloqueado: ?next=${next}`, async ({ page }) => {
      await prefs(page);
      await page.goto(`/login?next=${encodeURIComponent(next)}`);
      await page.getByPlaceholder('Email').fill('qa@obra.test');
      await page.getByPlaceholder(/Contraseña/).fill('secreto123');
      await page.getByRole('button', { name: 'Ingresar' }).click();
      await page.waitForURL(/\/app\//);
      expect(new URL(page.url()).host).toBe(new URL(test.info().project.use.baseURL!).host);
    });
  }

  test('la contraseña no queda guardada en el navegador', async ({ page }) => {
    await prefs(page);
    await page.goto('/login');
    await page.getByPlaceholder('Email').fill('qa@obra.test');
    await page.getByPlaceholder(/Contraseña/).fill('ClaveSuperSecreta!9');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.waitForURL(/\/app\//);
    const storage = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }) + document.cookie);
    expect(storage).not.toContain('ClaveSuperSecreta!9');
  });

  test('los campos de contraseña usan type=password y autocomplete correcto', async ({ page }) => {
    await prefs(page);
    await page.goto('/login');
    const pass = page.getByPlaceholder(/Contraseña/);
    await expect(pass).toHaveAttribute('type', 'password');
    await expect(pass).toHaveAttribute('autocomplete', 'current-password');
    await page.goto('/registro');
    await expect(page.getByPlaceholder(/Contraseña/)).toHaveAttribute('autocomplete', 'new-password');
  });

  test('los enlaces externos abren con noopener', async ({ page }) => {
    await prefs(page);
    await page.goto('/');
    const inseguros = await page.locator('a[target="_blank"]').evaluateAll((as) => as.filter((a) => !/noopener|noreferrer/.test(a.getAttribute('rel') ?? '')).length);
    expect(inseguros).toBe(0);
  });
});

test.describe('Seguridad · build y configuración', () => {
  test('el bundle no contiene secretos (service_role, claves secretas, .env)', () => {
    const dir = path.join(ROOT, 'dist-demo', 'assets');
    const js = fs.readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
    expect(js).not.toMatch(/service_role/i);
    expect(js).not.toMatch(/sb_secret_[A-Za-z0-9]/);
    expect(js).not.toMatch(/SUPABASE_SERVICE/i);
    expect(js).not.toMatch(/-----BEGIN [A-Z ]*PRIVATE KEY-----/);
  });

  test('.env y .env.local están ignorados por git', () => {
    const gi = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
    expect(gi).toMatch(/^\.env$/m);
    expect(gi).toMatch(/^\.env\.local$/m);
  });

  test('vercel.json define headers de seguridad', () => {
    const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
    const headers = Object.fromEntries((cfg.headers ?? []).flatMap((h: { headers: { key: string; value: string }[] }) => h.headers).map((h: { key: string; value: string }) => [h.key.toLowerCase(), h.value]));
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBeTruthy();
    expect(headers['strict-transport-security']).toMatch(/max-age=\d+/);
    expect(headers['permissions-policy']).toBeTruthy();
  });
});

test.describe('Seguridad · base de datos (análisis estático de schema.sql)', () => {
  const sql = fs.readFileSync(path.join(ROOT, 'supabase', 'schema.sql'), 'utf8')
    .replace(/--.*$/gm, ''); // sin comentarios (el bloque RESET está comentado)
  const tablas = [...sql.matchAll(/create table if not exists (\w+)/g)].map((m) => m[1]);

  test('todas las tablas tienen RLS habilitado', () => {
    // RLS directo o dentro de un bucle DO que recorre un array de tablas.
    const enLoops = new Set<string>();
    for (const bloque of sql.matchAll(/foreach t in array array\[([^\]]+)\] loop([\s\S]*?)end loop/g)) {
      if (/enable row level security/.test(bloque[2])) for (const t of bloque[1].match(/'(\w+)'/g) ?? []) enLoops.add(t.slice(1, -1));
    }
    const sinRls = tablas.filter((t) => !new RegExp(`alter table ${t} enable row level security`).test(sql) && !enLoops.has(t));
    expect(tablas.length).toBeGreaterThanOrEqual(14);
    expect(sinRls).toEqual([]);
  });

  test('ninguna política se otorga a anon/public', () => {
    expect(sql).not.toMatch(/create policy[^;]*\bto (anon|public)\b/i);
    expect(sql).toMatch(/revoke all on all tables in schema public from anon/);
  });

  test('las funciones SECURITY DEFINER fijan search_path', () => {
    const fns = [...sql.matchAll(/create or replace function ([\w.]+)\([^)]*\)[\s\S]*?\$\$/g)].map((m) => m[0]);
    const definer = fns.filter((f) => /security definer/i.test(f));
    expect(definer.length).toBeGreaterThan(0);
    const sinPath = definer.filter((f) => !/set search_path/i.test(f)).map((f) => f.match(/function ([\w.]+)/)![1]);
    expect(sinPath).toEqual([]);
  });

  test('las RPC sensibles no son ejecutables por anon', () => {
    for (const fn of ['ver_invitacion', 'aceptar_invitacion', 'rol_en_obra', 'unirse_por_codigo', 'regenerar_codigo_obra', 'generar_codigo_obra']) {
      expect(sql, fn).toMatch(new RegExp(`revoke all on function public\\.${fn}\\([^)]*\\) from public, anon`));
    }
  });

  test('el rol del usuario y el dueño de cada fila no se pueden modificar', () => {
    expect(sql).toMatch(/create trigger trg_lock_rol before update on profiles/);
    expect(sql).toMatch(/create or replace function public\.lock_user_id\(\)/);
    expect(sql).toMatch(/revoke update on obra_accesos from authenticated/);
  });

  test('ID de obra: lo genera la base, no se edita a mano y tiene límite de intentos', () => {
    expect(sql).toMatch(/create trigger trg_codigo_obra before insert or update on obras/);
    expect(sql).toMatch(/new\.codigo := public\.generar_codigo_obra\(\)/);
    expect(sql).toMatch(/revoke all on codigo_intentos from anon, authenticated/);
    expect(sql).toMatch(/interval '10 minutes'\) >= 10/);
    expect(sql).toMatch(/create unique index if not exists obras_codigo_key on obras\(codigo\)/);
    // Alfabeto sin caracteres ambiguos y 8 posiciones → ~8,5e11 combinaciones
    expect(sql).toMatch(/'ABCDEFGHJKMNPQRSTUVWXYZ23456789'/);
    expect(sql).toMatch(/for i in 1\.\.8 loop/);
  });

  test('los miembros solo pueden cambiar el estado (trigger)', () => {
    expect(sql).toMatch(/to_jsonb\(new\) - 'estado' - 'updated_at'/);
    expect(sql).toMatch(/array\['pedidos', 'fletes', 'volquetes'\][\s\S]*?trg_miembro_estado/);
  });
});
