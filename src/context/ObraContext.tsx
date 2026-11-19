import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Obra } from '../types';
import { listarObras } from '../services/obras';
import { useAuth } from './AuthContext';

interface ObraCtx {
  obras: Obra[];
  obraActiva: Obra | null;
  seleccionar: (id: string) => void;
}

const ObraContext = createContext<ObraCtx | null>(null);
const KEY = 'obra_activa';

export function ObraProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [obras, setObras] = useState<Obra[]>([]);
  const [activeId, setActiveId] = useState<string | null>(() => localStorage.getItem(KEY));

  useEffect(() => {
    if (!user) return;
    listarObras().then(setObras).catch(console.error);
  }, [user]);

  const obraActiva = obras.find((o) => o.id === activeId) ?? obras[0] ?? null;

  const seleccionar = (id: string) => {
    localStorage.setItem(KEY, id);
    setActiveId(id);
  };

  return (
    <ObraContext.Provider value={{ obras, obraActiva, seleccionar }}>
      {children}
    </ObraContext.Provider>
  );
}

export function useObra() {
  const ctx = useContext(ObraContext);
  if (!ctx) throw new Error('useObra debe usarse dentro de ObraProvider');
  return ctx;
}
