# 8. Decisiones de arquitectura (ADR)

Formato: contexto → decisión → consecuencias. Estado: ✅ vigente.

---

### ADR-001
**SPA + BaaS (Supabase) sin backend propio** ✅

- **Contexto:** MVP con equipo chico; necesidad de auth, API y base con poco mantenimiento.
- **Decisión:** React SPA en Vercel hablando directo con Supabase (PostgREST + Auth). Lógica sensible en Postgres (RLS, triggers, RPC).
- **Consecuencias:** + Sin servidores que operar, escalado gestionado, deploy en minutos. − La lógica de negocio crítica debe vivir en SQL; integraciones server-side futuras (pagos, emails transaccionales) requerirán Edge Functions.

---

### ADR-002
**Autorización 100 % en la base con RLS** ✅

- **Contexto:** el cliente usa una clave pública; cualquiera puede llamar a la API.
- **Decisión:** RLS en todas las tablas; la UI solo refleja permisos. `anon` sin privilegios.
- **Consecuencias:** + Seguridad independiente del frontend. − Las políticas son más difíciles de testear; mitigado con análisis estático en la suite y pendiente de tests contra staging.

---

### ADR-003
**Multi-tenant por usuario (no por organización)** ✅

- **Contexto:** el requerimiento inicial pedía aislamiento total por usuario (`auth.uid() = user_id`). Un esquema anterior por "estudio" se descartó.
- **Decisión:** cada fila pertenece a un `user_id`. La colaboración se modela con **accesos explícitos** (`obra_accesos`) y no con tenants compartidos.
- **Consecuencias:** + Aislamiento simple y auditable. − Un estudio con varios jefes no tiene una "organización" única: cada jefe invita a sus administrativos. Evolución posible: tabla `estudios` como agrupador.

---

### ADR-004
**`jsonb` para ítems de pedido y acuerdos de minuta** ✅

- **Contexto:** los ítems siempre se leen y escriben con su pedido.
- **Decisión:** columna `items jsonb` (array) en lugar de tabla hija.
- **Consecuencias:** + Escritura atómica, sin joins, RLS más simple. − No se puede consultar/agregar por ítem en SQL de forma eficiente (p. ej. "total de cemento pedido en el mes"); si se necesita, migrar a tabla `pedido_items`.

---

### ADR-005
**Modo demo con la misma interfaz de datos** ✅

- **Contexto:** se necesitaba mostrar el producto y testearlo sin backend.
- **Decisión:** `lib/db.ts` implementa la misma API sobre `localStorage` cuando no hay credenciales; datos de ejemplo en `demoSeed.ts`.
- **Consecuencias:** + Demos comerciales, desarrollo offline y E2E deterministas. − Las reglas de RLS no aplican en demo; algunas (filtros de panel) se emulan en el cliente.

---

### ADR-006
**i18n propio con el español como clave** ✅

- **Contexto:** 3 idiomas, equipo hispanohablante, sin necesidad de pluralización compleja.
- **Decisión:** función global `t('texto en español', vars)` + diccionarios planos; re-montaje del árbol al cambiar idioma.
- **Consecuencias:** + Cero dependencias, código legible, fallback natural. − Cambiar un texto en español rompe su clave en los diccionarios (detectado por el script de cobertura); sin pluralización automática (se usan dos claves).

---

### ADR-007
**Planes sin cobro, aplicados solo en la UI** ✅

- **Contexto:** etapa de lanzamiento; se quiere validar la propuesta antes de integrar pagos.
- **Decisión:** el plan vive en `user_metadata.plan`; la UI oculta secciones (Inicial sin Estudio/Recursos; Equipo solo en Estudio).
- **Consecuencias:** + Sin fricción para probar. − Un usuario técnico puede saltear las restricciones de plan (no las de **rol**, que sí aplica la base). Al activar cobros: mover el plan a una tabla controlada por backend (webhook del procesador de pagos) y aplicar límites en RLS/RPC.

---

### ADR-008
**Roles fijos elegidos en el registro** ✅

- **Contexto:** jefes de obra, compras y dirección necesitan vistas y permisos distintos.
- **Decisión:** `profiles.rol` elegido al registrarse e inmutable (trigger). El rol efectivo sobre una obra compartida se copia al acceso al aceptar la invitación.
- **Consecuencias:** + Evita escalada de privilegios. − Cambiar de rol requiere una cuenta nueva (o intervención de un administrador en la base).

---

### ADR-009
**Componentes propios para menús desplegables** ✅

- **Contexto:** el `<select>` nativo se veía desalineado con el diseño (blanco plano, sin modo oscuro).
- **Decisión:** `Select` propio con patrón *listbox*, portal y soporte de teclado.
- **Consecuencias:** + Coherencia visual y accesibilidad controlada. − Más código a mantener que el control nativo.

---

### ADR-010
**Tests E2E contra build demo** ✅

- **Decisión:** Playwright sobre `vite build --mode demo` + `vite preview`.
- **Consecuencias:** + Prueba el artefacto real de producción, sin flakiness de red. − No cubre la integración con Supabase (Auth real, RLS): requiere un entorno de staging.
