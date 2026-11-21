import { test, expect, type Page } from '@playwright/test';
import { loginDemo } from './helpers';

// En el demo, "Casa Nordelta" (de otra jefa, Carla Méndez) tiene el ID NDT2-468K y no está compartida.
const ID_NORDELTA = 'NDT2-468K';

async function unirse(page: Page, codigo: string) {
  const input = page.getByPlaceholder('ABCD-1234').last();
  await input.fill(codigo);
  await page.getByRole('button', { name: 'Sumarme a la obra' }).last().click();
}

test.describe('ID de obra · Compras y Dirección de obra', () => {
  test('Compras se suma con el ID (en minúsculas y sin guion) y ve la obra y sus pedidos', async ({ page }) => {
    await loginDemo(page, { rol: 'compras' });
    await page.goto('/app/estudio');
    await page.getByRole('button', { name: 'Sumar obra con ID' }).click();
    await unirse(page, 'ndt2468k');
    await expect(page.getByText('Te sumaste a «Casa Nordelta»')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Malla sima y separadores' })).toBeVisible();
    await page.goto('/app/estudio?tab=obras');
    await expect(page.getByRole('heading', { name: 'Casa Nordelta' })).toBeVisible();
  });

  test('Dirección de obra se suma con el ID y ve solo las tareas', async ({ page }) => {
    await loginDemo(page, { rol: 'direccion_obra' });
    await page.goto('/app/estudio');
    await page.getByRole('button', { name: 'Sumar obra con ID' }).click();
    await unirse(page, ID_NORDELTA);
    await page.getByRole('heading', { name: 'Casa Nordelta' }).click();
    await expect(page.getByText('Platea de fundación')).toBeVisible();
    await expect(page.getByText('Malla sima y separadores')).toHaveCount(0);
  });

  test('sumarse dos veces no duplica el acceso', async ({ page }) => {
    await loginDemo(page, { rol: 'compras' });
    await page.goto('/app/estudio');
    for (let i = 0; i < 2; i++) {
      await page.getByRole('button', { name: 'Sumar obra con ID' }).click();
      await unirse(page, ID_NORDELTA);
      await expect(page.getByText('Te sumaste a «Casa Nordelta»').first()).toBeVisible();
    }
    const accesos = await page.evaluate(() => JSON.parse(localStorage.getItem('obrabase:demo:obra_accesos')!).filter((a: { obra_id: string }) => a.obra_id === 'demo-obra-4').length);
    expect(accesos).toBe(1);
  });

  test('ID inexistente muestra error y bloquea tras 10 intentos fallidos', async ({ page }) => {
    await loginDemo(page, { rol: 'compras' });
    await page.goto('/app/estudio');
    await page.getByRole('button', { name: 'Sumar obra con ID' }).click();
    await unirse(page, 'ZZZZ-9999');
    await expect(page.getByRole('alert')).toHaveText('No encontramos una obra con ese ID, o el acceso con ID está desactivado.');
    for (let i = 0; i < 9; i++) await unirse(page, `ZZZZ-99${String(i).padStart(2, '0')}`);
    await unirse(page, ID_NORDELTA); // incluso un ID válido queda bloqueado
    await expect(page.getByRole('alert')).toHaveText('Demasiados intentos. Esperá 10 minutos y volvé a probar.');
  });

  test('con el acceso por ID desactivado no se puede sumar', async ({ page }) => {
    await loginDemo(page, { rol: 'compras' });
    await page.goto('/app/estudio');
    await page.evaluate(() => {
      const k = 'obrabase:demo:obras';
      localStorage.setItem(k, JSON.stringify(JSON.parse(localStorage.getItem(k)!).map((o: { id: string }) => (o.id === 'demo-obra-4' ? { ...o, acceso_por_codigo: false } : o))));
    });
    await page.getByRole('button', { name: 'Sumar obra con ID' }).click();
    await unirse(page, ID_NORDELTA);
    await expect(page.getByRole('alert')).toContainText('No encontramos una obra con ese ID');
  });

  test('un jefe de obra no puede sumarse con un ID', async ({ page }) => {
    await loginDemo(page, { plan: 'estudio' });
    await page.goto('/app/estudio');
    await page.getByRole('button', { name: 'Sumar obra con ID' }).click();
    await unirse(page, ID_NORDELTA);
    await expect(page.getByRole('alert')).toHaveText('Solo las cuentas de Compras o Dirección de obra pueden sumarse con un ID.');
  });
});

test.describe('ID de obra · Jefe de obra', () => {
  test('ve el ID de cada obra en Equipo y en Mis obras', async ({ page }) => {
    await loginDemo(page, { plan: 'estudio' });
    await page.goto('/app/equipo');
    await expect(page.getByRole('heading', { name: 'Compartir con el ID de la obra' })).toBeVisible();
    await expect(page.getByTestId('codigo-obra').filter({ hasText: 'RQ4M-7K2P' })).toBeVisible();
    await page.goto('/app/obras');
    await expect(page.getByTestId('codigo-obra').first()).toHaveText(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });

  test('el ID no se muestra en Mis obras fuera del plan Estudio', async ({ page }) => {
    await loginDemo(page, { plan: 'profesional' });
    await page.goto('/app/obras');
    await expect(page.getByRole('heading', { name: 'Edificio Río 1820' })).toBeVisible();
    await expect(page.getByTestId('codigo-obra')).toHaveCount(0);
  });

  test('regenerar el ID lo cambia y desactivarlo lo marca', async ({ page }) => {
    await loginDemo(page, { plan: 'estudio' });
    await page.goto('/app/equipo');
    const fila = page.locator('li', { hasText: 'Edificio Río 1820' });
    await expect(fila.getByTestId('codigo-obra')).toHaveText('RQ4M-7K2P');
    await fila.getByRole('button', { name: 'Generar un ID nuevo' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Generar ID nuevo' }).click();
    await expect(fila.getByTestId('codigo-obra')).not.toHaveText('RQ4M-7K2P');
    await expect(fila.getByTestId('codigo-obra')).toHaveText(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    await fila.getByText('Activo').click();
    await expect(fila.getByText('Desactivado')).toBeVisible();
    await expect(page.getByText('Acceso con ID desactivado')).toBeVisible();
  });

  test('una obra nueva recibe su ID automáticamente', async ({ page }) => {
    await loginDemo(page, { plan: 'estudio' });
    await page.goto('/app/obras');
    await page.getByRole('button', { name: 'Nueva obra' }).click();
    await page.getByRole('dialog').getByRole('textbox').first().fill('Obra con ID');
    await page.getByRole('dialog').getByRole('button', { name: 'Guardar' }).click();
    const card = page.locator('div.rounded-2xl', { has: page.getByRole('heading', { name: 'Obra con ID' }) }).last();
    await expect(card.getByTestId('codigo-obra')).toHaveText(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });
});
