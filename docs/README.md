# Documentación técnica · obrabase

> SaaS B2B de gestión y control de obra para jefes de obra y estudios de arquitectura.
> Producción: <https://jefeobra.vercel.app> · Repositorio: `enzomagnonecomba/jefeobra`

| | |
|---|---|
| **Estado** | MVP en producción (planes sin cobro activo) |
| **Stack** | React 19 · TypeScript 5.8 · Vite 6 · Tailwind CSS 4 · Framer Motion · Supabase (Postgres + Auth + RLS) · Vercel |
| **Idiomas de UI** | Español (fuente) · Inglés · Portugués (BR) |
| **Tamaño** | ~6.300 líneas TS/TSX · 25 rutas · 16 tablas · 97 tests E2E |
| **Última revisión** | Noviembre 2026 |

## Índice

| # | Documento | Para quién |
|---|---|---|
| 1 | [Visión, alcance y requerimientos](01-vision-y-alcance.md) | Producto, negocio, nuevos integrantes |
| 2 | [Arquitectura](02-arquitectura.md) | Desarrolladores |
| 3 | [Modelo de datos](03-modelo-de-datos.md) | Backend, datos |
| 4 | [Seguridad y control de acceso](04-seguridad.md) | Desarrolladores, auditoría |
| 5 | [Frontend: estructura y guías](05-frontend.md) | Desarrolladores frontend |
| 6 | [Entorno, desarrollo y despliegue](06-desarrollo-y-despliegue.md) | Desarrolladores, DevOps |
| 7 | [Testing y calidad](07-testing-y-calidad.md) | QA, desarrolladores |
| 8 | [Decisiones de arquitectura (ADR)](08-decisiones.md) | Arquitectura, mantenimiento |
| 9 | [Operación, limitaciones y roadmap](09-operacion-y-roadmap.md) | Producto, mantenimiento |

## Glosario

| Término | Significado |
|---|---|
| **Obra** | Proyecto de construcción. Unidad de organización de todos los datos operativos. |
| **Jefe de obra** | Rol dueño de las obras; usa la app completa. |
| **Compras** | Rol invitado; aprueba/rechaza pedidos y gestiona el estado de fletes y volquetes. |
| **Dirección de obra** | Rol invitado; solo ve el resumen de tareas. |
| **Caja chica** | Fondo para gastos menores de obra. Saldo = presupuesto + ingresos − egresos. |
| **Jornal** | Registro de asistencia y horas de un trabajador en un día. |
| **Adicional** | Trabajo fuera del presupuesto original, con estado de aprobación. |
| **Manifiesto** | Registro de entrada/salida de documentación, planos y remitos. |
| **Minuta** | Acta de reunión de obra con asistentes, temas y acuerdos. |
| **Volquete** | Contenedor de escombros alquilado (entrega, recambio, retiro). |
| **EPP** | Elementos de protección personal entregados a operarios. |
| **ID de obra** | Código corto (ej. `K7Q2-X9MD`) con el que Compras o Dirección de obra se suman a una obra. |
| **RLS** | Row Level Security de PostgreSQL: filtrado de filas por usuario aplicado por la base. |
| **Modo demo** | Ejecución sin Supabase; los datos viven en `localStorage` del navegador. |
