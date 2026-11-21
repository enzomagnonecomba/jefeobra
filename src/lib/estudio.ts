import { hasSupabase, supabase } from './supabase';
import * as db from './db';
import type { Adicional, CajaMovimiento, Flete, Obra, Pedido, Seguro, Tarea, Volquete } from '../types';
import type { Rol } from './roles';

/**
 * Panel de gestión del estudio (plan Estudio).
 * El jefe de obra invita administrativos con un link; ellos ven las obras
 * compartidas (resumen + pedidos) y pueden cambiar el estado de los pedidos.
 * Los permisos los aplica RLS (supabase/migrations/002_panel_estudio.sql).
 */

export interface Acceso {
  id: string;
  owner_id: string;
  obra_id: string | null; // null = todas las obras del jefe
  member_id: string | null;
  rol: 'compras' | 'direccion_obra';
  nombre: string | null;
  email: string | null;
  token: string;
  estado: 'pendiente' | 'activo';
  created_at: string;
  accepted_at: string | null;
}

export interface InfoInvitacion {
  id: string;
  owner_nombre: string | null;
  owner_estudio: string | null;
  obra_nombre: string | null;
  todas: boolean;
  estado: 'pendiente' | 'activo';
  es_propia: boolean;
  es_mia: boolean;
  mi_rol: Rol | null;
}

export interface Perfil { id: string; nombre: string | null; estudio: string | null }

/** Rol del usuario demo (se guarda en el navegador al registrarse en modo demo). */
const demoRol = (): Rol => { try { return (JSON.parse(localStorage.getItem('mock_meta') ?? '{}').rol as Rol) ?? 'jefe_obra'; } catch { return 'jefe_obra'; } };

export const linkInvitacion = (token: string) => `${window.location.origin}/invitacion/${token}`;

// ---------------------------------------------------------------- Jefe de obra
export async function listarInvitaciones(ownerId: string): Promise<Acceso[]> {
  return db.list<Acceso>('obra_accesos', { owner_id: ownerId });
}

export async function crearInvitacion(values: { nombre: string | null; email: string | null; obra_id: string | null }): Promise<Acceso> {
  if (!hasSupabase) {
    const token = Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => b.toString(16).padStart(2, '0')).join('');
    return db.insert<Acceso>('obra_accesos', { ...values, owner_id: 'demo-user', member_id: null, estado: 'pendiente', token, accepted_at: null } as Partial<Acceso>);
  }
  return db.insert<Acceso>('obra_accesos', values as Partial<Acceso>);
}

export const revocarAcceso = (id: string) => db.remove('obra_accesos', id);

// ---------------------------------------------------------------- Invitación
export async function verInvitacion(token: string): Promise<InfoInvitacion | null> {
  if (!hasSupabase) {
    const a = db.demoStore.read<Acceso>('obra_accesos').find((x) => x.token === token);
    if (!a) return null;
    const owner = db.demoStore.read<Perfil>('profiles').find((p) => p.id === a.owner_id);
    const obra = db.demoStore.read<Obra>('obras').find((o) => o.id === a.obra_id);
    return {
      id: a.id, owner_nombre: owner?.nombre ?? null, owner_estudio: owner?.estudio ?? null, obra_nombre: obra?.nombre ?? null,
      todas: a.obra_id === null, estado: a.estado, es_propia: a.owner_id === 'demo-user', es_mia: a.member_id === 'demo-user', mi_rol: demoRol(),
    };
  }
  const { data, error } = await supabase.rpc('ver_invitacion', { p_token: token });
  if (error) throw error;
  return (data as InfoInvitacion[])[0] ?? null;
}

export async function aceptarInvitacion(token: string): Promise<void> {
  if (!hasSupabase) {
    const rows = db.demoStore.read<Acceso>('obra_accesos');
    const a = rows.find((x) => x.token === token);
    if (!a) throw new Error('invitacion_invalida');
    if (a.owner_id === 'demo-user') throw new Error('invitacion_propia');
    if (a.estado === 'activo' && a.member_id !== 'demo-user') throw new Error('invitacion_usada');
    if (demoRol() === 'jefe_obra') throw new Error('rol_no_admitido');
    db.demoStore.write('obra_accesos', rows.map((x) => (x.id === a.id
      ? { ...x, member_id: 'demo-user', rol: demoRol() as Acceso['rol'], estado: 'activo', accepted_at: new Date().toISOString(), email: x.email ?? 'demo@obra.local' }
      : x)));
    return;
  }
  const { error } = await supabase.rpc('aceptar_invitacion', { p_token: token });
  if (error) throw error;
}

// ---------------------------------------------------------------- Administrativo
export async function misAccesos(memberId: string): Promise<Acceso[]> {
  return db.list<Acceso>('obra_accesos', { member_id: memberId, estado: 'activo' });
}

export const salirDeAcceso = (id: string) => db.remove('obra_accesos', id);

export interface DatosPanel {
  obras: Obra[];
  jefes: Record<string, Perfil>;
  pedidos: Pedido[];
  tareas: Tarea[];
  caja: CajaMovimiento[];
  seguros: Seguro[];
  adicionales: Adicional[];
  fletes: Flete[];
  volquetes: Volquete[];
}

