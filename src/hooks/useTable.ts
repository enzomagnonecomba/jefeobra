import { useCallback, useEffect, useState } from 'react';
import * as db from '../lib/db';
import { useObra } from '../context/ObraContext';
import { useToast } from '../components/Toast';
import type { Row, TableName } from '../types';

/**
 * CRUD de una tabla filtrada por la obra activa, con actualizaciones optimistas.
 * El aislamiento por usuario lo garantiza RLS en Supabase.
 */
export function useTable<T extends Row>(table: TableName, orderBy = 'created_at', ascending = false) {
  const { obraActiva } = useObra();
  const toast = useToast();
  const obraId = obraActiva?.id;
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!obraId) { setRows([]); setLoading(false); return; }
    setLoading(true);
    try {
      setRows(await db.list<T>(table, { obra_id: obraId }, orderBy, ascending));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [table, obraId, orderBy, ascending, toast]);

  useEffect(() => { void reload(); }, [reload]);

  const create = async (values: Partial<T>) => {
    if (!obraId) throw new Error('Seleccioná una obra');
    const row = await db.insert<T>(table, { ...values, obra_id: obraId });
    setRows((prev) => [row, ...prev]);
    return row;
  };

  const patch = async (id: string, values: Partial<T>) => {
    const prev = rows;
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...values } : x)));
    try {
      await db.update<T>(table, id, values);
    } catch (e) {
      setRows(prev);
      toast.error((e as Error).message);
    }
  };

  const destroy = async (id: string) => {
    const prev = rows;
    setRows((r) => r.filter((x) => x.id !== id));
    try {
      await db.remove(table, id);
    } catch (e) {
      setRows(prev);
      toast.error((e as Error).message);
    }
  };

  return { rows, loading, reload, create, patch, destroy, obraId };
}
