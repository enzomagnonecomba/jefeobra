-- =====================================================================
--  MIGRACIÓN 004 · ID de obra (código para sumarse)
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
--  Requiere 002 y 003. Es idempotente.
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
