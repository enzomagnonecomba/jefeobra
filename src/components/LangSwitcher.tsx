import { Languages } from 'lucide-react';
import { LANGS, t, useI18n, type Lang } from '../i18n';

/** Selector de idioma compacto: muestra el código (ES/EN/PT) y despliega los nombres completos. */
export function LangSwitcher({ className = '' }: { className?: string }) {
  const { lang, setLang } = useI18n();
  const short = LANGS.find((l) => l.id === lang)?.short ?? 'ES';
  return (
    <label className={`relative inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-2.5 text-xs font-bold text-slate-500 transition focus-within:ring-4 focus-within:ring-lilac-bg hover:bg-slate-100 hover:text-ink ${className}`}
      title={t('Idioma')}>
      <Languages size={17} />
      <span>{short}</span>
      <select aria-label={t('Idioma')} value={lang} onChange={(e) => setLang(e.target.value as Lang)}
        className="absolute inset-0 cursor-pointer opacity-0">
        {LANGS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
      </select>
    </label>
  );
}
