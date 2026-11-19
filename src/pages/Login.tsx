import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type Modo = 'login' | 'registro' | 'recuperar';
const input = 'w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-base';

export default function Login() {
  const { user, signIn, signUp, resetPassword } = useAuth();
  const [modo, setModo] = useState<Modo>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [estudio, setEstudio] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setMsg(null);
    try {
      if (modo === 'login') await signIn(email, password);
      if (modo === 'registro') {
        await signUp(email, password, nombre, estudio);
        setMsg('Revisá tu email para confirmar la cuenta.');
      }
      if (modo === 'recuperar') {
        await resetPassword(email);
        setMsg('Te enviamos un enlace para restablecer la contraseña.');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-6">
        <h1 className="text-xl font-bold text-amber-400">
          {modo === 'login' ? 'Ingresar' : modo === 'registro' ? 'Crear cuenta' : 'Recuperar contraseña'}
        </h1>

        {modo === 'registro' && (
          <>
            <input className={input} placeholder="Tu nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            <input className={input} placeholder="Nombre del estudio" value={estudio} onChange={(e) => setEstudio(e.target.value)} required />
          </>
        )}

        <input className={input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />

        {modo !== 'recuperar' && (
          <input className={input} type="password" placeholder="Contraseña" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}
        {msg && <p className="text-sm text-emerald-400">{msg}</p>}

        <button disabled={busy} className="w-full rounded-md bg-amber-400 py-2 font-semibold text-slate-950 disabled:opacity-50">
          {busy ? 'Procesando…' : modo === 'login' ? 'Entrar' : modo === 'registro' ? 'Registrarme' : 'Enviar enlace'}
        </button>

        <div className="flex justify-between text-sm text-slate-400">
          <button type="button" onClick={() => setModo(modo === 'registro' ? 'login' : 'registro')} className="hover:text-white">
            {modo === 'registro' ? 'Ya tengo cuenta' : 'Crear cuenta'}
          </button>
          <button type="button" onClick={() => setModo(modo === 'recuperar' ? 'login' : 'recuperar')} className="hover:text-white">
            {modo === 'recuperar' ? 'Volver' : '¿Olvidaste la contraseña?'}
          </button>
        </div>
      </form>
    </div>
  );
}
