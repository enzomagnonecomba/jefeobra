import { hasSupabase, supabase } from './supabase';
import * as db from './db';
import type { Adicional, CajaMovimiento, Obra, Pedido, Seguro, Tarea } from '../types';

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
}

export interface Perfil { id: string; nombre: string | null; estudio: string | null }

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
      todas: a.obra_id === null, estado: a.estado, es_propia: a.owner_id === 'demo-user', es_mia: a.member_id === 'demo-user',
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
    db.demoStore.write('obra_accesos', rows.map((x) => (x.id === a.id
      ? { ...x, member_id: 'demo-user', estado: 'activo', accepted_at: new Date().toISOString(), email: x.email ?? 'demo@obra.local' }
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
}

/** Carga todo lo que el administrativo puede ver de las obras compartidas con él. */
export async function cargarPanel(memberId: string): Promise<DatosPanel> {
  const accesos = await misAccesos(memberId);
  const todas = await db.list<Obra>('obras', {}, 'nombre', true);
  // Con Supabase, RLS ya devuelve solo las obras compartidas (más las propias).
  // En demo filtramos igual que la política: dueño con acceso "todas" u obra puntual.
  const obras = todas.filter((o) => o.user_id !== memberId && accesos.some((a) =>
    a.owner_id === o.user_id && (a.obra_id === null || a.obra_id === o.id)));
  const ids = obras.map((o) => o.id);
  const ownerIds = [...new Set(obras.map((o) => o.user_id!).filter(Boolean))];

  const [pedidos, tareas, caja, seguros, adicionales, perfiles] = await Promise.all([
    db.listIn<Pedido>('pedidos', 'obra_id', ids),
    db.listIn<Tarea>('tareas', 'obra_id', ids),
    db.listIn<CajaMovimiento>('caja_movimientos', 'obra_id', ids, 'fecha'),
    db.listIn<Seguro>('seguros', 'obra_id', ids),
    db.listIn<Adicional>('adicionales', 'obra_id', ids),
    db.listIn<Perfil>('profiles', 'id', ownerIds),
  ]);
  return { obras, jefes: Object.fromEntries(perfiles.map((p) => [p.id, p])), pedidos, tareas, caja, seguros, adicionales };
}
