# 7. Testing y calidad

## 7.1 Estrategia

| Nivel | Herramienta | Qué cubre | Estado |
|---|---|---|---|
| Tipos | `tsc --noEmit` (strict) | Contratos entre componentes y dominio | En cada build |
| E2E funcional | Playwright | Flujos de usuario por rol | 86 tests |
| Seguridad | Playwright + análisis estático | XSS, redirects, secretos, headers, RLS en SQL | Incluido |
| Rendimiento | Playwright (Performance API, CDP) | Web Vitals, cambios de ruta, bundle | Incluido |
| Accesibilidad | `@axe-core/playwright` | WCAG 2.1 A/AA | 10 pantallas |
| Carga / concurrencia | k6 (propuesto) | Usuarios simultáneos contra Supabase | **Pendiente** |
| RLS contra base real | Supabase staging | Políticas con usuarios por rol | **Pendiente** |

Los tests E2E corren contra el **build de producción en modo demo** (`dist-demo`): deterministas, sin red externa y sin tocar la base real. Cada test usa un contexto de navegador nuevo (datos limpios).

## 7.2 Suites

| Archivo | Tests | Cobertura |
|---|---:|---|
| `landing.spec.ts` | 5 | Hero y secciones, anclas, CTA a registro, precio anual, menú móvil |
| `auth.spec.ts` | 7 | Rutas protegidas, login, registro con rol, plan por rol, `?next`, logout, recuperación neutra |
| `jefe.spec.ts` | 13 | 17 secciones sin errores, Kanban (alta/mover/modal), caja chica, cálculos → pedido, validación de pedido, presupuesto → saldo, CRUD de fletes, minutas, alertas de seguros, planes |
| `roles.spec.ts` | 11 | Compras (rutas, aprobar/rechazar, servicios, solo lectura, aceptar invitación), Dirección (solo tareas, rutas), invitaciones (crear/revocar, propia, jefe, inexistente, sin sesión) |
| `security.spec.ts` | 18 | XSS, open redirect ×4, contraseña en storage, autocomplete, `noopener`, secretos en bundle, `.gitignore`, headers, RLS/funciones/RPC/triggers en `schema.sql` |
| `performance.spec.ts` | 7 | LCP/CLS/DCL landing y dashboard, cambios de ruta, code splitting, tamaño de bundle, recursos 404, CPU 4× en móvil |
| `nonfunctional.spec.ts` | 25 | Responsive 375/768/1280 en 14 pantallas, Kanban y tarjetas en móvil, axe en 10 pantallas (incl. oscuro), teclado en menús, modales, nombres accesibles, i18n EN/PT, persistencia de idioma y tema, rutas desconocidas, persistencia de datos, `localStorage` bloqueado |

Proyectos: `desktop` (Chrome 1366×850) y `mobile` (Pixel 7, tests `@mobile`).

## 7.3 Presupuestos y resultados medidos

| Métrica | Presupuesto | Medido |
|---|---|---|
| LCP landing | < 2,5 s | 0,56 s |
| LCP dashboard | < 2,5 s | 0,62 s |
| LCP móvil, CPU 4× | < 4 s | 1,24 s |
| CLS | < 0,1 | 0,00 – 0,05 |
| DCL landing | < 2 s | 0,23 s |
| Cambio de ruta en dashboard | < 1,5 s | 0,36 – 1,2 s |
| JS inicial (gzip) | < 260 KB | 231 KB |
| CSS (gzip) | < 20 KB | 9,3 KB |

> Mediciones sobre build local servido por `vite preview`. En producción (CDN + compresión Brotli) los tiempos de transferencia son menores.

Estabilidad: la suite se ejecutó 3 veces consecutivas sin fallas (86/86 y 172/172 con `--repeat-each=2`).

## 7.4 Hallazgos corregidos gracias a la suite

| # | Tipo | Hallazgo | Corrección |
|---|---|---|---|
| 1 | Seguridad | `?next=/\evil.com` se aceptaba (el navegador lo trata como `//evil.com`) | Validación rechaza `\` |
| 2 | Seguridad | Faltaban headers de seguridad | `vercel.json` con nosniff, X-Frame-Options, HSTS, Referrer-Policy, Permissions-Policy |
| 3 | Accesibilidad | Contraste insuficiente (títulos del menú, logo, descripciones de rol) | `slate-400 → slate-500/600` |
| 4 | Accesibilidad | Nombre accesible de menús/selector de idioma/avatar sin el texto visible | Nombre = etiqueta + valor; texto `sr-only` en triggers |

## 7.5 Cómo correr

```bash
npx playwright install chromium     # una vez
npm run test:e2e                    # todo
npx playwright test e2e/roles.spec.ts -g "Compras"   # un subconjunto
npm run test:e2e:report             # reporte con trazas, capturas y métricas adjuntas
```

## 7.6 Definición de terminado (DoD)

Un cambio está listo para `main` cuando:
1. `npm run build` pasa (tipos estrictos).
2. `npm run test:e2e` pasa completo.
3. Si toca la base: migración idempotente + `schema.sql` actualizado + test estático si cambia la seguridad.
4. Textos nuevos en `en.ts` y `pt.ts`.
5. Probado en 375 px y en modo oscuro.
6. Sin violaciones graves de axe en las pantallas tocadas.
