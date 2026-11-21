import { Languages } from 'lucide-react';
import { LANGS, t, useI18n, type Lang } from '../i18n';
import { Select } from './Select';

/** Selector de idioma compacto: muestra el código (ES/EN/PT) y despliega los nombres completos. */
export function LangSwitcher({ className = '' }: { className?: string }) {
  const { lang, setLang } = useI18n();
  const short = LANGS.find((l) => l.id === lang)?.short ?? 'ES';
  return (
    <Select<Lang> variant="ghost" align="end" menuMinWidth={170} value={lang} onChange={setLang} ariaLabel={t('Idioma')}
      className={`shrink-0 ${className}`}
      trigger={<span className="flex items-center gap-1.5"><Languages size={17} />{short}</span>}
      options={LANGS.map((l) => ({ value: l.id, label: l.label, hint: l.short }))} />
  );
}
