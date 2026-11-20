import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, hasSupabase } from '../lib/supabase';

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, nombre: string, estudio: string, plan?: string) => Promise<{ needsConfirmation: boolean }>;
  /** Guarda el plan elegido en los metadatos del usuario (todavía sin cobro). */
  setPlan: (plan: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendConfirmation: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | null>(null);
const MOCK_USER = { id: 'demo-user', email: 'demo@obra.local', created_at: new Date().toISOString(), user_metadata: {} } as unknown as User;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasSupabase) {
      let logged = false;
      try { logged = Boolean(localStorage.getItem('mock_login')); } catch { /* noop */ }
      setUser(logged ? MOCK_USER : null);
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
    if (!hasSupabase) { try { localStorage.setItem('mock_login', '1'); } catch { /* noop */ } setUser(MOCK_USER); return; }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, nombre: string, estudio: string, plan = 'profesional') => {
    if (!hasSupabase) { await signIn(email, password); return { needsConfirmation: false }; }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre, estudio, plan }, emailRedirectTo: `${window.location.origin}/app` },
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
    if (!hasSupabase) { setUser((u) => (u ? ({ ...u, user_metadata: { ...u.user_metadata, plan } } as User) : u)); return; }
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
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, setPlan, resetPassword, resendConfirmation, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
