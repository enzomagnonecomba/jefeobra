-- =====================================================================
--  JEFE DE OBRA · Esquema Supabase (PostgreSQL)
--  Modelo multi-tenant POR USUARIO: cada fila pertenece a auth.uid().
--  Ningún usuario puede ver, crear, editar ni borrar datos de otro.
--
--  Ejecutar completo en el SQL Editor de Supabase. Es idempotente.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
--  (Opcional) RESET completo: borra todas las tablas de la app.
--  Descomentar solo si necesitás empezar de cero. Borra todos los datos.
-- ---------------------------------------------------------------------
-- drop table if exists tareas, pedidos, caja_movimientos, jornales, adicionales,
--   manifiestos, minutas, servicios_fletes, servicios_volquetes, seguros,
--   epp_entregas, inventario_items, fletes, volquetes, herramientas,
--   obras, profiles, estudios cascade;
-- drop function if exists public.puede_ver_obra(uuid);
-- drop function if exists public.user_estudio_id();

-- =====================================================================
--  PERFIL (1:1 con auth.users)
-- =====================================================================
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nombre      text,
  estudio     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- =====================================================================
--  OBRAS (espacio de trabajo del usuario)
-- =====================================================================
create table if not exists obras (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre      text not null,
  direccion   text,
  estado      text not null default 'activa' check (estado in ('activa','pausada','finalizada')),
  presupuesto_caja numeric(14,2) not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists obras_user_idx on obras(user_id);


-- =====================================================================
--  SEGUIMIENTO (Kanban)
-- =====================================================================
create table if not exists tareas (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  obra_id      uuid not null references obras(id) on delete cascade,
  titulo       text not null,
  descripcion  text,
  prioridad    text not null default 'media' check (prioridad in ('baja','media','alta','critica')),
  fecha_limite date,
  etiquetas    text[] not null default '{}',
  estado       text not null default 'por_comenzar'
               check (estado in ('por_comenzar','en_curso','en_pausa','terminada')),
  orden        double precision not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- =====================================================================
--  PEDIDOS  (ítems dinámicos en jsonb: [{descripcion, cantidad, unidad}])
-- =====================================================================
create table if not exists pedidos (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  obra_id         uuid not null references obras(id) on delete cascade,
  titulo          text not null,
  proveedor       text,
  prioridad       text not null default 'media' check (prioridad in ('baja','media','alta','critica')),
  fecha_requerida date,
  notas           text,
  items           jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  estado          text not null default 'pendiente'
                  check (estado in ('pendiente','aprobado','en_camino','entregado')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- =====================================================================
--  OBRA
-- =====================================================================
create table if not exists caja_movimientos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  obra_id     uuid not null references obras(id) on delete cascade,
  fecha       date not null default current_date,
  tipo        text not null check (tipo in ('ingreso','egreso')),
  categoria   text not null default 'varios',
  concepto    text not null,
  monto       numeric(14,2) not null check (monto > 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists jornales (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  obra_id     uuid not null references obras(id) on delete cascade,
  fecha       date not null default current_date,
  trabajador  text not null,
  categoria   text not null default 'oficial' check (categoria in ('oficial','medio_oficial','ayudante','subcontratista')),
  asistencia  text not null default 'presente' check (asistencia in ('presente','ausente','media_jornada')),
  horas       numeric(5,2) not null default 8 check (horas >= 0 and horas <= 24),
  tarifa_hora numeric(14,2) not null default 0 check (tarifa_hora >= 0),
  observacion text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists adicionales (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  obra_id        uuid not null references obras(id) on delete cascade,
  fecha          date not null default current_date,
  descripcion    text not null,
  motivo         text,
  costo_estimado numeric(14,2) not null default 0 check (costo_estimado >= 0),
  estado         text not null default 'propuesto' check (estado in ('propuesto','aprobado','rechazado')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists manifiestos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  obra_id      uuid not null references obras(id) on delete cascade,
  fecha        date not null default current_date,
  movimiento   text not null check (movimiento in ('entrada','salida')),
  tipo         text not null check (tipo in ('plano','remito','documentacion','otro')),
  descripcion  text not null,
  referencia   text,
  responsable  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- acuerdos: [{texto, responsable, fecha}]
create table if not exists minutas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  obra_id     uuid not null references obras(id) on delete cascade,
  fecha       date not null default current_date,
  titulo      text not null,
  asistentes  text[] not null default '{}',
  temas       text,
  acuerdos    jsonb not null default '[]'::jsonb check (jsonb_typeof(acuerdos) = 'array'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- =====================================================================
--  SERVICIOS
-- =====================================================================
create table if not exists fletes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  obra_id       uuid not null references obras(id) on delete cascade,
  fecha         date not null default current_date,
  origen        text not null,
  destino       text not null,
  carga         text,
  transportista text,
  costo         numeric(14,2) not null default 0 check (costo >= 0),
  estado        text not null default 'programado' check (estado in ('programado','en_transito','realizado','cancelado')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists volquetes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  obra_id       uuid not null references obras(id) on delete cascade,
  empresa       text not null,
  numero        text,
  fecha_entrega date,
  fecha_retiro  date,
  costo         numeric(14,2) not null default 0 check (costo >= 0),
  estado        text not null default 'solicitado' check (estado in ('solicitado','en_obra','recambio','retirado')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists seguros (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  obra_id        uuid not null references obras(id) on delete cascade,
  tipo           text not null check (tipo in ('art','responsabilidad_civil','seguro_tecnico','otro')),
  aseguradora    text not null,
  poliza         text,
  vigencia_desde date,
  vigencia_hasta date not null,
  suma_asegurada numeric(14,2) not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (vigencia_desde is null or vigencia_hasta >= vigencia_desde)
);

-- =====================================================================
--  RECURSOS
-- =====================================================================
create table if not exists epp_entregas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  obra_id     uuid not null references obras(id) on delete cascade,
  fecha       date not null default current_date,
  operario    text not null,
  elemento    text not null,
  talle       text,
  cantidad    int not null default 1 check (cantidad > 0),
  proximo_recambio date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists herramientas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  obra_id     uuid not null references obras(id) on delete cascade,
  nombre      text not null,
  categoria   text,
  cantidad    int not null default 1 check (cantidad >= 0),
  asignado_a  text,
  estado      text not null default 'operativa' check (estado in ('operativa','en_reparacion','baja')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- =====================================================================
--  ÍNDICES, TRIGGERS Y RLS (en bloque para todas las tablas operativas)
-- =====================================================================
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at := now(); return new; end $$;

-- Impide que un UPDATE cambie el dueño de una fila.
create or replace function public.lock_user_id() returns trigger
language plpgsql as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'user_id no puede modificarse';
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles','obras','tareas','pedidos','caja_movimientos','jornales',
    'adicionales','manifiestos','minutas','fletes','volquetes','seguros','epp_entregas','herramientas'] loop
    execute format('drop trigger if exists trg_updated_at on %I', t);
    execute format('create trigger trg_updated_at before update on %I
                    for each row execute function public.set_updated_at()', t);
  end loop;

  foreach t in array array['obras','tareas','pedidos','caja_movimientos','jornales',
    'adicionales','manifiestos','minutas','fletes','volquetes','seguros','epp_entregas','herramientas'] loop
    execute format('drop trigger if exists trg_lock_user on %I', t);
    execute format('create trigger trg_lock_user before update on %I
                    for each row execute function public.lock_user_id()', t);
  end loop;

  -- Tablas que cuelgan de una obra: índice + RLS que además exige que la
  -- obra referenciada pertenezca al mismo usuario.
  foreach t in array array['tareas','pedidos','caja_movimientos','jornales','adicionales',
    'manifiestos','minutas','fletes','volquetes','seguros','epp_entregas','herramientas'] loop
    execute format('create index if not exists %I on %I(user_id, obra_id)', t || '_user_obra_idx', t);
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "owner_select" on %I', t);
    execute format('drop policy if exists "owner_insert" on %I', t);
    execute format('drop policy if exists "owner_update" on %I', t);
    execute format('drop policy if exists "owner_delete" on %I', t);
    execute format('create policy "owner_select" on %I for select to authenticated
                    using ((select auth.uid()) = user_id)', t);
    execute format('create policy "owner_insert" on %I for insert to authenticated
                    with check ((select auth.uid()) = user_id
                      and exists (select 1 from obras o where o.id = obra_id and o.user_id = (select auth.uid())))', t);
    execute format('create policy "owner_update" on %I for update to authenticated
                    using ((select auth.uid()) = user_id)
                    with check ((select auth.uid()) = user_id
                      and exists (select 1 from obras o where o.id = obra_id and o.user_id = (select auth.uid())))', t);
    execute format('create policy "owner_delete" on %I for delete to authenticated
                    using ((select auth.uid()) = user_id)', t);
  end loop;
end $$;

-- RLS de OBRAS
alter table obras enable row level security;
drop policy if exists "owner_all" on obras;
create policy "owner_all" on obras for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- RLS de PROFILES
alter table profiles enable row level security;
drop policy if exists "profile_own" on profiles;
create policy "profile_own" on profiles for all to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Permisos de tabla: RLS filtra filas, pero el rol primero necesita el GRANT.
-- Los usuarios logueados (authenticated) operan; los anónimos no ven nada.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
revoke all on all tables in schema public from anon;

-- =====================================================================
--  ALTA AUTOMÁTICA: perfil + primera obra al registrarse
-- =====================================================================
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, nombre, estudio)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
          new.raw_user_meta_data->>'estudio')
  on conflict (id) do nothing;

  insert into obras (user_id, nombre, direccion)
  values (new.id, 'Mi primera obra', null);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
--  Panel de gestión del estudio (plan Estudio)
--
--  El jefe de obra invita a administrativos del estudio con un link.
--  El administrativo, al aceptar, puede:
--    · VER las obras compartidas, su resumen (tareas, caja chica, seguros,
--      adicionales) y sus pedidos.
--    · CAMBIAR SOLO EL ESTADO de los pedidos (aprobar, en camino, entregado).
--  No puede crear, editar ni borrar nada más. Todo se aplica con RLS.
--
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
--  ACCESOS / INVITACIONES
--  obra_id NULL = acceso a TODAS las obras del jefe (incluidas futuras).
-- ---------------------------------------------------------------------
create table if not exists obra_accesos (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  obra_id     uuid references obras(id) on delete cascade,
  member_id   uuid references auth.users(id) on delete cascade,
  nombre      text,
  email       text,
  rol         text not null default 'administrativo' check (rol in ('administrativo')),
  token       text not null unique default encode(gen_random_bytes(18), 'hex'),
  estado      text not null default 'pendiente' check (estado in ('pendiente', 'activo')),
  created_at  timestamptz not null default now(),
  accepted_at timestamptz,
  check (member_id is null or member_id <> owner_id)
);
create index if not exists obra_accesos_owner_idx on obra_accesos(owner_id);
create index if not exists obra_accesos_member_idx on obra_accesos(member_id) where member_id is not null;

alter table obra_accesos enable row level security;

drop policy if exists "owner_select" on obra_accesos;
drop policy if exists "owner_insert" on obra_accesos;
drop policy if exists "owner_delete" on obra_accesos;
drop policy if exists "member_select" on obra_accesos;
drop policy if exists "member_delete" on obra_accesos;

-- El jefe ve, crea y revoca sus invitaciones.
create policy "owner_select" on obra_accesos for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy "owner_insert" on obra_accesos for insert to authenticated
  with check (
    (select auth.uid()) = owner_id
    and member_id is null and estado = 'pendiente'
    and (obra_id is null or exists (select 1 from obras o where o.id = obra_id and o.user_id = (select auth.uid())))
  );
create policy "owner_delete" on obra_accesos for delete to authenticated
  using ((select auth.uid()) = owner_id);

-- El administrativo ve sus accesos y puede salir (borrar el suyo).
create policy "member_select" on obra_accesos for select to authenticated
  using ((select auth.uid()) = member_id);
create policy "member_delete" on obra_accesos for delete to authenticated
  using ((select auth.uid()) = member_id);

-- Sin UPDATE directo: aceptar una invitación solo se hace vía RPC.
grant select, insert, delete on obra_accesos to authenticated;
revoke update on obra_accesos from authenticated;
revoke all on obra_accesos from anon;

-- ---------------------------------------------------------------------
--  HELPERS (security definer: evitan recursión entre políticas)
-- ---------------------------------------------------------------------
create or replace function public.es_miembro_de_obra(p_obra uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from obra_accesos a
    join obras o on o.id = p_obra
    where a.member_id = auth.uid()
      and a.estado = 'activo'
      and a.owner_id = o.user_id
      and (a.obra_id is null or a.obra_id = p_obra)
  )
$$;
revoke all on function public.es_miembro_de_obra(uuid) from public, anon;
grant execute on function public.es_miembro_de_obra(uuid) to authenticated;

-- ---------------------------------------------------------------------
--  LECTURA COMPARTIDA (se suma a las políticas del dueño con OR)
-- ---------------------------------------------------------------------
drop policy if exists "miembro_select" on obras;
create policy "miembro_select" on obras for select to authenticated
  using (public.es_miembro_de_obra(id));

do $$
declare t text;
begin
  foreach t in array array['pedidos', 'tareas', 'caja_movimientos', 'seguros', 'adicionales'] loop
    execute format('drop policy if exists "miembro_select" on %I', t);
    execute format('create policy "miembro_select" on %I for select to authenticated
                    using (public.es_miembro_de_obra(obra_id))', t);
  end loop;
end $$;

-- Perfil del jefe visible para sus administrativos (nombre / estudio).
drop policy if exists "miembro_ve_owner" on profiles;
create policy "miembro_ve_owner" on profiles for select to authenticated
  using (exists (
    select 1 from obra_accesos a
    where a.owner_id = profiles.id and a.member_id = (select auth.uid()) and a.estado = 'activo'
  ));

-- ---------------------------------------------------------------------
--  PEDIDOS: el administrativo solo puede cambiar el ESTADO
-- ---------------------------------------------------------------------
drop policy if exists "miembro_update" on pedidos;
create policy "miembro_update" on pedidos for update to authenticated
  using (public.es_miembro_de_obra(obra_id))
  with check (public.es_miembro_de_obra(obra_id));

create or replace function public.pedidos_miembro_solo_estado() returns trigger
language plpgsql as $$
begin
  if auth.uid() is not null and old.user_id is distinct from auth.uid() then
    if (to_jsonb(new) - 'estado' - 'updated_at') is distinct from (to_jsonb(old) - 'estado' - 'updated_at') then
      raise exception 'Solo se puede cambiar el estado del pedido';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_miembro_estado on pedidos;
create trigger trg_miembro_estado before update on pedidos
  for each row execute function public.pedidos_miembro_solo_estado();

-- ---------------------------------------------------------------------
--  RPC: ver y aceptar una invitación por token
-- ---------------------------------------------------------------------
create or replace function public.ver_invitacion(p_token text)
returns table (id uuid, owner_nombre text, owner_estudio text, obra_nombre text, todas boolean, estado text, es_propia boolean, es_mia boolean)
language sql stable security definer set search_path = public as $$
  select a.id, p.nombre, p.estudio, o.nombre, a.obra_id is null, a.estado,
         a.owner_id = auth.uid(), a.member_id = auth.uid()
  from obra_accesos a
  left join profiles p on p.id = a.owner_id
  left join obras o on o.id = a.obra_id
  where a.token = p_token and auth.uid() is not null
$$;

create or replace function public.aceptar_invitacion(p_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v obra_accesos;
  v_email text;
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  select * into v from obra_accesos where token = p_token for update;
  if not found then raise exception 'invitacion_invalida'; end if;
  if v.owner_id = auth.uid() then raise exception 'invitacion_propia'; end if;
  if v.estado = 'activo' then
    if v.member_id = auth.uid() then return v.id; end if;
    raise exception 'invitacion_usada';
  end if;

  select email into v_email from auth.users where id = auth.uid();
  update obra_accesos
     set member_id = auth.uid(), estado = 'activo', accepted_at = now(),
         email = coalesce(email, v_email),
         nombre = coalesce(nombre, (select nombre from profiles where profiles.id = auth.uid()))
   where obra_accesos.id = v.id;
  return v.id;
end $$;

revoke all on function public.ver_invitacion(text) from public, anon;
revoke all on function public.aceptar_invitacion(text) from public, anon;
grant execute on function public.ver_invitacion(text) to authenticated;
grant execute on function public.aceptar_invitacion(text) to authenticated;

-- =====================================================================
--  Roles de usuario
--
--  Cada cuenta elige un rol al registrarse:
--    · jefe_obra       → usa toda la app con sus obras (como hasta ahora).
--    · compras         → (invitado por un jefe) ve sus obras en el Panel de
--                        gestión: aprueba / rechaza pedidos y cambia el estado
--                        de fletes y volquetes. No puede editar nada más.
--    · direccion_obra  → (invitado por un jefe) solo ve el resumen de tareas.
--
--  Además: los pedidos pueden quedar en estado "rechazado".
-- =====================================================================

-- ---------------------------------------------------------------------
--  ROL EN EL PERFIL (lo elige el usuario al registrarse; luego no cambia)
-- ---------------------------------------------------------------------
alter table profiles add column if not exists rol text not null default 'jefe_obra';
alter table profiles drop constraint if exists profiles_rol_check;
update profiles set rol = 'jefe_obra' where rol not in ('jefe_obra', 'direccion_obra', 'compras');
alter table profiles add constraint profiles_rol_check check (rol in ('jefe_obra', 'direccion_obra', 'compras'));

create or replace function public.lock_rol() returns trigger
language plpgsql as $$
begin
  if auth.uid() is not null and new.rol is distinct from old.rol then
    raise exception 'El rol no puede modificarse';
  end if;
  return new;
end $$;
drop trigger if exists trg_lock_rol on profiles;
create trigger trg_lock_rol before update on profiles
  for each row execute function public.lock_rol();

-- Alta: el rol viene de los metadatos del registro. Solo el jefe de obra
-- arranca con una obra creada.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_rol text := coalesce(new.raw_user_meta_data->>'rol', 'jefe_obra');
begin
  if v_rol not in ('jefe_obra', 'direccion_obra', 'compras') then v_rol := 'jefe_obra'; end if;

  insert into profiles (id, nombre, estudio, rol)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
          new.raw_user_meta_data->>'estudio',
          v_rol)
  on conflict (id) do nothing;

  if v_rol = 'jefe_obra' then
    insert into obras (user_id, nombre, direccion) values (new.id, 'Mi primera obra', null);
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------
--  ROL EN EL ACCESO (se copia del perfil al aceptar la invitación)
-- ---------------------------------------------------------------------
alter table obra_accesos drop constraint if exists obra_accesos_rol_check;
update obra_accesos set rol = 'compras' where rol not in ('compras', 'direccion_obra');
alter table obra_accesos alter column rol set default 'compras';
alter table obra_accesos add constraint obra_accesos_rol_check check (rol in ('compras', 'direccion_obra'));

-- Rol del usuario actual sobre una obra compartida (NULL si no tiene acceso).
create or replace function public.rol_en_obra(p_obra uuid) returns text
language sql stable security definer set search_path = public as $$
  select a.rol
  from obra_accesos a
  join obras o on o.id = p_obra
  where a.member_id = auth.uid()
    and a.estado = 'activo'
    and a.owner_id = o.user_id
    and (a.obra_id is null or a.obra_id = p_obra)
  order by (a.rol = 'compras') desc
  limit 1
$$;
revoke all on function public.rol_en_obra(uuid) from public, anon;
grant execute on function public.rol_en_obra(uuid) to authenticated;

-- ---------------------------------------------------------------------
--  PEDIDOS: nuevo estado "rechazado"
-- ---------------------------------------------------------------------
alter table pedidos drop constraint if exists pedidos_estado_check;
alter table pedidos add constraint pedidos_estado_check
  check (estado in ('pendiente', 'aprobado', 'rechazado', 'en_camino', 'entregado'));

-- ---------------------------------------------------------------------
--  POLÍTICAS DE MIEMBROS SEGÚN ROL (reemplazan las de la migración 002)
-- ---------------------------------------------------------------------
drop policy if exists "miembro_select" on obras;
create policy "miembro_select" on obras for select to authenticated
  using (public.rol_en_obra(id) is not null);

-- Tareas: compras y dirección de obra (solo lectura).
drop policy if exists "miembro_select" on tareas;
create policy "miembro_select" on tareas for select to authenticated
  using (public.rol_en_obra(obra_id) is not null);

-- Solo compras: pedidos, servicios y datos del resumen (lectura).
do $$
declare t text;
begin
  foreach t in array array['pedidos', 'caja_movimientos', 'seguros', 'adicionales', 'fletes', 'volquetes'] loop
    execute format('drop policy if exists "miembro_select" on %I', t);
    execute format('create policy "miembro_select" on %I for select to authenticated
                    using (public.rol_en_obra(obra_id) = ''compras'')', t);
  end loop;

  -- Compras puede actualizar pedidos, fletes y volquetes (el trigger limita a "estado").
  foreach t in array array['pedidos', 'fletes', 'volquetes'] loop
    execute format('drop policy if exists "miembro_update" on %I', t);
    execute format('create policy "miembro_update" on %I for update to authenticated
                    using (public.rol_en_obra(obra_id) = ''compras'')
                    with check (public.rol_en_obra(obra_id) = ''compras'')', t);
  end loop;
end $$;

-- Un miembro solo puede cambiar la columna "estado" (pedidos, fletes, volquetes).
create or replace function public.miembro_solo_estado() returns trigger
language plpgsql as $$
begin
  if auth.uid() is not null and old.user_id is distinct from auth.uid() then
    if (to_jsonb(new) - 'estado' - 'updated_at') is distinct from (to_jsonb(old) - 'estado' - 'updated_at') then
      raise exception 'Solo se puede cambiar el estado';
    end if;
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['pedidos', 'fletes', 'volquetes'] loop
    execute format('drop trigger if exists trg_miembro_estado on %I', t);
    execute format('create trigger trg_miembro_estado before update on %I
                    for each row execute function public.miembro_solo_estado()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
--  INVITACIONES: el rol del acceso sale del perfil de quien acepta
-- ---------------------------------------------------------------------
drop function if exists public.ver_invitacion(text);
create or replace function public.ver_invitacion(p_token text)
returns table (id uuid, owner_nombre text, owner_estudio text, obra_nombre text, todas boolean,
               estado text, es_propia boolean, es_mia boolean, mi_rol text)
language sql stable security definer set search_path = public as $$
  select a.id, p.nombre, p.estudio, o.nombre, a.obra_id is null, a.estado,
         a.owner_id = auth.uid(), a.member_id = auth.uid(),
         (select rol from profiles where profiles.id = auth.uid())
  from obra_accesos a
  left join profiles p on p.id = a.owner_id
  left join obras o on o.id = a.obra_id
  where a.token = p_token and auth.uid() is not null
$$;

create or replace function public.aceptar_invitacion(p_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v obra_accesos;
  v_email text;
  v_rol text;
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;
  select * into v from obra_accesos where token = p_token for update;
  if not found then raise exception 'invitacion_invalida'; end if;
  if v.owner_id = auth.uid() then raise exception 'invitacion_propia'; end if;
  if v.estado = 'activo' then
    if v.member_id = auth.uid() then return v.id; end if;
    raise exception 'invitacion_usada';
  end if;

  select rol into v_rol from profiles where profiles.id = auth.uid();
  if v_rol is null or v_rol not in ('compras', 'direccion_obra') then
    raise exception 'rol_no_admitido';
  end if;

  select email into v_email from auth.users where id = auth.uid();
  update obra_accesos
     set member_id = auth.uid(), estado = 'activo', accepted_at = now(), rol = v_rol,
         email = coalesce(email, v_email),
         nombre = coalesce(nombre, (select nombre from profiles where profiles.id = auth.uid()))
   where obra_accesos.id = v.id;
  return v.id;
end $$;

revoke all on function public.ver_invitacion(text) from public, anon;
revoke all on function public.aceptar_invitacion(text) from public, anon;
grant execute on function public.ver_invitacion(text) to authenticated;
grant execute on function public.aceptar_invitacion(text) to authenticated;

-- =====================================================================
--  ID de obra (código para sumarse)
--
--  Cada obra tiene un ID corto y único (8 caracteres, sin letras ambiguas,
--  ej. K7Q2X9MD; se muestra como K7Q2-X9MD). Un usuario con rol Compras o
--  Dirección de obra puede sumarse a la obra escribiendo ese ID.
--
--  Protecciones:
--    · ~8,5 × 10^11 combinaciones posibles.
--    · Máx. 10 intentos fallidos cada 10 minutos por usuario.
--    · El código lo genera la base: no se puede elegir ni editar a mano.
--    · El jefe puede regenerarlo o desactivar el acceso por ID.
--    · Cada ingreso queda como un acceso en obra_accesos (visible y revocable).
--
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
--  Generador de códigos (alfabeto sin 0/O, 1/I/L)
-- ---------------------------------------------------------------------
create or replace function public.generar_codigo_obra() returns text
language plpgsql volatile set search_path = public as $$
declare
  alfabeto constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  c text;
  i int;
begin
  loop
    c := '';
    for i in 1..8 loop
      c := c || substr(alfabeto, 1 + (get_byte(gen_random_bytes(1), 0) % length(alfabeto)), 1);
    end loop;
    exit when not exists (select 1 from obras where codigo = c);
  end loop;
  return c;
end $$;

-- ---------------------------------------------------------------------
--  Columnas nuevas en obras
-- ---------------------------------------------------------------------
alter table obras add column if not exists codigo text;
alter table obras add column if not exists acceso_por_codigo boolean not null default true;

-- Backfill de obras existentes (fila por fila para garantizar unicidad).
do $$
declare r record;
begin
  for r in select id from obras where codigo is null loop
    update obras set codigo = public.generar_codigo_obra() where id = r.id;
  end loop;
end $$;

alter table obras alter column codigo set not null;
create unique index if not exists obras_codigo_key on obras(codigo);

-- El código siempre lo genera la base (al crear) y solo cambia vía RPC.
-- SECURITY DEFINER: el generador no es ejecutable por usuarios; el trigger lo llama como dueño.
create or replace function public.codigo_obra_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.codigo := public.generar_codigo_obra();
  elsif new.codigo is distinct from old.codigo
        and coalesce(current_setting('obrabase.regen_codigo', true), '') <> '1' then
    raise exception 'El ID de la obra no puede modificarse';
  end if;
  return new;
end $$;

drop trigger if exists trg_codigo_obra on obras;
create trigger trg_codigo_obra before insert or update on obras
  for each row execute function public.codigo_obra_guard();

-- ---------------------------------------------------------------------
--  Intentos fallidos (anti fuerza bruta). Solo la usan las funciones.
-- ---------------------------------------------------------------------
create table if not exists codigo_intentos (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists codigo_intentos_user_idx on codigo_intentos(user_id, created_at desc);
alter table codigo_intentos enable row level security;
revoke all on codigo_intentos from anon, authenticated;

-- ---------------------------------------------------------------------
--  RPC: sumarse a una obra con su ID
--  Devuelve estado: ok | codigo_invalido | demasiados_intentos | rol_no_admitido | propia
--  (no usa excepciones para que el intento fallido quede registrado)
-- ---------------------------------------------------------------------
create or replace function public.unirse_por_codigo(p_codigo text)
returns table (estado text, obra_id uuid, obra_nombre text)
language plpgsql security definer set search_path = public as $$
declare
  v_codigo text := upper(regexp_replace(coalesce(p_codigo, ''), '[^A-Za-z0-9]', '', 'g'));
  v_obra   obras;
  v_rol    text;
  v_nombre text;
  v_email  text;
begin
  if auth.uid() is null then raise exception 'no_autenticado'; end if;

  if (select count(*) from codigo_intentos
      where user_id = auth.uid() and created_at > now() - interval '10 minutes') >= 10 then
    return query select 'demasiados_intentos'::text, null::uuid, null::text; return;
  end if;

  select p.rol, p.nombre into v_rol, v_nombre from profiles p where p.id = auth.uid();
  if v_rol is null or v_rol not in ('compras', 'direccion_obra') then
    return query select 'rol_no_admitido'::text, null::uuid, null::text; return;
  end if;

  select * into v_obra from obras o where o.codigo = v_codigo and o.acceso_por_codigo;
  if not found then
    insert into codigo_intentos (user_id) values (auth.uid());
    return query select 'codigo_invalido'::text, null::uuid, null::text; return;
  end if;

  if v_obra.user_id = auth.uid() then
    return query select 'propia'::text, v_obra.id, v_obra.nombre; return;
  end if;

  -- Ya tenía acceso (a esta obra o a todas las del jefe): no duplicar.
  if not exists (
    select 1 from obra_accesos a
    where a.member_id = auth.uid() and a.owner_id = v_obra.user_id and a.estado = 'activo'
      and (a.obra_id is null or a.obra_id = v_obra.id)
  ) then
    select u.email into v_email from auth.users u where u.id = auth.uid();
    insert into obra_accesos (owner_id, obra_id, member_id, rol, nombre, email, estado, accepted_at)
    values (v_obra.user_id, v_obra.id, auth.uid(), v_rol, v_nombre, v_email, 'activo', now());
  end if;

  return query select 'ok'::text, v_obra.id, v_obra.nombre;
end $$;

-- ---------------------------------------------------------------------
--  RPC: regenerar el ID (solo el dueño). El ID anterior deja de servir;
--  quienes ya se sumaron mantienen el acceso (se revoca desde Equipo).
-- ---------------------------------------------------------------------
create or replace function public.regenerar_codigo_obra(p_obra uuid) returns text
language plpgsql security definer set search_path = public as $$
declare v text;
begin
  if not exists (select 1 from obras where id = p_obra and user_id = auth.uid()) then
    raise exception 'sin_permiso';
  end if;
  perform set_config('obrabase.regen_codigo', '1', true);
  update obras set codigo = public.generar_codigo_obra() where id = p_obra returning codigo into v;
  return v;
end $$;

revoke all on function public.generar_codigo_obra() from public, anon;
revoke all on function public.unirse_por_codigo(text) from public, anon;
revoke all on function public.regenerar_codigo_obra(uuid) from public, anon;
grant execute on function public.unirse_por_codigo(text) to authenticated;
grant execute on function public.regenerar_codigo_obra(uuid) to authenticated;

