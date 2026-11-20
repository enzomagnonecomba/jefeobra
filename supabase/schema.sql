-- =====================================================================
--  JEFE DE OBRA · Esquema Supabase (PostgreSQL)
--  Modelo multi-tenant POR USUARIO: cada fila pertenece a auth.uid().
--  Ningún usuario puede ver, crear, editar ni borrar datos de otro.
--
--  Ejecutar completo en el SQL Editor de Supabase. Es idempotente.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
--  (Opcional) RESET del esquema anterior basado en "estudios".
--  Si ya corriste la versión vieja, descomentá este bloque UNA vez.
--  ATENCIÓN: borra todos los datos de esas tablas.
-- ---------------------------------------------------------------------
-- drop table if exists tareas, pedidos, caja_movimientos, jornales, adicionales,
--   manifiestos, minutas, servicios_fletes, servicios_volquetes, seguros,
--   epp_entregas, inventario_items, obras, profiles, estudios cascade;
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

-- Sin acceso anónimo a nada.
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
