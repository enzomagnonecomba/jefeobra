import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Mail, Lock, User, Building2, KanbanSquare, Wallet, PackageCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { hasSupabase } from '../lib/supabase';
import { Logo } from '../components/Logo';
import { Button } from '../components/ui';
import { ThemeToggle } from '../components/ThemeToggle';
import { LangSwitcher } from '../components/LangSwitcher';
import { PLANES, TRIAL_DAYS } from '../lib/planes';
import { t } from '../i18n';

type Modo = 'login' | 'registro' | 'recuperar';

function Input({ icon: Icon, ...rest }: { icon: typeof Mail } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Icon size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
      <input className="field py-3 pl-10" {...rest} />
    </div>
  );
}

export default function Login() {
  const { user, signIn, signUp, resetPassword, resendConfirmation } = useAuth();
  const location = useLocation();
  // Volver a donde venía (ej. una invitación). Solo rutas internas.
  const rawNext = new URLSearchParams(location.search).get('next') ?? '';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/app';
  const qs = next !== '/app' ? `?next=${encodeURIComponent(next)}` : '';
  const navigate = useNavigate();
  const [modo, setModo] = useState<Modo>(location.pathname === '/registro' ? 'registro' : 'login');
  const plan = PLANES.find((p) => p.id === new URLSearchParams(location.search).get('plan')) ?? PLANES[1];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [estudio, setEstudio] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<{ text: string; action?: 'login' | 'registro' | 'reenviar' } | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={next} replace />;

  const cambiar = (m: Modo) => {
    setModo(m); setError(null); setMsg(null);
    if (m !== 'recuperar') navigate((m === 'registro' ? '/registro' : '/login') + qs, { replace: true });
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setMsg(null);
    try {
      if (modo === 'login') await signIn(email, password);
      if (modo === 'registro') {
        const { needsConfirmation } = await signUp(email, password, nombre, estudio, plan.id);
        if (needsConfirmation) setMsg(t('¡Cuenta creada! Revisá tu email para confirmarla y después ingresá.'));
      }
      if (modo === 'recuperar') {
        await resetPassword(email);
        setMsg(t('Si el email existe, te enviamos un enlace para restablecer la contraseña.'));
      }
    } catch (err) {
      const { code, message } = err as { code?: string; message: string };
      const is = (c: string, m: string) => code === c || message === m;
      if (is('user_already_exists', 'User already registered')) {
        setError({ text: t('Ya existe una cuenta con este email.'), action: 'login' });
      } else if (is('invalid_credentials', 'Invalid login credentials')) {
        setError({ text: t('Email o contraseña incorrectos. Si todavía no tenés cuenta, registrate.'), action: 'registro' });
      } else if (is('email_not_confirmed', 'Email not confirmed')) {
        setError({ text: t('Todavía no confirmaste tu email. Revisá tu bandeja (y spam).'), action: 'reenviar' });
      } else if (code === 'over_email_send_rate_limit' || /rate limit/i.test(message)) {
        setError({ text: t('Demasiados intentos. Esperá unos minutos y volvé a probar.') });
      } else if (code === 'weak_password') {
        setError({ text: t('La contraseña es muy débil. Usá al menos 6 caracteres con letras y números.') });
      } else {
        setError({ text: message });
      }
    } finally {
      setBusy(false);
    }
  }

  async function reenviar() {
    setBusy(true);
    try {
      await resendConfirmation(email);
      setError(null);
      setMsg(t('Te reenviamos el email de confirmación.'));
    } catch (err) {
      setError({ text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const titulos: Record<Modo, [string, string]> = {
    login: [t('Bienvenido de nuevo'), t('Ingresá para ver tus obras.')],
    registro: [t('Creá tu cuenta'), t('Tu espacio de trabajo privado en un minuto.')],
    recuperar: [t('Recuperar contraseña'), t('Te enviamos un enlace a tu email.')],
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center justify-between">
          <Link to="/"><Logo /></Link>
          <div className="flex items-center gap-1">
            <LangSwitcher />
            <ThemeToggle />
            <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={16} /> {t("Volver")}</Link>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">
            <AnimatePresence mode="wait">
              <motion.div key={modo} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
                <h1 className="text-3xl font-extrabold tracking-tight">{titulos[modo][0]}</h1>
                <p className="mb-8 mt-2 text-muted">{titulos[modo][1]}</p>
                {modo === 'registro' && (
                  <p className="-mt-4 mb-6 inline-flex items-center gap-1.5 rounded-full bg-lilac-bg px-3 py-1 text-xs font-semibold text-lilac">
                    {t("Plan {plan} · {n} días gratis, sin tarjeta", { plan: t(plan.nombre), n: TRIAL_DAYS })}
                  </p>
                )}

                {modo !== 'recuperar' && (
                  <div className="mb-6 grid grid-cols-2 rounded-xl border border-line bg-white p-1 shadow-soft">
                    {(['login', 'registro'] as const).map((m) => (
                      <button key={m} type="button" onClick={() => cambiar(m)} className={`relative rounded-lg py-2 text-sm font-semibold ${modo === m ? 'text-ink' : 'text-muted'}`}>
                        {modo === m && <motion.span layoutId="auth-tab" className="absolute inset-0 rounded-lg bg-slate-100" />}
                        <span className="relative">{m === 'login' ? t('Login') : t('Register')}</span>
                      </button>
                    ))}
                  </div>
                )}

                <form onSubmit={onSubmit} className="space-y-3">
                  {modo === 'registro' && (
                    <>
                      <Input icon={User} placeholder={t("Tu nombre")} autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
                      <Input icon={Building2} placeholder={t("Estudio / empresa (opcional)")} value={estudio} onChange={(e) => setEstudio(e.target.value)} />
                    </>
                  )}
                  <Input icon={Mail} type="email" placeholder={t("Email")} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  {modo !== 'recuperar' && (
                    <Input icon={Lock} type="password" placeholder={t("Contraseña (mín. 6 caracteres)")} autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
                      minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
                  )}

                  {error && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl bg-peach-bg px-3 py-2 text-sm font-medium text-peach">
                      {error.text}
                      {error.action === 'login' && <> <button type="button" onClick={() => cambiar('login')} className="font-bold underline">{t("Ingresá")}</button> {t("o")} <button type="button" onClick={() => cambiar('recuperar')} className="font-bold underline">{t("recuperá tu contraseña")}</button>.</>}
                      {error.action === 'registro' && <> <button type="button" onClick={() => cambiar('registro')} className="font-bold underline">{t("Crear cuenta")}</button></>}
                      {error.action === 'reenviar' && <> <button type="button" onClick={reenviar} disabled={busy} className="font-bold underline">{t("Reenviar email")}</button></>}
                    </motion.div>
                  )}
                  {msg && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl bg-sage-bg px-3 py-2 text-sm font-medium text-sage">{msg}</motion.p>}

                  <Button type="submit" disabled={busy} className="w-full py-3">
                    {busy ? t('Procesando…') : modo === 'login' ? t('Ingresar') : modo === 'registro' ? t('Crear cuenta') : t('Enviar enlace')}
                  </Button>
                </form>

                <div className="mt-5 text-center text-sm">
                  {modo === 'login' && <button type="button" onClick={() => cambiar('recuperar')} className="font-medium text-muted hover:text-ink">{t("¿Olvidaste tu contraseña?")}</button>}
                  {modo === 'recuperar' && <button type="button" onClick={() => cambiar('login')} className="font-medium text-muted hover:text-ink">{t("Volver al login")}</button>}
                </div>
                {!hasSupabase && (
                  <p className="mt-6 rounded-xl border border-dashed border-line p-3 text-center text-xs text-muted">
                    {t("Modo demo: Supabase no está configurado. Cualquier email/contraseña entra con datos de ejemplo guardados en este navegador.")}
                  </p>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-ink lg:block">
        <div className="absolute -left-20 top-20 h-80 w-80 rounded-full bg-lilac/40 blur-3xl" />
        <div className="absolute bottom-10 right-0 h-80 w-80 rounded-full bg-sky/40 blur-3xl" />
        <div className="relative flex h-full flex-col justify-center px-16 text-white">
          <p className="max-w-md text-3xl font-bold leading-tight">{t("“Ahora sé qué se pidió, qué se gastó y qué falta, sin llamar a nadie.”")}</p>
          <p className="mt-4 text-slate-400">{t("Así trabaja un jefe de obra con orden.")}</p>
          <div className="mt-12 space-y-3">
            {[
              { icon: KanbanSquare, t: 'Tareas al día', c: 'bg-sky-bg text-sky' },
              { icon: PackageCheck, t: 'Pedidos con trazabilidad', c: 'bg-peach-bg text-peach' },
              { icon: Wallet, t: 'Caja chica que cierra', c: 'bg-sage-bg text-sage' },
            ].map((x, i) => (
              <motion.div key={x.t} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.12 }}
                className="flex w-fit items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
                <span className={`grid h-9 w-9 place-items-center rounded-xl ${x.c}`}><x.icon size={18} /></span>
                <span className="font-semibold">{t(x.t)}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
