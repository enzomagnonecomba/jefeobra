import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, hasSupabase } from '../lib/supabase';
import { Logo } from '../components/Logo';
import { Button, Card } from '../components/ui';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!hasSupabase) return navigate('/login');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setMsg(error.message);
    else navigate('/app');
  }

  return (
    <div className="grid min-h-screen place-items-center p-4">
      <Card className="w-full max-w-sm p-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Logo />
        <h1 className="mb-6 mt-6 text-2xl font-bold">Nueva contraseña</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <input type="password" minLength={6} required placeholder="Mínimo 6 caracteres" value={password}
            onChange={(e) => setPassword(e.target.value)} className="field py-3" />
          {msg && <p className="rounded-xl bg-peach-bg px-3 py-2 text-sm text-peach">{msg}</p>}
          <Button type="submit" className="w-full">Guardar</Button>
        </form>
      </Card>
    </div>
  );
}
