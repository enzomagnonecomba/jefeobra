import { createClient } from '@supabase/supabase-js';

const env = import.meta.env;
const url = (env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL) as string | undefined;
const key = (env.VITE_SUPABASE_ANON_KEY ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string | undefined;

const isPlaceholder = (v?: string) => !v || v.includes('TU-PROYECTO') || v.startsWith('tu-');

/** Sin credenciales reales la app corre en "modo demo" con datos en localStorage. */
export const hasSupabase = !isPlaceholder(url) && !isPlaceholder(key);

export const supabase = createClient(hasSupabase ? url! : "http://localhost", hasSupabase ? key! : "placeholder", {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
