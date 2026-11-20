import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemePref = 'light' | 'dark' | 'system';
interface ThemeCtx { pref: ThemePref; dark: boolean; setPref: (p: ThemePref) => void; toggle: () => void }

const ThemeContext = createContext<ThemeCtx | null>(null);
const KEY = 'obrabase:theme';
const media = () => window.matchMedia('(prefers-color-scheme: dark)');

const readPref = (): ThemePref => {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch { /* storage no disponible */ }
  return 'system';
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(readPref);
  const [systemDark, setSystemDark] = useState(() => media().matches);

  useEffect(() => {
    const m = media();
    const on = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);

  const dark = pref === 'dark' || (pref === 'system' && systemDark);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const setPref = (p: ThemePref) => {
    try { localStorage.setItem(KEY, p); } catch { /* noop */ }
    setPrefState(p);
  };

  return (
    <ThemeContext.Provider value={{ pref, dark, setPref, toggle: () => setPref(dark ? 'light' : 'dark') }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de ThemeProvider');
  return ctx;
}
