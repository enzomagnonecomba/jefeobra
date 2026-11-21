# 5. Frontend: estructura y guías

## 5.1 Estructura de carpetas

```
src/
├── main.tsx                 Providers y montaje
├── App.tsx                  Rutas (lazy + Suspense)
├── index.css                Tokens de diseño (@theme), modo oscuro, clases .field/.label
├── components/
│   ├── ui.tsx               Design system: Button, Card, Badge, Modal, StatCard, Segmented, PageHeader, formatos
│   ├── CrudModule.tsx       Módulo tabular configurable (tabla en desktop, tarjetas en móvil)
│   ├── Select.tsx           Menú desplegable accesible (listbox en portal)
│   ├── Layout.tsx           Sidebar por rol/plan, encabezado, guardas, transición de rutas
│   ├── UserMenu.tsx         Menú de cuenta
│   ├── Pricing.tsx          Tarjetas de planes (landing y /app/planes)
│   ├── LangSwitcher.tsx · ThemeToggle.tsx · Toast.tsx · Logo.tsx · RequireAuth.tsx
├── context/                 AuthContext (sesión, rol) · ObraContext (obra activa) · ThemeContext
├── hooks/useTable.ts        CRUD por obra con updates optimistas
├── i18n/                    t(), I18nProvider, diccionarios en.ts / pt.ts
├── lib/
│   ├── supabase.ts          Cliente; hasSupabase (modo demo si no hay credenciales)
│   ├── db.ts                list / listIn / insert / update / remove (+ implementación demo)
│   ├── estudio.ts           Invitaciones, accesos y datos del Panel de gestión
│   ├── roles.ts · planes.ts Dominio: roles, planes, prueba gratuita
│   └── demoSeed.ts          Datos de ejemplo del modo demo
├── pages/                   Landing · Login · ResetPassword · Invitacion
│   └── app/                 Resumen · Seguimiento · Pedidos · Minutas · Obras · Planes · Equipo · PanelEstudio · CrudPage · modules.tsx
└── types/index.ts           Tipos de dominio y estados
```

## 5.2 Design system

### Tokens (`index.css`)

| Token | Claro | Uso |
|---|---|---|
| `bone` | `#FAF9F6` | Fondo |
| `white` | `#FFFFFF` | Superficies |
| `line` | `#E2E8F0` | Bordes |
| `ink` / `muted` | `#1F2937` / `#64748B` | Texto principal / secundario |
| `sage(-bg)` | `#065F46` / `#D1FAE5` | Completado, aprobado |
| `lilac(-bg)` | `#5B21B6` / `#EDE9FE` | Gestión, planos |
| `peach(-bg)` | `#9A3412` / `#FFEDD5` | Alertas, pendientes |
| `sky(-bg)` | `#075985` / `#E0F2FE` | En curso, logística |
| `rose(-bg)` | `#9D174D` / `#FCE7F3` | Gastos, adicionales |

**Modo oscuro:** `:root.dark` redefine estos tokens y la escala `slate`/`white` de Tailwind (que en v4 son variables CSS). Así no hay que duplicar clases `dark:` en cada componente. La clase `dark` la aplica un script inline en `index.html` antes del primer render (sin destello).

Tipografía: *Plus Jakarta Sans*. En móvil los `.field` usan 16 px para evitar el zoom de iOS.

### Componentes base

| Componente | Notas |
|---|---|
| `Button` | Variantes `primary`, `soft`, `ghost`, `danger`; micro-animaciones de hover/tap. |
| `Modal` | `role=dialog` con nombre; hoja inferior en móvil con `safe-area`. |
| `Select` | `role=listbox`, teclado (flechas, Enter, Esc, Inicio/Fin, búsqueda por tipeo), portal con posición fija (no lo recortan modales), se abre hacia arriba si no hay lugar. El nombre accesible incluye el valor visible (WCAG 2.5.3). Variantes `field`, `pill`, `ghost`. |
| `StatCard`, `Badge`, `Segmented`, `PageHeader`, `EmptyState` | Bloques del dashboard. |

## 5.3 Módulos configurables (`CrudModule`)

Nueve módulos (caja chica, jornales, adicionales, manifiesto, fletes, volquetes, seguros, EPP, herramientas) se declaran como **configuración** en `pages/app/modules.tsx`:

```ts
export const fletesConfig: CrudConfig<R> = {
  table: 'fletes', title: 'Fletes', subtitle: 'Agenda de transportes y envíos', singular: 'Flete',
  icon: Truck, tone: 'sky', orderBy: 'fecha', statusKey: 'estado', searchKeys: ['origen', 'destino'],
  fields: [ { key: 'origen', label: 'Origen', type: 'text', required: true }, /* … */ ],
  columns: [ { key: 'fecha', label: 'Fecha' }, { key: 'estado', label: 'Estado' }, /* … */ ],
  summary: (rows) => <MisKpis rows={rows} />,   // opcional
  rowAccent: (r) => (vence(r) ? 'peach' : null), // opcional
};
```

`CrudModule` provee: búsqueda, filtros por estado con contadores, cambio de estado inline, alta/edición en modal, confirmación de borrado, tabla en desktop y **tarjetas en móvil**, traducción de todas las etiquetas.

### Cómo agregar un módulo nuevo

1. Crear la tabla en `supabase/schema.sql` (con `user_id`, `obra_id`, timestamps) y agregarla a los arrays del bloque de triggers/RLS. Crear la migración correspondiente.
2. Agregar el nombre a `TableName` en `types/index.ts`.
3. Escribir el `CrudConfig` en `modules.tsx`.
4. Registrarlo en `CONFIGS` de `CrudPage.tsx` y en `NAV` de `Layout.tsx`.
5. Agregar los textos nuevos a `i18n/en.ts` y `i18n/pt.ts`.
6. Agregar datos de ejemplo en `demoSeed.ts` y un test en `e2e/`.

## 5.4 Internacionalización

```tsx
import { t } from '../i18n';
t('Nueva tarea');                                 // "New task" · "Nova tarefa"
t('Te quedan {n} días de prueba gratuita', { n }); // interpolación
```

- Etiquetas en objetos de configuración: se traducen al renderizar (`t(c.label)`) o con *getters* (`get label() { return t('Pendiente') }`).
- Los datos cargados por usuarios no se traducen.
- Para verificar cobertura, los tests de i18n comparan el menú en EN/PT contra el español.

## 5.5 Responsive

| Breakpoint | Comportamiento clave |
|---|---|
| < 640 px | Encabezado compacto (obra + idioma + cuenta); tablas → tarjetas; Kanban deslizable por columna (scroll-snap); filtros en una línea con scroll; modales como hoja inferior. |
| ≥ 768 px (`md`) | Tablas visibles. |
| ≥ 1024 px (`lg`) | Sidebar fijo y colapsable. |
| ≥ 1280 px (`xl`) | Kanban con las 4 columnas visibles. |

Reglas globales: `.grid > * { min-width: 0 }` y `body { overflow-x: clip }`.

## 5.6 Convenciones de código

- TypeScript `strict`. Sin `any` salvo en configs de módulos (`R = Row & Record<string, any>`).
- Componentes funcionales; un archivo por página; helpers de dominio en `lib/`.
- Comentarios en español explicando el **porqué**.
- Textos visibles siempre con `t()`; el español es la clave.
- Sin `dangerouslySetInnerHTML`.
- Accesibilidad: botones con nombre, `aria-*` en menús, foco visible.
