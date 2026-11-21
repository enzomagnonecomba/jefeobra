import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, CheckCircle2, AlertTriangle, LogIn, UserPlus, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Logo';
import { Button, Card } from '../components/ui';
import { LangSwitcher } from '../components/LangSwitcher';
import { aceptarInvitacion, verInvitacion, type InfoInvitacion } from '../lib/estudio';
import { t } from '../i18n';

const ERRORES: Record<string, string> = {
  get invitacion_invalida() { return t('Este link de invitación no existe o fue revocado.'); },
  get invitacion_usada() { return t('Esta invitación ya fue aceptada por otra cuenta. Pedile un link nuevo al jefe de obra.'); },
  get invitacion_propia() { return t('Esta invitación la creaste vos. Compartila con el administrativo del estudio.'); },
  get rol_no_admitido() { return t('Tu cuenta es de Jefe de obra. Para aceptar invitaciones necesitás una cuenta de Compras o Dirección de obra.'); },
};

export default function Invitacion() {
  const { token = '' } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [info, setInfo] = useState<InfoInvitacion | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const next = `/invitacion/${token}`;

  useEffect(() => {
    if (!user) return;
    verInvitacion(token).then(setInfo).catch((e) => setError((e as Error).message));
  }, [user, token]);

  async function aceptar() {
    setBusy(true); setError(null);
    try {
      await aceptarInvitacion(token);
      navigate('/app/estudio', { replace: true });
    } catch (e) {
      const m = (e as Error).message;
      setError(Object.keys(ERRORES).find((k) => m.includes(k)) ? ERRORES[Object.keys(ERRORES).find((k) => m.includes(k))!] : m);
    } finally { setBusy(false); }
  }

  const quien = info?.owner_nombre ?? t('Un jefe de obra');
  const que = info?.todas ? t('todas sus obras') : t('la obra «{x}»', { x: info?.obra_nombre ?? '' });

  let body: React.ReactNode;
  if (loading || (user && info === undefined && !error)) {
    body = <p className="py-6 text-center text-sm text-muted">{t('Cargando…')}</p>;
  } else if (!user) {
    body = (
      <>
        <h1 className="text-xl font-bold">{t('Te invitaron a obrabase')}</h1>
        <p className="mt-2 text-sm text-muted">{t('Ingresá o creá tu cuenta para aceptar la invitación y ver las obras compartidas con vos.')}</p>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Link to={`/login?next=${encodeURIComponent(next)}`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold shadow-soft"><LogIn size={16} /> {t('Ingresar')}</Link>
          <Link to={`/registro?next=${encodeURIComponent(next)}`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-soft"><UserPlus size={16} /> {t('Crear cuenta')}</Link>
        </div>
      </>
    );
  } else if (!info || info.es_propia || error || (info.mi_rol === 'jefe_obra' && !info.es_mia)) {
    const msg = error ?? (info?.es_propia ? ERRORES.invitacion_propia : info?.mi_rol === 'jefe_obra' ? ERRORES.rol_no_admitido : ERRORES.invitacion_invalida);
    body = (
      <>
        <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-peach-bg text-peach"><AlertTriangle size={22} /></div>
        <h1 className="text-xl font-bold">{t('No se pudo usar la invitación')}</h1>
        <p className="mt-2 text-sm text-muted">{msg}</p>
        <Link to="/app" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-lilac">{t('Ir al panel')} <ArrowRight size={16} /></Link>
      </>
    );
  } else if (info.es_mia) {
    body = (
      <>
        <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-sage-bg text-sage"><CheckCircle2 size={22} /></div>
        <h1 className="text-xl font-bold">{t('Ya estás conectado')}</h1>
        <p className="mt-2 text-sm text-muted">{t('Ya aceptaste esta invitación. Podés ver las obras desde el Panel del estudio.')}</p>
        <Button className="mt-6 w-full" icon={ArrowRight} onClick={() => navigate('/app/estudio')}>{t('Ir al Panel del estudio')}</Button>
      </>
    );
  } else if (info.estado === 'activo') {
    body = (
      <>
        <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-peach-bg text-peach"><AlertTriangle size={22} /></div>
        <h1 className="text-xl font-bold">{t('No se pudo usar la invitación')}</h1>
        <p className="mt-2 text-sm text-muted">{ERRORES.invitacion_usada}</p>
      </>
    );
  } else {
    body = (
      <>
        <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-lilac-bg text-lilac"><Building2 size={22} /></div>
        <h1 className="text-xl font-bold">{t('{x} te invitó a su equipo', { x: quien })}</h1>
        {info.owner_estudio && <p className="text-sm font-semibold text-lilac">{info.owner_estudio}</p>}
        <p className="mt-3 text-sm text-muted">{info.mi_rol === 'direccion_obra'
          ? t('Como Dirección de obra vas a poder ver el resumen de tareas de {x}.', { x: que })
          : t('Como Compras vas a poder aprobar o rechazar los pedidos de {x} y gestionar sus fletes y volquetes.', { x: que })}</p>
        <p className="mt-2 text-xs text-muted">{t('Vas a ingresar como {x}.', { x: user.email ?? '' })}</p>
        <Button className="mt-6 w-full" icon={CheckCircle2} disabled={busy} onClick={aceptar}>{busy ? t('Procesando…') : t('Aceptar invitación')}</Button>
      </>
    );
  }

  return (
    <div className="flex min-h-screen flex-col px-4 py-6 sm:px-6">
      <div className="mx-auto flex w-full max-w-md items-center justify-between">
        <Link to="/"><Logo /></Link>
        <LangSwitcher />
      </div>
      <div className="flex flex-1 items-center justify-center py-10">
        <Card className="w-full max-w-md p-6 sm:p-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <motion.div key={String(!!user) + String(info?.estado)} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{body}</motion.div>
        </Card>
      </div>
    </div>
  );
}
