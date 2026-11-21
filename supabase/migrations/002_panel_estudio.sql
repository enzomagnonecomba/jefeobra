-- =====================================================================
--  MIGRACIÓN 002 · Panel de gestión del estudio (plan Estudio)
--
--  El jefe de obra invita a administrativos del estudio con un link.
--  El administrativo, al aceptar, puede:
--    · VER las obras compartidas, su resumen (tareas, caja chica, seguros,
--      adicionales) y sus pedidos.
--    · CAMBIAR SOLO EL ESTADO de los pedidos (aprobar, en camino, entregado).
--  No puede crear, editar ni borrar nada más. Todo se aplica con RLS.
--
--  Ejecutar completo en el SQL Editor de Supabase. Es idempotente.
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
