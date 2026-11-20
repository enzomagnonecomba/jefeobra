import { motion } from 'framer-motion';
import { Gem, Clock, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { Pricing } from '../../components/Pricing';
import { Card, PageHeader } from '../../components/ui';
import { PLANES, TRIAL_DAYS, diasDePrueba, type Plan } from '../../lib/planes';
import { t } from '../../i18n';

export default function Planes() {
  const { user, setPlan } = useAuth();
  const toast = useToast();
  const dias = diasDePrueba(user?.created_at);
  const actualId = (user?.user_metadata?.plan as Plan['id'] | undefined) ?? 'profesional';
  const actual = PLANES.find((p) => p.id === actualId) ?? PLANES[1];
  const pct = ((TRIAL_DAYS - dias) / TRIAL_DAYS) * 100;

  async function elegir(p: Plan) {
    try {
      await setPlan(p.id);
      toast.ok(t('Plan {plan} seleccionado para tu prueba', { plan: t(p.nombre) }));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div>
      <PageHeader title={t("Planes")} subtitle={t("Elegí el plan que mejor se adapta a tu forma de trabajar")} icon={Gem} tone="lilac" />

      <Card className="mb-10 overflow-hidden p-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-lilac-bg text-lilac"><Clock size={22} /></div>
          <div className="flex-1">
            <p className="font-bold">
              {dias > 0 ? t(dias === 1 ? 'Te queda {n} día de prueba gratuita' : 'Te quedan {n} días de prueba gratuita', { n: dias }) : t('Tu prueba gratuita terminó')}
            </p>
            <p className="text-sm text-muted">
              {t("Plan en prueba:")} <b className="text-ink">{t(actual.nombre)}</b>. {t("Los planes todavía no se cobran: vas a poder seguir usando todo durante el lanzamiento.")}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-peach-bg px-3 py-1 text-xs font-bold text-peach"><Sparkles size={13} /> {t("Cobros próximamente")}</span>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
          <motion.div className="h-full rounded-full bg-lilac" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} />
        </div>
        <p className="mt-1.5 text-xs text-muted">{dias > 0 ? t('Día {a} de {b}', { a: TRIAL_DAYS - dias + 1, b: TRIAL_DAYS }) : t('Prueba finalizada')}</p>
      </Card>

      <Pricing actual={actualId} onElegir={elegir} />
    </div>
  );
}
