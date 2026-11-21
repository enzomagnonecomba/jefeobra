# 1. Visión, alcance y requerimientos

## 1.1 Problema

La operativa diaria de una obra se gestiona con cuadernos, audios de WhatsApp y planillas sueltas. El estudio de arquitectura pierde trazabilidad sobre **qué se pidió, qué se gastó y qué falta**, y el jefe de obra pierde tiempo respondiendo llamadas.

## 1.2 Visión

Centralizar en una sola herramienta, usable desde el celular en la obra, la operativa del jefe de obra (tareas, pedidos, caja chica, personal, servicios, documentación) y darle al estudio visibilidad en tiempo real sin depender de llamadas.

## 1.3 Actores y roles

| Rol | Quién es | Cómo llega | Alcance |
|---|---|---|---|
| **Jefe de obra** (`jefe_obra`) | Responsable de la obra en sitio | Se registra eligiendo el rol | Todas sus obras y módulos. Invita a otros (plan Estudio). |
| **Compras** (`compras`) | Administrativo del estudio | Se registra y acepta un link de invitación **o escribe el ID de la obra** | Obras compartidas: ve resumen, **aprueba/rechaza pedidos**, **cambia estado** de fletes y volquetes. Nada más. |
| **Dirección de obra** (`direccion_obra`) | Arquitecto / director del estudio | Se registra y acepta un link de invitación **o escribe el ID de la obra** | Obras compartidas: **solo el resumen de tareas** (lectura). |
| **Visitante** | Cualquiera | Landing pública | Landing, planes, registro. |

## 1.4 Alcance funcional

### Público
- Landing con propuesta de valor, "Qué hacemos", "Quiénes somos" y **Planes** (Inicial / Profesional / Estudio, prueba gratuita de 7 días).
- Registro con elección de rol, login, recuperación de contraseña.

### Jefe de obra (por obra activa)

| Sección | Módulo | Capacidades |
|---|---|---|
| Seguimiento | Tablero Kanban | 4 columnas (Por comenzar, En curso, En pausa, Terminada), alta rápida, prioridad, fecha límite, etiquetas, drag & drop y botones de mover. |
| Pedidos | Nuevo pedido | Ítems dinámicos (descripción, cantidad, unidad), prioridad, proveedor, fecha requerida. |
| | Mis pedidos | Historial con filtros por estado, detalle y duplicado. Estados: pendiente, aprobado, en camino, entregado, rechazado. |
| | Cálculos | Superficie, hormigón (con cemento/arena/piedra), ladrillos por m², desperdicio. Envío directo a un nuevo pedido. |
| Obra | Resumen | KPIs: saldo de caja, pedidos activos, avance de tareas, adicionales, alertas de seguros, últimos movimientos. |
| | Caja chica | Ingresos/egresos con categoría; saldo = presupuesto de la obra + ingresos − egresos. |
| | Jornales | Asistencia, horas, tarifa, costo de mano de obra. |
| | Adicionales | Trabajos extra con costo y estado de aprobación. |
| | Manifiesto | Entrada/salida de planos, remitos y documentación. |
| | Minutas | Actas con asistentes, temas y acuerdos con responsable y fecha; imprimibles. |
| Servicios | Fletes · Volquetes · Seguros | Agenda y estados; alertas de retiro y de vencimiento de pólizas (≤ 30 días). |
| Recursos | EPP · Herramientas | Entregas por operario con recambio; inventario y asignación. |
| Estudio | Equipo | Invitaciones por link y **ID de obra** (plan Estudio): copiar, regenerar, activar/desactivar; revocación y rol de cada conectado. |
| | Panel de gestión | Vista de obras compartidas (para roles invitados). |
| Cuenta | Mis obras · Planes | Alta/edición de obras y presupuesto; selección de plan y días de prueba. |

### Roles invitados
- **Compras**: Panel de gestión con pestañas *Pedidos* (aprobar / rechazar / avanzar estado), *Servicios* (estado de fletes y volquetes) y *Obras* (resumen en solo lectura).
- **Dirección de obra**: Resumen de tareas por obra (estado del tablero y tareas por columna, solo lectura).

## 1.5 Planes

| Plan | USD/mes | Incluye |
|---|---|---|
| Inicial | 12 | 1 obra, tareas, pedidos, caja chica, jornales, cálculos. **Sin** Estudio ni Recursos. |
| Profesional | 29 | Hasta 5 obras, adicionales, minutas, manifiesto, servicios con alertas. |
| Estudio | 59 | Obras ilimitadas, EPP y herramientas, **panel de gestión para el estudio**. |

> Anual: 2 meses gratis. Los planes **no se cobran todavía**: el plan elegido se guarda en los metadatos del usuario y solo condiciona la UI (ver [ADR-007](08-decisiones.md#adr-007)).

## 1.6 Requerimientos no funcionales

| ID | Requerimiento | Cómo se verifica |
|---|---|---|
| RNF-01 | **Aislamiento de datos**: ningún usuario accede a datos de otro salvo por invitación explícita. | RLS en Postgres + tests estáticos de `schema.sql` ([§4](04-seguridad.md)). |
| RNF-02 | **Mobile first**: usable en 375 px sin scroll horizontal. | Tests responsive a 375/768/1280 px. |
| RNF-03 | **Rendimiento**: LCP < 2,5 s, CLS < 0,1, JS inicial < 260 KB gzip. | `e2e/performance.spec.ts`. |
| RNF-04 | **Accesibilidad**: WCAG 2.1 AA sin violaciones graves. | axe-core en 10 pantallas. |
| RNF-05 | **i18n**: ES / EN / PT con detección automática. | Tests de traducción del menú y landing. |
| RNF-06 | **Tema claro/oscuro** sin destello al cargar. | Test de clase `dark` en `readyState=interactive`. |
| RNF-07 | **Disponibilidad**: hosting estático en CDN; backend gestionado (Supabase). | SLA de proveedores. |
| RNF-08 | **Privacidad**: sin acceso anónimo a datos; secretos fuera del bundle. | Tests de seguridad del build. |

## 1.7 Fuera de alcance (por ahora)

- Cobro de suscripciones y límites de plan aplicados en el backend.
- Notificaciones (email/push) y tiempo real.
- Adjuntos/archivos (fotos, PDF de remitos).
- Exportación a Excel/PDF (salvo impresión de minutas).
- App nativa (la web es responsive / instalable).
