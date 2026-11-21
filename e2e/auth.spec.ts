import { test, expect } from '@playwright/test';
import { loginDemo, prefs } from './helpers';

test.describe('Autenticación (modo demo)', () => {
  test.beforeEach(async ({ page }) => { await prefs(page); });

  test('las rutas privadas redirigen al login sin sesión', async ({ page }) => {
    for (const ruta of ['/app', '/app/obra/caja-chica', '/app/estudio', '/app/equipo']) {
      await page.goto(ruta);
      await expect(page, ruta).toHaveURL(/\/login$/);
    }
  });

  test('login lleva al resumen de obra', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('Email').fill('qa@obra.test');
    await page.getByPlaceholder(/Contraseña/).fill('secreto123');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page).toHaveURL(/\/app\/obra\/resumen$/);
    await expect(page.getByRole('heading', { name: 'Resumen de obra' })).toBeVisible();
  });

  test('registro muestra los 3 roles y respeta el elegido', async ({ page }) => {
    await page.goto('/registro');
    for (const r of ['Jefe de obra', 'Dirección de obra', 'Compras']) await expect(page.getByText(r, { exact: true })).toBeVisible();
    await page.getByText('Compras', { exact: true }).click();
    await page.getByPlaceholder('Tu nombre').fill('Laura QA');
    await page.getByPlaceholder('Email').fill('laura@obra.test');
    await page.getByPlaceholder(/Contraseña/).fill('secreto123');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(page).toHaveURL(/\/app\/estudio$/);
    await expect(page.getByRole('banner').getByText('Compras', { exact: true })).toBeVisible();
  });

  test('el plan solo se muestra para el rol Jefe de obra', async ({ page }) => {
    await page.goto('/registro?plan=estudio');
    await expect(page.getByText(/Plan Estudio · 7 días gratis/)).toBeVisible();
    await page.getByText('Dirección de obra', { exact: true }).click();
    await expect(page.getByText(/Plan Estudio · 7 días gratis/)).toHaveCount(0);
  });

  test('después del login vuelve a la ruta pedida en ?next', async ({ page }) => {
    await page.goto('/login?next=%2Fapp%2Fobras');
    await page.getByPlaceholder('Email').fill('qa@obra.test');
    await page.getByPlaceholder(/Contraseña/).fill('secreto123');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page).toHaveURL(/\/app\/obras$/);
  });

  test('cerrar sesión vuelve al login y protege el panel', async ({ page }) => {
    await loginDemo(page);
    await page.goto('/app/obra/resumen');
    await page.getByRole('button', { name: 'Mi cuenta' }).click();
    await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto('/app/obra/resumen');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('recuperar contraseña muestra un mensaje neutro', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: '¿Olvidaste tu contraseña?' }).click();
    await expect(page.getByRole('heading', { name: 'Recuperar contraseña' })).toBeVisible();
    await page.getByPlaceholder('Email').fill('cualquiera@obra.test');
    await page.getByRole('button', { name: 'Enviar enlace' }).click();
    await expect(page.getByText('Si el email existe, te enviamos un enlace para restablecer la contraseña.')).toBeVisible();
  });
});
