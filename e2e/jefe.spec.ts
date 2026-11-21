import { test, expect } from '@playwright/test';
import { loginDemo, money, pick, statValue, trackErrors } from './helpers';

test.describe('Jefe de obra · flujos principales', () => {
  test.beforeEach(async ({ page }) => { await loginDemo(page); });

  test('todas las secciones del menú cargan sin errores', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/app/obra/resumen');
    await expect(page.locator('aside nav a').first()).toBeVisible();
    const links = await page.locator('aside nav a').evaluateAll((as) => as.map((a) => a.getAttribute('href')!));
    expect(links.length).toBeGreaterThanOrEqual(15);
    for (const href of links) {
      await page.goto(href);
      await expect(page.locator('main h1').first(), href).toBeVisible();
    }
    expect(errors).toEqual([]);
  });

  test('Kanban: alta rápida y mover de columna', async ({ page }) => {
    await page.goto('/app/seguimiento');
    const porComenzar = page.getByTestId('col-por_comenzar');
    await porComenzar.getByPlaceholder('+ Tarea rápida (Enter)').fill('Tarea E2E');
    await porComenzar.getByPlaceholder('+ Tarea rápida (Enter)').press('Enter');
    const card = porComenzar.locator('div[draggable]', { hasText: 'Tarea E2E' });
    await expect(card).toBeVisible();
    await card.hover();
    await card.getByRole('button', { name: 'Mover a la columna siguiente' }).click();
    await expect(page.getByTestId('col-en_curso').getByText('Tarea E2E')).toBeVisible();
    await expect(porComenzar.getByText('Tarea E2E')).toHaveCount(0);
  });

  test('Kanban: crear tarea completa desde el modal', async ({ page }) => {
    await page.goto('/app/seguimiento');
    await page.getByRole('button', { name: 'Nueva tarea', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox').first().fill('Revisar armaduras');
    await pick(page, dialog.getByRole('button', { name: 'Prioridad' }), 'Crítica');
    await dialog.getByPlaceholder('Estructura, PB').fill('Estructura, QA');
    await dialog.getByRole('button', { name: 'Guardar' }).click();
    const card = page.getByTestId('col-por_comenzar').locator('div[draggable]', { hasText: 'Revisar armaduras' });
    await expect(card.getByText('Crítica')).toBeVisible();
    await expect(card.getByText('QA')).toBeVisible();
  });

  test('Caja chica: un egreso descuenta del saldo', async ({ page }) => {
    await page.goto('/app/obra/caja-chica');
    const antes = await statValue(page, 'Saldo disponible');
    await page.getByRole('button', { name: 'Agregar movimiento' }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('Ej. Discos de corte').fill('Guantes de nitrilo');
    await dialog.locator('input[type=number]').fill('1500');
    await dialog.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Registro guardado')).toBeVisible();
    await expect.poll(() => statValue(page, 'Saldo disponible')).toBe(antes - 1500);
  });

  test('Cálculos → Nuevo pedido → Mis pedidos', async ({ page }) => {
    await page.goto('/app/pedidos/calculos');
    await page.getByRole('button', { name: 'Hormigón' }).click();
    await expect(page.getByText(/2,64/)).toBeVisible(); // 5 × 4 × 0.12 + 10 %
    await page.getByRole('button', { name: 'Enviar a nuevo pedido' }).click();
    await expect(page).toHaveURL(/\/app\/pedidos\/nuevo$/);
    await expect(page.getByLabel('Descripción').first()).toHaveValue('Hormigón elaborado H-21');
    await page.getByRole('button', { name: 'Enviar pedido' }).click();
    await expect(page).toHaveURL(/mis-pedidos$/);
    await expect(page.getByRole('heading', { name: /Pedido desde cálculo: Hormigón/ })).toBeVisible();
  });

  test('Nuevo pedido exige al menos un ítem', async ({ page }) => {
    await page.goto('/app/pedidos/nuevo');
    await page.getByPlaceholder('Ej. Materiales mampostería PB').fill('Pedido vacío');
    await page.getByRole('button', { name: 'Enviar pedido' }).click();
    await expect(page.getByText('Agregá al menos un ítem con descripción y cantidad')).toBeVisible();
    await expect(page).toHaveURL(/\/app\/pedidos\/nuevo$/);
  });

  test('Obras: el presupuesto de caja chica se refleja en el resumen', async ({ page }) => {
    await page.goto('/app/obras');
    await page.getByRole('button', { name: 'Nueva obra' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox').first().fill('Obra QA');
    await dialog.locator('input[type=number]').fill('300000');
    await dialog.getByRole('button', { name: 'Guardar' }).click();
    await page.goto('/app/obra/resumen');
    await expect(page.getByText('Obra QA').first()).toBeVisible();
    expect(await statValue(page, 'Saldo caja chica')).toBe(300000);
  });

  test('Módulo CRUD (Fletes): alta, edición de estado y baja', async ({ page }) => {
    await page.goto('/app/servicios/fletes');
    await page.getByRole('button', { name: 'Agregar flete' }).first().click();
    const dialog = page.getByRole('dialog');
    const textos = dialog.locator('input:not([type=date]):not([type=number])');
    await textos.nth(0).fill('Depósito QA');
    await textos.nth(1).fill('Obra QA');
    await dialog.getByRole('button', { name: 'Guardar' }).click();
    const fila = page.locator('tr', { hasText: 'Depósito QA' });
    await expect(fila).toBeVisible();
    await pick(page, fila.getByRole('button', { name: /Cambiar Estado/ }), 'Realizado');
    await expect(fila.getByText('Realizado')).toBeVisible();
    await fila.click();
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar eliminación' }).click();
    await expect(page.locator('tr', { hasText: 'Depósito QA' })).toHaveCount(0);
  });

  test('Minutas: crear acta con asistentes y acuerdos', async ({ page }) => {
    await page.goto('/app/obra/minutas');
    await page.getByRole('button', { name: 'Nueva minuta' }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('Reunión semanal de coordinación').fill('Reunión QA');
    await dialog.getByPlaceholder('Nombre + Enter').fill('Ing. QA');
    await dialog.getByPlaceholder('Nombre + Enter').press('Enter');
    await dialog.getByRole('button', { name: 'Agregar', exact: true }).click();
    await dialog.getByPlaceholder('Acuerdo').fill('Enviar planos');
    await dialog.getByRole('button', { name: 'Guardar minuta' }).click();
    await expect(page.getByRole('heading', { name: 'Reunión QA' })).toBeVisible();
    await expect(page.getByText('Ing. QA').first()).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Enviar planos' })).toBeVisible();
  });

  test('Seguros: las pólizas próximas a vencer muestran alerta', async ({ page }) => {
    await page.goto('/app/servicios/seguros');
    await expect(page.locator('table').getByText(/Vence en \d+ d/)).toBeVisible();
  });
});

test.describe('Planes', () => {
  test('plan Inicial: sin Estudio ni Recursos y rutas bloqueadas', async ({ page }) => {
    await loginDemo(page, { plan: 'inicial' });
    await page.goto('/app/obra/resumen');
    const secciones = await page.locator('aside nav p').allTextContents();
    expect(secciones.map((s) => s.trim().toLowerCase())).not.toContain('estudio');
    expect(secciones.map((s) => s.trim().toLowerCase())).not.toContain('recursos');
    for (const ruta of ['/app/recursos/epp', '/app/estudio', '/app/equipo']) {
      await page.goto(ruta);
      await expect(page, ruta).toHaveURL(/\/app\/planes$/);
    }
  });

  test('Equipo bloqueado fuera del plan Estudio y se habilita al elegirlo', async ({ page }) => {
    await loginDemo(page, { plan: 'profesional' });
    await page.goto('/app/equipo');
    await expect(page.getByText('Incluido en el plan Estudio')).toBeVisible();
    await page.getByRole('button', { name: 'Probar el plan Estudio' }).click();
    await expect(page.getByRole('button', { name: 'Generar link de invitación' })).toBeVisible();
  });

  test('cambiar de plan desde la página Planes', async ({ page }) => {
    await loginDemo(page);
    await page.goto('/app/planes');
    await page.getByRole('button', { name: /Probar 7 días gratis/ }).first().click();
    await expect(page.getByText('Plan Inicial seleccionado para tu prueba')).toBeVisible();
    expect(money(await page.getByText(/Día \d de 7/).textContent())).toBeGreaterThan(0);
  });
});