/** Carga todo lo que el administrativo puede ver de las obras compartidas con él. */
export async function cargarPanel(memberId: string, rol: Rol): Promise<DatosPanel> {
  const accesos = await misAccesos(memberId);
  const todas = await db.list<Obra>('obras', {}, 'nombre', true);
  // Con Supabase, RLS ya devuelve solo las obras compartidas (más las propias).
  // En demo filtramos igual que la política: dueño con acceso "todas" u obra puntual.
  const obras = todas.filter((o) => o.user_id !== memberId && accesos.some((a) =>
    a.owner_id === o.user_id && (a.obra_id === null || a.obra_id === o.id)));
  const ids = obras.map((o) => o.id);
  const ownerIds = [...new Set(obras.map((o) => o.user_id!).filter(Boolean))];

  // Dirección de obra solo accede a tareas; Compras a pedidos, servicios y resumen (igual que RLS).
  const compras = rol === 'compras';
  const solo = <T,>(ok: boolean, q: () => Promise<T[]>) => (ok ? q() : Promise.resolve([] as T[]));
  const [pedidos, tareas, caja, seguros, adicionales, fletes, volquetes, perfiles] = await Promise.all([
    solo(compras, () => db.listIn<Pedido>('pedidos', 'obra_id', ids)),
    db.listIn<Tarea>('tareas', 'obra_id', ids),
    solo(compras, () => db.listIn<CajaMovimiento>('caja_movimientos', 'obra_id', ids, 'fecha')),
    solo(compras, () => db.listIn<Seguro>('seguros', 'obra_id', ids)),
    solo(compras, () => db.listIn<Adicional>('adicionales', 'obra_id', ids)),
    solo(compras, () => db.listIn<Flete>('fletes', 'obra_id', ids, 'fecha')),
    solo(compras, () => db.listIn<Volquete>('volquetes', 'obra_id', ids)),
    db.listIn<Perfil>('profiles', 'id', ownerIds),
  ]);
  return { obras, jefes: Object.fromEntries(perfiles.map((p) => [p.id, p])), pedidos, tareas, caja, seguros, adicionales, fletes, volquetes };
}

// ---------------------------------------------------------------- ID de obra
/** Alfabeto sin caracteres ambiguos (0/O, 1/I/L). Igual que en la base. */
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** "rq4m-7k2p " → "RQ4M7K2P" */
export const normalizarCodigo = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

/** "RQ4M7K2P" → "RQ4M-7K2P" */
export const formatCodigo = (c?: string | null) => (c ? `${c.slice(0, 4)}-${c.slice(4)}` : '—');

const codigoDemo = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => ALFABETO[b % ALFABETO.length]).join('');

export type ResultadoUnion = 'ok' | 'codigo_invalido' | 'demasiados_intentos' | 'rol_no_admitido' | 'propia';

/** Suma al usuario actual (Compras / Dirección de obra) a la obra con ese ID. */
export async function unirsePorCodigo(codigo: string): Promise<{ estado: ResultadoUnion; obra_nombre: string | null }> {
  const c = normalizarCodigo(codigo);
  if (!hasSupabase) {
    // Emulación del RPC: mismas reglas, incluido el límite de intentos.
    const rol = demoRol();
    const intentos = db.demoStore.read<{ at: number }>('codigo_intentos').filter((x) => x.at > Date.now() - 600_000);
    if (intentos.length >= 10) return { estado: 'demasiados_intentos', obra_nombre: null };
    if (rol === 'jefe_obra') return { estado: 'rol_no_admitido', obra_nombre: null };
    const obra = db.demoStore.read<Obra>('obras').find((o) => o.codigo === c && o.acceso_por_codigo !== false);
    if (!obra) {
      db.demoStore.write('codigo_intentos', [...intentos, { at: Date.now() }]);
      return { estado: 'codigo_invalido', obra_nombre: null };
    }
    if (obra.user_id === 'demo-user') return { estado: 'propia', obra_nombre: obra.nombre };
    const accesos = db.demoStore.read<Acceso>('obra_accesos');
    const ya = accesos.some((a) => a.member_id === 'demo-user' && a.owner_id === obra.user_id && a.estado === 'activo' && (a.obra_id === null || a.obra_id === obra.id));
    if (!ya) {
      db.demoStore.write('obra_accesos', [...accesos, {
        id: crypto.randomUUID(), owner_id: obra.user_id!, obra_id: obra.id, member_id: 'demo-user', rol: rol as Acceso['rol'],
        nombre: 'Demo', email: 'demo@obra.local', token: codigoDemo(), estado: 'activo', created_at: new Date().toISOString(), accepted_at: new Date().toISOString(),
      }]);
    }
    return { estado: 'ok', obra_nombre: obra.nombre };
  }
  const { data, error } = await supabase.rpc('unirse_por_codigo', { p_codigo: c });
  if (error) throw error;
  const r = (data as { estado: ResultadoUnion; obra_nombre: string | null }[])[0];
  return { estado: r?.estado ?? 'codigo_invalido', obra_nombre: r?.obra_nombre ?? null };
}

/** Genera un ID nuevo para la obra (el anterior deja de funcionar). */
export async function regenerarCodigo(obraId: string): Promise<string> {
  if (!hasSupabase) {
    const nuevo = codigoDemo();
    await db.update<Obra>('obras', obraId, { codigo: nuevo });
    return nuevo;
  }
  const { data, error } = await supabase.rpc('regenerar_codigo_obra', { p_obra: obraId });
  if (error) throw error;
  return data as string;
}

/** Habilita o deshabilita sumarse a la obra con el ID. */
export const setAccesoPorCodigo = (obraId: string, activo: boolean) => db.update<Obra>('obras', obraId, { acceso_por_codigo: activo });

/** Modo demo: completa el ID de obras creadas antes de esta función. */
export const codigoNuevoDemo = codigoDemo;
