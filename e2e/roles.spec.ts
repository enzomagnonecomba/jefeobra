import { test, expect, type Page } from '@playwright/test';
import { loginDemo, pick, statValue } from './helpers';

/** Inserta en el demo una invitación pendiente de otro jefe (para probar aceptarla). */
async function invitacionPendiente(page: Page, token: string) {
  await page.evaluate((tk) => {
    const k = 'obrabase:demo:obra_accesos';
    const rows = JSON.parse(localStorage.getItem(k) ?? '[]');
    rows.push({ id: `acc-${tk}`, owner_id: 'jefe-demo', obra_id: 'demo-obra-3', member_id: null, rol: 'compras', nombre: null, email: null,
      token: tk, estado: 'pendiente', created_at: new Date().toISOString(), accepted_at: null });
    localStorage.setItem(k, JSON.stringify(rows));
  }, token);
}

test.describe('Rol Compras', () => {
  test.beforeEach(async ({ page }) => { await loginDemo(page, { rol: 'compras', nombre: 'Laura' }); });

  test('solo ve el Panel de gestión y no puede entrar a otras secciones', async ({ page }) => {
    await page.goto('/app/estudio');
    await expect(page.locator('aside nav a')).toHaveText(['Panel de gestión']);
    for (const ruta of ['/app/obra/caja-chica', '/app/pedidos/nuevo', '/app/obras', '/app/planes', '/app/equipo', '/app/seguimiento']) {
      await page.goto(ruta);
      await expect(page, ruta).toHaveURL(/\/app\/estudio$/);
    }
    await expect(page.getByRole('button', { name: 'Obra activa' })).toHaveCount(0);
  });

  test('aprueba y rechaza pedidos', async ({ page }) => {
    await page.goto('/app/estudio');
    expect(await statValue(page, 'Pedidos por aprobar')).toBe(2);
    const hierro = page.locator('div.rounded-2xl', { hasText: 'Hierro para losa nivel 4' }).last();
    await hierro.getByRole('button', { name: 'Aprobar' }).click();
    await expect(page.getByText('Estado actualizado: Aprobado')).toBeVisible();
    const ceramicos = page.locator('div.rounded-2xl', { hasText: 'Cerámicos baños piso 2' }).last();
    await ceramicos.getByRole('button', { name: 'Rechazar' }).click();
    await expect.poll(() => statValue(page, 'Pedidos por aprobar')).toBe(0);
    await page.getByRole('button', { name: /^Rechazado \(1\)$/ }).click();
    await expect(page.getByRole('heading', { name: 'Cerámicos baños piso 2' })).toBeVisible();
  });

  test('cambia el estado de fletes y volquetes', async ({ page }) => {
    await page.goto('/app/estudio?tab=servicios');
    const flete = page.locator('div.rounded-2xl', { hasText: 'Acindar Villa Constitución' }).last();
    await pick(page, flete.getByRole('button', { name: /Cambiar Estado/ }), 'En tránsito');
    await expect(flete.getByText('En tránsito')).toBeVisible();
    const volquete = page.locator('div.rounded-2xl', { hasText: 'Volquetes Norte' }).last();
    await pick(page, volquete.getByRole('button', { name: /Cambiar Estado/ }), 'Retirado');
    await expect(volquete.getByText('Retirado')).toBeVisible();
  });

  test('ve el resumen de la obra en solo lectura', async ({ page }) => {
    await page.goto('/app/estudio?tab=obras');
    await page.getByRole('heading', { name: 'Torre Palermo' }).click();
    await expect(page).toHaveURL(/\/app\/estudio\/obras\/demo-obra-3$/);
    await expect(page.getByText('Solo lectura')).toBeVisible();
    await expect(page.getByText('Saldo caja chica')).toBeVisible();
    // Sin accesos a módulos de edición del jefe
    await expect(page.getByRole('link', { name: /Ver tablero|Caja chica|Ver todos/ })).toHaveCount(0);
  });

  test('acepta una invitación por link', async ({ page }) => {
    await page.goto('/app/estudio');
    await invitacionPendiente(page, 'tok-e2e-compras');
    await page.goto('/invitacion/tok-e2e-compras');
    await expect(page.getByRole('heading', { name: 'Martín Ruiz te invitó a su equipo' })).toBeVisible();
    await expect(page.getByText(/Como Compras vas a poder aprobar o rechazar/)).toBeVisible();
    await page.getByRole('button', { name: 'Aceptar invitación' }).click();
    await expect(page).toHaveURL(/\/app\/estudio$/);
  });
});

