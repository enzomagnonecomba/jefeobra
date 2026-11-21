import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { AnimatePresence, motion, type HTMLMotionProps } from 'framer-motion';
import { X, type LucideIcon } from 'lucide-react';
import { t } from '../i18n';

// ---------- Tonos pastel ----------
export type Tone = 'sage' | 'lilac' | 'peach' | 'sky' | 'rose' | 'slate';
export const TONE: Record<Tone, string> = {
  sage: 'bg-sage-bg text-sage',
  lilac: 'bg-lilac-bg text-lilac',
  peach: 'bg-peach-bg text-peach',
  sky: 'bg-sky-bg text-sky',
  rose: 'bg-rose-bg text-rose',
  slate: 'bg-slate-100 text-slate-600',
};

// ---------- Formateo ----------
const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
export const fmtMoney = (n: number | string | null | undefined) => money.format(Number(n ?? 0));
export const fmtDate = (s: string | null | undefined) => {
  if (!s) return '—';
  const [y, m, d] = s.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};
/** Fecha local (no UTC) en formato YYYY-MM-DD. */
export const today = () => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};
export const daysUntil = (s: string) => {
  const a = new Date(`${s.slice(0, 10)}T00:00:00`);
  const b = new Date(`${today()}T00:00:00`);
  return Math.round((a.getTime() - b.getTime()) / 86400000);
};

// ---------- Primitivos ----------
type BtnVariant = 'primary' | 'ghost' | 'soft' | 'danger';
const BTN: Record<BtnVariant, string> = {
  primary: 'bg-ink text-white hover:bg-slate-700 shadow-soft',
  ghost: 'text-slate-600 hover:bg-slate-100',
  soft: 'bg-white border border-line text-ink hover:border-slate-300 shadow-soft',
  danger: 'text-peach hover:bg-peach-bg',
};

export function Button({
  variant = 'primary', icon: Icon, children, className = '', ...rest
}: { variant?: BtnVariant; icon?: LucideIcon } & Omit<HTMLMotionProps<'button'>, 'children'> & { children?: ReactNode }) {
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97 }}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 ${BTN[variant]} ${className}`}
      {...rest}
    >
      {Icon && <Icon size={16} strokeWidth={2.2} />}
      {children}
    </motion.button>
  );
}

export function IconButton({ icon: Icon, label, className = '', ...rest }: { icon: LucideIcon; label: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button aria-label={label} title={label} className={`grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-ink ${className}`} {...rest}>
      <Icon size={16} />
    </button>
  );
}

export function Card({ children, className = '', ...rest }: HTMLMotionProps<'div'>) {
  return (
    <motion.div className={`rounded-2xl border border-line bg-white shadow-soft ${className}`} {...rest}>
      {children}
    </motion.div>
  );
}

export function Badge({ tone = 'slate', children, className = '' }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function PageHeader({ title, subtitle, icon: Icon, tone = 'lilac', actions }: {
  title: string; subtitle?: string; icon?: LucideIcon; tone?: Tone; actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-6 sm:gap-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={`grid h-11 w-11 place-items-center rounded-2xl ${TONE[tone]}`}>
            <Icon size={20} />
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, tone = 'sky', hint }: {
  label: string; value: ReactNode; icon: LucideIcon; tone?: Tone; hint?: ReactNode;
}) {
  return (
    <Card className="p-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted">{label}</p>
        <div className={`grid h-9 w-9 place-items-center rounded-xl ${TONE[tone]}`}><Icon size={17} /></div>
      </div>
      <p className="mt-2 truncate text-2xl font-bold tracking-tight">{value}</p>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </Card>
  );
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-white/60 px-6 py-14 text-center">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-lilac-bg text-lilac"><Icon size={22} /></div>
      <p className="font-semibold">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/25 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            role="dialog" aria-modal="true" aria-label={title}
            className={`max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-lift sm:rounded-3xl sm:p-6 ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`}
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold">{title}</h2>
              <IconButton icon={X} label={t("Cerrar")} onClick={onClose} />
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-line bg-white p-1 shadow-soft">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`relative shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${value === o.value ? 'text-ink' : 'text-muted hover:text-ink'}`}
        >
          {value === o.value && (
            <motion.span layoutId={`seg-${options.map((x) => x.value).join()}`} className="absolute inset-0 rounded-lg bg-slate-100" transition={{ type: 'spring', damping: 30, stiffness: 400 }} />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export const PRIORIDAD_TONE = { critica: 'rose', alta: 'peach', media: 'sky', baja: 'slate' } as const;
export const PRIORIDAD_LABEL = {
  get critica() { return t('Crítica'); },
  get alta() { return t('Alta'); },
  get media() { return t('Media'); },
  get baja() { return t('Baja'); },
};
