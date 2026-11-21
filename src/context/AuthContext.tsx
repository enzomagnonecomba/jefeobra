import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, hasSupabase } from '../lib/supabase';
import { rolDe, type Rol } from '../lib/roles';

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, nombre: string, estudio: string, plan?: string, rol?: Rol) => Promise<{ needsConfirmation: boolean }>;
  /** Rol elegido al registrarse (jefe de obra por defecto). */
  rol: Rol;
  /** Guarda el plan elegido en los metadatos del usuario (todavía sin cobro). */
  setPlan: (plan: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendConfirmation: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | null>(null);
// Modo demo: los metadatos (rol, plan, nombre) se guardan en el navegador para poder probar cada rol.
const META_KEY = 'mock_meta';
const readMeta = (): Record<string, string> => { try { return JSON.parse(localStorage.getItem(META_KEY) ?? '{}'); } catch { return {}; } };
const writeMeta = (m: Record<string, string>) => { try { localStorage.setItem(META_KEY, JSON.stringify(m)); } catch { /* noop */ } };
const mockUser = () => ({ id: 'demo-user', email: 'demo@obra.local', created_at: new Date().toISOString(), user_metadata: readMeta() }) as unknown as User;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasSupabase) {
      let logged = false;
      try { logged = Boolean(localStorage.getItem('mock_login')); } catch { /* noop */ }
      setUser(logged ? mockUser() : null);
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!hasSupabase) { try { localStorage.setItem('mock_login', '1'); } catch { /* noop */ } setUser(mockUser()); return; }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, nombre: string, estudio: string, plan = 'profesional', rol: Rol = 'jefe_obra') => {
    if (!hasSupabase) { writeMeta({ nombre, estudio, plan, rol }); await signIn(email, password); return { needsConfirmation: false }; }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre, estudio, plan, rol }, emailRedirectTo: `${window.location.origin}/app` },
    });
    if (error) throw error;
    // Con confirmación de email activa, Supabase no devuelve error si el email ya
    // existe: responde un usuario "falso" sin identidades. Lo detectamos acá.
    if (data.user && data.user.identities?.length === 0) {
      throw Object.assign(new Error('User already registered'), { code: 'user_already_exists' });
    }
    return { needsConfirmation: !data.session };
  };

  const setPlan = async (plan: string) => {
    if (!hasSupabase) { writeMeta({ ...readMeta(), plan }); setUser(mockUser()); return; }
    const { data, error } = await supabase.auth.updateUser({ data: { plan } });
    if (error) throw error;
    setUser(data.user);
  };

  const resendConfirmation = async (email: string) => {
    if (!hasSupabase) return;
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/app` },
    });
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    if (!hasSupabase) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    if (!hasSupabase) { try { localStorage.removeItem('mock_login'); } catch { /* noop */ } setUser(null); return; }
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, rol: rolDe(user), signIn, signUp, setPlan, resetPassword, resendConfirmation, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
