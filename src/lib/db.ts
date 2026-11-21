import { hasSupabase, supabase } from './supabase';
import { demoSeed } from './demoSeed';

/**
 * Capa de datos genérica.
 * - Con Supabase: todas las consultas pasan por RLS (auth.uid() = user_id),
 *   por lo que el filtro por usuario lo hace la base. `user_id` se completa
 *   solo con el default `auth.uid()` de cada tabla.
 * - Sin Supabase (modo demo): persiste en localStorage del navegador.
 */

type Any = Record<string, unknown> & { id: string };
type Filters = Record<string, string | undefined>;

const LS = (table: string) => `obrabase:demo:${table}`;

function readLocal<T>(table: string): T[] {
  try {
    const raw = localStorage.getItem(LS(table));
    if (raw) return JSON.parse(raw) as T[];
  } catch { /* storage no disponible */ }
  const seeded = (demoSeed[table] ?? []) as T[];
  writeLocal(table, seeded);
  return seeded;
}

function writeLocal<T>(table: string, rows: T[]) {
  try { localStorage.setItem(LS(table), JSON.stringify(rows)); } catch { /* noop */ }
}

const matches = (row: Any, filters: Filters) =>
  Object.entries(filters).every(([k, v]) => v === undefined || row[k] === v);

export async function list<T>(table: string, filters: Filters = {}, orderBy = 'created_at', ascending = false): Promise<T[]> {
  if (!hasSupabase) {
    return readLocal<Any>(table)
      .filter((r) => matches(r, filters))
      .sort((a, b) => (ascending ? 1 : -1) * String(a[orderBy] ?? '').localeCompare(String(b[orderBy] ?? ''))) as unknown as T[];
  }
  let q = supabase.from(table).select('*');
  for (const [k, v] of Object.entries(filters)) if (v !== undefined) q = q.eq(k, v);
  const { data, error } = await q.order(orderBy, { ascending });
  if (error) throw error;
  return data as T[];
}

/** Lista filas cuya `column` está en `values` (ej. pedidos de varias obras). */
export async function listIn<T>(table: string, column: string, values: string[], orderBy = 'created_at', ascending = false): Promise<T[]> {
  if (!values.length) return [];
  if (!hasSupabase) {
    const set = new Set(values);
    return readLocal<Any>(table)
      .filter((r) => set.has(String(r[column])))
      .sort((a, b) => (ascending ? 1 : -1) * String(a[orderBy] ?? '').localeCompare(String(b[orderBy] ?? ''))) as unknown as T[];
  }
  const { data, error } = await supabase.from(table).select('*').in(column, values).order(orderBy, { ascending });
  if (error) throw error;
  return data as T[];
}

/** Acceso directo al almacenamiento local del modo demo (para emular RPCs). */
export const demoStore = {
  read: <T>(table: string) => readLocal<T>(table),
  write: <T>(table: string, rows: T[]) => writeLocal(table, rows),
};

export async function insert<T>(table: string, values: Partial<T>): Promise<T> {
  if (!hasSupabase) {
    const now = new Date().toISOString();
    const row = { id: crypto.randomUUID(), user_id: 'demo-user', created_at: now, updated_at: now, ...values } as unknown as Any;
    writeLocal(table, [row, ...readLocal<Any>(table)]);
    return row as unknown as T;
  }
  const { data, error } = await supabase.from(table).insert(values as Record<string, unknown>).select().single();
  if (error) throw error;
  return data as T;
}

export async function update<T>(table: string, id: string, values: Partial<T>): Promise<T> {
  if (!hasSupabase) {
    let updated: Any | undefined;
    const rows = readLocal<Any>(table).map((r) => {
      if (r.id !== id) return r;
      updated = { ...r, ...values, updated_at: new Date().toISOString() } as Any;
      return updated;
    });
    writeLocal(table, rows);
    return updated as unknown as T;
  }
  const { data, error } = await supabase.from(table).update(values as Record<string, unknown>).eq('id', id).select().single();
  if (error) throw error;
  return data as T;
}

export async function remove(table: string, id: string): Promise<void> {
  if (!hasSupabase) {
    writeLocal(table, readLocal<Any>(table).filter((r) => r.id !== id));
    return;
  }
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}
