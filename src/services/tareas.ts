import { supabase, hasSupabase } from '../lib/supabase';
import type { NuevaTarea, Tarea, TareaEstado } from '../types';
import { MOCK_TAREAS } from './mock';

// Almacén en memoria para el modo demo
let memoria: Tarea[] = [...MOCK_TAREAS];

export async function listarTareas(obraId: string): Promise<Tarea[]> {
  if (!hasSupabase) return memoria.filter((t) => t.obra_id === obraId);
  const { data, error } = await supabase
    .from('tareas')
    .select('*')
    .eq('obra_id', obraId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data as Tarea[];
}

export async function cambiarEstado(id: string, estado: TareaEstado): Promise<void> {
  if (!hasSupabase) {
    memoria = memoria.map((t) => (t.id === id ? { ...t, estado } : t));
    return;
  }
  const { error } = await supabase.from('tareas').update({ estado }).eq('id', id);
  if (error) throw error;
}

export async function crearTarea(input: NuevaTarea): Promise<void> {
  if (!hasSupabase) {
    memoria = [...memoria, { ...input, id: crypto.randomUUID(), updated_at: new Date().toISOString() }];
    return;
  }
  const { error } = await supabase.from('tareas').insert(input);
  if (error) throw error;
}
