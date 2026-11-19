import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, hasSupabase } from '../lib/supabase';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!hasSupabase) return navigate('/login');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setMsg(error.message);
    else navigate('/');
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto mt-24 max-w-sm space-y-4 p-6">
      <h1 className="text-xl font-bold text-amber-400">Nueva contraseña</h1>
      <input
        type="password"
        minLength={6}
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2"
      />
      {msg && <p className="text-sm text-red-400">{msg}</p>}
      <button className="w-full rounded-md bg-amber-400 py-2 font-semibold text-slate-950">Guardar</button>
    </form>
  );
}
