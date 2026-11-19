create extension if not exists pgcrypto;

-- ============ TABLAS BASE ============
create table if not exists estudios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  estudio_id uuid references estudios(id) on delete set null,
  nombre text,
  rol text not null default 'jefe_obra' check (rol in ('admin','jefe_obra','compras','lectura')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists obras (
  id uuid primary key default gen_random_uuid(),
  estudio_id uuid not null references estudios(id) on delete cascade,
  nombre text not null,
  direccion text,
  estado text not null default 'activa' check (estado in ('activa','pausada','finalizada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ TAREAS ============
create table if not exists tareas (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras(id) on delete cascade,
  titulo text not null,
  descripcion text,
  frente text,
  prioridad text not null default 'media' check (prioridad in ('baja','media','alta','critica')),
  responsable text,
  fecha_estimada date,
  estado text not null default 'por_comenzar'
    check (estado in ('por_comenzar','en_curso','en_pausa','finalizada')),
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tareas_obra_estado_idx on tareas(obra_id, estado);

-- ============ PEDIDOS ============
create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras(id) on delete cascade,
  rubro text not null,
  item text not null,
  cantidad numeric(12,2) not null check (cantidad > 0),
  unidad text not null default 'u',
  urgencia text not null default 'normal' check (urgencia in ('normal','urgente','critica')),
  fecha_requerida date,
  notas text,
  estado text not null default 'pendiente'
    check (estado in ('pendiente','aprobado','en_camino','entregado','observado')),
  solicitado_por uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ OBRA: CAJA, JORNALES, ADICIONALES, MANIFIESTOS, MINUTAS ============
create table if not exists caja_movimientos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras(id) on delete cascade,
  fecha date not null default current_date,
  tipo text not null check (tipo in ('ingreso','egreso')),
  concepto text not null,
  monto numeric(14,2) not null check (monto > 0),
  comprobante_path text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists jornales (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras(id) on delete cascade,
  fecha date not null default current_date,
  trabajador text not null,
  cuadrilla text,
  dias numeric(5,2) not null default 1 check (dias >= 0),
  horas numeric(5,2) check (horas >= 0),
  tarifa numeric(14,2) not null check (tarifa >= 0),
  observacion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists adicionales (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras(id) on delete cascade,
  descripcion text not null,
  motivo text,
  estado_aprobacion text not null default 'propuesto'
    check (estado_aprobacion in ('propuesto','aprobado','rechazado')),
  impacto_estimado numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists manifiestos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras(id) on delete cascade,
  numero text not null,
  fecha date not null,
  tipo text not null check (tipo in ('transporte','residuos','carga')),
  transportista text,
  origen text,
  destino text,
  archivo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (obra_id, numero)
);

create table if not exists minutas (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras(id) on delete cascade,
  fecha date not null default current_date,
  asistentes text,
  acuerdos text,
  pendientes text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ SERVICIOS ============
create table if not exists servicios_fletes (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras(id) on delete cascade,
  programado_para timestamptz,
  transportista text,
  origen text,
  destino text,
  costo numeric(14,2) not null default 0,
  estado text not null default 'programado'
    check (estado in ('programado','en_transito','realizado','cancelado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists servicios_volquetes (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras(id) on delete cascade,
  empresa text,
  ubicacion_obra text,
  fecha_entrega date,
  fecha_retiro date,
  estado text not null default 'solicitado'
    check (estado in ('solicitado','entregado','retirado','recambio')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists seguros (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras(id) on delete cascade,
  tipo text not null check (tipo in ('art','personal','obra','otro')),
  aseguradora text,
  poliza text,
  vigencia_desde date,
  vigencia_hasta date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (vigencia_desde is null or vigencia_hasta >= vigencia_desde)
);

-- ============ RECURSOS ============
create table if not exists epp_entregas (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras(id) on delete cascade,
  operario text not null,
  elemento text not null,
  cantidad int not null default 1 check (cantidad > 0),
  fecha_entrega date not null default current_date,
  confirmacion_path text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists inventario_items (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras(id) on delete cascade,
  nombre text not null,
  categoria text,
  cantidad_disponible int not null default 0 check (cantidad_disponible >= 0),
  estado_operativo text not null default 'operativo'
    check (estado_operativo in ('operativo','en_reparacion','perdido_baja')),
  ubicacion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ TRIGGER updated_at ============
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at := now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['estudios','profiles','obras','tareas','pedidos','caja_movimientos',
    'jornales','adicionales','manifiestos','minutas','servicios_fletes','servicios_volquetes',
    'seguros','epp_entregas','inventario_items'] loop
    execute format('drop trigger if exists trg_updated_at on %I', t);
    execute format('create trigger trg_updated_at before update on %I
                    for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ============ HELPERS DE SEGURIDAD ============
create or replace function public.user_estudio_id() returns uuid
language sql stable security definer set search_path = public as $$
  select estudio_id from profiles where id = auth.uid()
$$;

create or replace function public.puede_ver_obra(p_obra uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from obras o
    where o.id = p_obra and o.estudio_id = public.user_estudio_id()
  )
$$;

-- ============ ALTA AUTOMÁTICA: estudio + perfil al registrarse ============
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_estudio uuid;
begin
  insert into estudios (nombre)
  values (coalesce(new.raw_user_meta_data->>'estudio', 'Mi estudio'))
  returning id into v_estudio;

  insert into profiles (id, estudio_id, nombre, rol)
  values (new.id, v_estudio, coalesce(new.raw_user_meta_data->>'nombre', new.email), 'admin');
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ RLS ============
alter table estudios enable row level security;
alter table profiles enable row level security;
alter table obras enable row level security;

drop policy if exists "estudio_select" on estudios;
create policy "estudio_select" on estudios for select to authenticated
  using (id = public.user_estudio_id());

drop policy if exists "profile_select" on profiles;
create policy "profile_select" on profiles for select to authenticated
  using (id = auth.uid() or estudio_id = public.user_estudio_id());

drop policy if exists "profile_update_own" on profiles;
create policy "profile_update_own" on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "obras_all" on obras;
create policy "obras_all" on obras for all to authenticated
  using (estudio_id = public.user_estudio_id())
  with check (estudio_id = public.user_estudio_id());

do $$
declare t text;
begin
  foreach t in array array['tareas','pedidos','caja_movimientos','jornales','adicionales',
    'manifiestos','minutas','servicios_fletes','servicios_volquetes','seguros',
    'epp_entregas','inventario_items'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "acceso_obra" on %I', t);
    execute format('create policy "acceso_obra" on %I for all to authenticated
                    using (public.puede_ver_obra(obra_id))
                    with check (public.puede_ver_obra(obra_id))', t);
  end loop;
end $$;

-- ============ STORAGE: adjuntos privados por obra (ruta: <obra_id>/archivo) ============
insert into storage.buckets (id, name, public)
values ('adjuntos', 'adjuntos', false)
on conflict (id) do nothing;

drop policy if exists "adjuntos_select" on storage.objects;
create policy "adjuntos_select" on storage.objects for select to authenticated
  using (bucket_id = 'adjuntos' and public.puede_ver_obra(((storage.foldername(name))[1])::uuid));

drop policy if exists "adjuntos_insert" on storage.objects;
create policy "adjuntos_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'adjuntos' and public.puede_ver_obra(((storage.foldername(name))[1])::uuid));

drop policy if exists "adjuntos_delete" on storage.objects;
create policy "adjuntos_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'adjuntos' and public.puede_ver_obra(((storage.foldername(name))[1])::uuid));

-- ============ SEED OPCIONAL: obras de ejemplo para el primer estudio ============
insert into obras (estudio_id, nombre, direccion, estado)
select e.id, v.nombre, v.direccion, 'activa'
from estudios e
cross join (values
  ('Edificio Río 1820', 'Av. del Río 1820'),
  ('Casa Lago Norte', 'Ruta 9 km 14')
) as v(nombre, direccion)
where e.id = (select id from estudios order by created_at limit 1)
  and not exists (select 1 from obras o where o.estudio_id = e.id);
