import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { en } from './en';
import { pt } from './pt';

/**
 * i18n liviano sin dependencias.
 * - El español es el idioma fuente: el texto en español ES la clave.
 * - `t('Texto en español', { n: 3 })` devuelve la traducción del idioma activo
 *   (o el español si falta) e interpola `{n}`.
 * - `t` es una función global: se puede usar en componentes, configs y helpers.
 *   Al cambiar de idioma el árbol se vuelve a montar (key={lang}) para que todo
 *   se re-renderice con el idioma nuevo.
 */
export type Lang = 'es' | 'en' | 'pt';
export const LANGS: { id: Lang; label: string; short: string; locale: string }[] = [
  { id: 'es', label: 'Español', short: 'ES', locale: 'es-AR' },
  { id: 'en', label: 'English', short: 'EN', locale: 'en-US' },
  { id: 'pt', label: 'Português', short: 'PT', locale: 'pt-BR' },
];

const DICTS: Record<Exclude<Lang, 'es'>, Record<string, string>> = { en, pt };
const KEY = 'obrabase:lang';

function detect(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'es' || saved === 'en' || saved === 'pt') return saved;
  } catch { /* storage no disponible */ }
  const nav = (navigator.language || 'es').toLowerCase();
  if (nav.startsWith('pt')) return 'pt';
  if (nav.startsWith('en')) return 'en';
  return 'es';
}

let current: Lang = detect();

export const getLang = () => current;
export const getLocale = () => LANGS.find((l) => l.id === current)!.locale;

export function t(text: string, vars?: Record<string, string | number>): string {
  const out = current === 'es' ? text : (DICTS[current][text] ?? text);
  if (!vars) return out;
  return out.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
}

interface I18nCtx { lang: Lang; setLang: (l: Lang) => void }
const I18nContext = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(current);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = `obrabase · ${t('Control de obra')}`;
  }, [lang]);

  const setLang = (l: Lang) => {
    current = l;
    try { localStorage.setItem(KEY, l); } catch { /* noop */ }
    setLangState(l);
  };

  return (
    <I18nContext.Provider value={{ lang, setLang }}>
      {/* key: re-monta la app para aplicar el idioma en todos lados */}
      <div key={lang} className="contents">{children}</div>
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n debe usarse dentro de I18nProvider');
  return ctx;
}
