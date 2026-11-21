# 9. Operación, limitaciones y roadmap

## 9.1 Operación

| Tema | Dónde mirar |
|---|---|
| Estado del sitio y deploys | Vercel → *Deployments* (logs de build) |
| Errores de API / Auth | Supabase → *Logs* (API, Auth, Postgres) |
| Uso y cuotas | Supabase → *Usage* (base, egress, MAU, emails) |
| Usuarios | Supabase → *Authentication → Users* |
| Backups | Supabase → *Database → Backups* (diarios en planes pagos) |

### Problemas frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| `403 permission denied for table X` (42501) | Faltan `GRANT` para `authenticated` | Re-ejecutar la sección de permisos de `schema.sql` |
| "Demasiados intentos" al registrarse | Límite de emails del SMTP por defecto (`over_email_send_rate_limit`) | SMTP propio o desactivar *Confirm email* |
| El link del email abre otro dominio (404) | *Site URL* / *Redirect URLs* mal configuradas | Configurar `https://jefeobra.vercel.app/**` |
| "Email logins are disabled" | Se apagó el proveedor Email completo | Encender *Enable Email provider* |
| Panel de gestión vacío para Compras | Migraciones 002/003 sin ejecutar o invitación no aceptada | Ejecutar migraciones; revisar `obra_accesos` |
| Una cuenta quedó con el rol equivocado | El rol es inmutable | Crear cuenta nueva con el rol correcto |

## 9.2 Limitaciones conocidas

| # | Limitación | Impacto | Mitigación / plan |
|---|---|---|---|
| L1 | Planes no se cobran ni se aplican en backend | Restricciones de plan evitables por usuarios técnicos | ADR-007: tabla de suscripciones + webhook de pagos |
| L2 | Link de invitación usable por cualquiera que lo tenga (una vez) | Riesgo si se filtra | Revocación; futuro: vincular al email y verificarlo, expiración |
| L3 | Sin pruebas de RLS contra base real | Una regresión de políticas podría pasar los tests | Proyecto Supabase de staging + tests por rol |
| L4 | Sin prueba de carga | Capacidad de usuarios simultáneos no medida | k6 contra staging (escenarios por rol, escalones 10→200 VU) |
| L5 | Sin adjuntos (fotos, PDF) | Remitos y planos solo como texto | Supabase Storage con políticas por obra |
| L6 | Sin notificaciones | Compras debe entrar a ver pendientes | Emails transaccionales / Realtime |
| L7 | JS inicial cerca del presupuesto (231/260 KB) | Margen chico al crecer | Separar `supabase-js` y `framer-motion` en chunks; lazy de Login |
| L8 | Cambio de rol requiere cuenta nueva | Fricción operativa | Panel de administración interno |
| L9 | Límite de obras por plan no aplicado | Inicial puede crear más de 1 obra | Validar en RPC/trigger al activar cobros |

## 9.3 Deuda técnica

- `pedidos_miembro_solo_estado()` (migración 002) quedó sin uso tras la 003; eliminar en una migración de limpieza.
- `es_miembro_de_obra()` reemplazada por `rol_en_obra()`; eliminar.
- Unificar lógica de cálculo de saldo (repetida en Resumen, Caja chica y Panel) en `lib/`.
- Las etiquetas de estado de fletes/volquetes están duplicadas entre `modules.tsx` y `PanelEstudio.tsx`.
- Agregar CI (GitHub Actions) que corra `build` + `test:e2e` en cada PR.

## 9.4 Roadmap propuesto

| Prioridad | Iniciativa | Valor |
|---|---|---|
| Alta | CI con GitHub Actions (build + E2E en cada PR) | Evita regresiones antes del merge |
| Alta | Staging de Supabase + tests de RLS por rol + prueba de carga (k6) | Confianza en seguridad y capacidad |
| Alta | Dominio propio + SMTP (Resend) + confirmación de email | Entregabilidad y cuentas verificadas |
| Media | Cobro de suscripciones (Mercado Pago / Stripe) y límites de plan en backend | Monetización |
| Media | Adjuntos con Supabase Storage (fotos de obra, remitos, planos) | Trazabilidad documental |
| Media | Notificaciones (pedido nuevo → Compras; aprobado/rechazado → jefe) | Menos fricción operativa |
| Media | Estado "Rechazado" y flujo de solicitud para fletes/volquetes | Aprobación explícita de servicios |
| Baja | Exportar a Excel/PDF (caja chica, jornales, pedidos) | Reportes para el estudio |
| Baja | PWA instalable con modo offline para la obra | Uso con mala conectividad |
| Baja | Entidad `estudio` para agrupar jefes y administrativos | Gestión de equipos grandes |
