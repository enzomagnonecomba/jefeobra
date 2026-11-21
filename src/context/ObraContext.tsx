import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import * as db from '../lib/db';
import type { Obra } from '../types';
import { useAuth } from './AuthContext';

interface ObraCtx {
  obras: Obra[];
  obraActiva: Obra | null;
  loading: boolean;
  seleccionar: (id: string) => void;
  crearObra: (o: Pick<Obra, 'nombre' | 'direccion' | 'presupuesto_caja'>) => Promise<Obra>;
  actualizarObra: (id: string, o: Partial<Obra>) => Promise<void>;
  eliminarObra: (id: string) => Promise<void>;
}

const ObraContext = createContext<ObraCtx | null>(null);
const KEY = 'obrabase:obra_activa';

const readKey = () => { try { return localStorage.getItem(KEY); } catch { return null; } };

export function ObraProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(readKey);

  const cargar = useCallback(async () => {
    if (!user) { setObras([]); setLoading(false); return; }
    setLoading(true);
    try {
      const data = await db.list<Obra>('obras', {}, 'created_at');
      // Solo obras propias: las compartidas por otros jefes se ven en el Panel del estudio.
      setObras(data.filter((o) => !o.user_id || o.user_id === user.id).reverse());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void cargar(); }, [cargar]);

  const obraActiva = obras.find((o) => o.id === activeId) ?? obras[0] ?? null;

  const seleccionar = (id: string) => {
    try { localStorage.setItem(KEY, id); } catch { /* noop */ }
    setActiveId(id);
  };

  const crearObra: ObraCtx['crearObra'] = async (o) => {
    const nueva = await db.insert<Obra>('obras', { ...o, estado: 'activa' });
    setObras((prev) => [...prev, nueva]);
    seleccionar(nueva.id);
    return nueva;
  };

  const actualizarObra = async (id: string, o: Partial<Obra>) => {
    const upd = await db.update<Obra>('obras', id, o);
    setObras((prev) => prev.map((x) => (x.id === id ? { ...x, ...upd } : x)));
  };

  const eliminarObra = async (id: string) => {
    await db.remove('obras', id);
    setObras((prev) => prev.filter((x) => x.id !== id));
  };

  return (
    <ObraContext.Provider value={{ obras, obraActiva, loading, seleccionar, crearObra, actualizarObra, eliminarObra }}>
      {children}
    </ObraContext.Provider>
  );
}

export function useObra() {
  const ctx = useContext(ObraContext);
  if (!ctx) throw new Error('useObra debe usarse dentro de ObraProvider');
  return ctx;
}
