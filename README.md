# obrabase · Gestión y control de obra

SaaS B2B para **jefes de obra** de estudios de arquitectura: tareas, pedidos, caja chica, jornales, adicionales, manifiesto, minutas, fletes, volquetes, seguros, EPP y herramientas.

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

## Deploy en Vercel

Importá el repo y cargá las variables de entorno. `vercel.json` resuelve el routing SPA. En Supabase → Auth → URL Configuration agregá tu dominio a las Redirect URLs (`/app` y `/reset-password`).
