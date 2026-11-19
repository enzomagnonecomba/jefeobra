import { supabase, hasSupabase } from '../lib/supabase';
import type { Obra } from '../types';
import { MOCK_OBRAS } from './mock';

export async function listarObras(): Promise<Obra[]> {
  if (!hasSupabase) return MOCK_OBRAS;
  const { data, error } = await supabase
    .from('obras')
    .select('id, nombre, direccion, estado')
    .order('nombre');
  if (error) throw error;
  return data as Obra[];
}
