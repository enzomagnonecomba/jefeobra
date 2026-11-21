import { test, expect } from '@playwright/test';
import { prefs, trackErrors } from './helpers';

test.describe('Landing pública', () => {
  test.beforeEach(async ({ page }) => { await prefs(page); });

  test('carga hero, secciones y planes sin errores', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Orden, trazabilidad y');
    for (const id of ['que-hacemos', 'quienes-somos', 'planes']) await expect(page.locator(`#${id}`)).toBeAttached();
    await expect(page.getByText('Más elegido')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('los enlaces del menú llevan a cada sección', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('navigation').getByRole('link', { name: 'Planes' }).click();
    await expect(page).toHaveURL(/#planes$/);
    await expect(page.locator('#planes')).toBeInViewport();
  });

  test('el CTA principal lleva al registro', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /Probar 7 días gratis/ }).first().click();
    await expect(page).toHaveURL(/\/registro/);
    await expect(page.getByRole('heading', { name: 'Creá tu cuenta' })).toBeVisible();
  });

  test('precio anual aplica el descuento', async ({ page }) => {
    await page.goto('/#planes');
    const planes = page.locator('#planes');
    await expect(planes.getByText('US$ 29', { exact: true })).toBeVisible();
    await planes.getByRole('button', { name: /Anual/ }).click();
    await expect(planes.getByText('US$ 24', { exact: true })).toBeVisible();
    await expect(planes.getByText(/Facturado anual: US\$ 288/)).toBeVisible();
  });

  test('menú móvil abre, navega y cierra @mobile', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Abrir menú' }).click();
    const menu = page.locator('header nav').last();
    await expect(menu.getByRole('link', { name: 'Quiénes somos' })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Register' })).toBeVisible();
    await menu.getByRole('link', { name: 'Planes' }).click();
    await expect(page.getByRole('button', { name: 'Abrir menú' })).toBeVisible();
    await expect(page).toHaveURL(/#planes$/);
  });
});
