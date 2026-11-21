-- =====================================================================
--  MIGRACIÓN 003 · Roles de usuario
--
--  Cada cuenta elige un rol al registrarse:
--    · jefe_obra       → usa toda la app con sus obras (como hasta ahora).
--    · compras         → (invitado por un jefe) ve sus obras en el Panel de
--                        gestión: aprueba / rechaza pedidos y cambia el estado
--                        de fletes y volquetes. No puede editar nada más.
--    · direccion_obra  → (invitado por un jefe) solo ve el resumen de tareas.
--
--  Además: los pedidos pueden quedar en estado "rechazado".
--  Requiere haber ejecutado antes 002_panel_estudio.sql. Es idempotente.
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
