# obrabase · Gestión y control de obra

SaaS B2B para **jefes de obra** de estudios de arquitectura: tareas, pedidos, caja chica, jornales, adicionales, manifiesto, minutas, fletes, volquetes, seguros, EPP y herramientas.

📚 **Documentación técnica completa:** [`docs/`](docs/README.md) — visión, arquitectura, modelo de datos, seguridad, frontend, despliegue, testing, ADRs y roadmap.

**Stack:** React 19 + Vite + TypeScript · Tailwind CSS v4 · Framer Motion · Lucide React · Supabase (Postgres + Auth + RLS).

## Desarrollo local

```bash
npm install
npm run dev               # usa Supabase si .env.local tiene credenciales
npx vite --mode demo      # fuerza modo demo (datos de ejemplo en localStorage)
```

Variables (en `.env.local`, cualquiera de los dos prefijos sirve):

```
VITE_SUPABASE_URL=...            # o NEXT_PUBLIC_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=...       # o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

## Base de datos

Ejecutá `supabase/schema.sql` completo en el SQL Editor de Supabase. Es idempotente.

> Si habías corrido la versión anterior del esquema (basada en `estudios`), descomentá el bloque **RESET** al inicio del archivo una sola vez. Borra los datos de esas tablas.

### Aislamiento multi-tenant por usuario

- Todas las tablas tienen `user_id uuid not null default auth.uid()`.
- RLS habilitado en todas, con políticas separadas por operación:
  - `select / update / delete`: `auth.uid() = user_id`.
  - `insert / update`: además exige que la `obra_id` referenciada pertenezca al mismo usuario (no se puede colgar datos de la obra de otro).
- Trigger `lock_user_id` impide cambiar el dueño de una fila.
- `revoke all ... from anon`: sin acceso anónimo.
- Al registrarse, un trigger crea el perfil y una primera obra.

## Estructura

```
src/
  lib/            supabase.ts (cliente) · db.ts (CRUD genérico Supabase/demo) · demoSeed.ts
  context/        AuthContext · ObraContext (obra activa)
  hooks/          useTable (CRUD por obra con updates optimistas)
  components/     ui.tsx (design system pastel) · Layout (sidebar colapsable) · CrudModule (módulos configurables) · Toast
  pages/          Landing · Login (login/registro/recuperar) · ResetPassword
  pages/app/      Seguimiento (Kanban) · Pedidos (nuevo, mis pedidos, cálculos) · Minutas · Resumen · Obras
                  modules.tsx (config de caja chica, jornales, adicionales, manifiesto, fletes, volquetes, seguros, EPP, herramientas)
```

Para agregar un módulo tabular nuevo: crear la tabla en `schema.sql` (agregarla a los arrays del bloque de RLS), sumarla a `TableName`, escribir un `CrudConfig` en `modules.tsx` y registrarlo en `CrudPage.tsx` + `NAV` del Layout.

## Idiomas (ES / EN / PT)

La app usa un i18n propio sin dependencias ([src/i18n](src/i18n)). El **español es el idioma fuente**: el texto en español es la clave.

```tsx
import { t } from '../i18n';
t('Nueva tarea');                         // → "New task" / "Nova tarefa"
t('Te quedan {n} días de prueba gratuita', { n: 3 });
```

- Para un texto nuevo: envolvelo en `t(...)` y agregá la traducción en `src/i18n/en.ts` y `src/i18n/pt.ts`. Si falta, se muestra en español.
- El idioma se detecta del navegador la primera vez y se guarda al cambiarlo con el selector (ES/EN/PT) del encabezado.
- Los datos que carga cada usuario (nombres de obras, conceptos, etc.) no se traducen.

## Tests E2E (Playwright)

La suite corre contra un **build de producción en modo demo** (sin Supabase), con datos de ejemplo aislados por test.

```bash
npx playwright install chromium   # una sola vez
npm run test:e2e                  # corre todo (escritorio + celular)
npm run test:e2e:ui               # interfaz visual para depurar
npm run test:e2e:report           # reporte HTML con capturas, trazas y métricas
```

| Archivo | Qué cubre |
|---|---|
| `e2e/landing.spec.ts` | Landing, secciones, CTA, precios, menú móvil |
| `e2e/auth.spec.ts` | Rutas protegidas, login, registro con rol, `?next`, logout, recuperar contraseña |
| `e2e/jefe.spec.ts` | Kanban, caja chica, cálculos → pedido, obras, CRUD, minutas, seguros, planes |
| `e2e/roles.spec.ts` | Compras (aprobar/rechazar, servicios), Dirección de obra, invitaciones |
| `e2e/security.spec.ts` | XSS, open redirect, secretos en el bundle, headers, análisis estático de RLS |
| `e2e/performance.spec.ts` | LCP, CLS, cambios de ruta, code splitting, tamaño de bundle, CPU lenta |
| `e2e/nonfunctional.spec.ts` | Responsive, accesibilidad (axe WCAG 2.1 AA), idiomas, modo oscuro, robustez |

Las políticas RLS se validan de forma estática sobre `schema.sql`; para probarlas contra la base real hace falta un proyecto de Supabase de prueba.

## Deploy en Vercel

Importá el repo y cargá las variables de entorno. `vercel.json` resuelve el routing SPA. En Supabase → Auth → URL Configuration agregá tu dominio a las Redirect URLs (`/app` y `/reset-password`).