test.describe('Rol Dirección de obra', () => {
  test.beforeEach(async ({ page }) => { await loginDemo(page, { rol: 'direccion_obra', nombre: 'Arq. Silva' }); });

  test('solo ve el resumen de tareas, sin pedidos ni caja', async ({ page }) => {
    await page.goto('/app/estudio');
    await expect(page.locator('aside nav a')).toHaveText(['Resumen de tareas']);
    await expect(page.getByRole('heading', { name: 'Resumen de tareas' })).toBeVisible();
    await expect(page.getByText('Pedidos por aprobar')).toHaveCount(0);
    await page.getByRole('heading', { name: 'Torre Palermo' }).click();
    await expect(page.getByText('Estado del tablero')).toBeVisible();
    await expect(page.getByText('Encofrado losa nivel 4')).toBeVisible();
    await expect(page.getByText(/Pedidos de la obra|Saldo caja chica|Fletes/)).toHaveCount(0);
  });

  test('no puede acceder a otras rutas', async ({ page }) => {
    for (const ruta of ['/app/pedidos/mis-pedidos', '/app/obra/resumen', '/app/servicios/fletes']) {
      await page.goto(ruta);
      await expect(page, ruta).toHaveURL(/\/app\/estudio$/);
    }
  });
});

test.describe('Jefe de obra · equipo e invitaciones', () => {
  test('genera, comparte y revoca una invitación', async ({ page }) => {
    await loginDemo(page, { plan: 'estudio' });
    await page.goto('/app/equipo');
    await page.getByPlaceholder('Ej. Laura — Compras').fill('Compras QA');
    await page.getByRole('button', { name: 'Generar link de invitación' }).click();
    const link = page.getByRole('dialog').locator('.font-mono');
    await expect(link).toContainText('/invitacion/');
    expect((await link.textContent())!.split('/invitacion/')[1]).toMatch(/^[0-9a-f]{36}$/);
    await page.getByRole('dialog').getByRole('button', { name: 'Cerrar' }).click();
    const fila = page.locator('div.rounded-2xl', { hasText: 'Compras QA' }).last();
    await expect(fila.getByText('Pendiente')).toBeVisible();
    await fila.getByRole('button', { name: 'Revocar acceso' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Revocar', exact: true }).click();
    await expect(page.getByText('Acceso revocado')).toBeVisible();
    await expect(page.locator('div.rounded-2xl', { hasText: 'Compras QA' })).toHaveCount(0);
  });

  test('no puede aceptar su propia invitación ni una ajena siendo jefe', async ({ page }) => {
    await loginDemo(page, { plan: 'estudio' });
    await page.goto('/app/equipo');
    await page.getByRole('button', { name: 'Generar link de invitación' }).click();
    const url = (await page.getByRole('dialog').locator('.font-mono').textContent())!;
    await page.goto(new URL(url).pathname);
    await expect(page.getByText('Esta invitación la creaste vos.', { exact: false })).toBeVisible();

    await invitacionPendiente(page, 'tok-e2e-jefe');
    await page.goto('/invitacion/tok-e2e-jefe');
    await expect(page.getByText(/Tu cuenta es de Jefe de obra/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Aceptar invitación' })).toHaveCount(0);
  });

  test('invitación inexistente muestra error', async ({ page }) => {
    await loginDemo(page);
    await page.goto('/invitacion/no-existe');
    await expect(page.getByText('Este link de invitación no existe o fue revocado.')).toBeVisible();
  });

  test('sin sesión, la invitación ofrece ingresar y vuelve a ella', async ({ page }) => {
    await page.goto('/invitacion/abc123');
    await expect(page.getByRole('heading', { name: 'Te invitaron a obrabase' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute('href', '/registro?next=%2Finvitacion%2Fabc123');
  });
});
