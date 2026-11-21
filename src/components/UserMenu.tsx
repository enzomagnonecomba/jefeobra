import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Building2, Gem, LogOut, Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { diasDePrueba } from '../lib/planes';
import { rolLabel } from '../lib/roles';
import { t } from '../i18n';

/** Avatar con menú de cuenta: email, prueba, planes, obras, tema y cerrar sesión. */
export function UserMenu() {
  const { user, rol, signOut } = useAuth();
  const esJefe = rol === 'jefe_obra';
  const { dark, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const trial = diasDePrueba(user?.created_at);
  const nombre = (user?.user_metadata?.nombre as string | undefined) ?? user?.email?.split('@')[0] ?? '';
  const initial = nombre[0] ?? '?';

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const item = 'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-ink';

  return (
    <div ref={ref} className="relative shrink-0">
      <button onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open} aria-label={t('Mi cuenta')}
        className="grid h-9 w-9 place-items-center rounded-full bg-lilac-bg text-sm font-bold uppercase text-lilac outline-none ring-lilac/30 transition hover:ring-4 focus-visible:ring-4">
        {initial}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 top-11 z-50 w-64 origin-top-right rounded-2xl border border-line bg-white p-1.5 shadow-lift">
            <div className="px-3 pb-2 pt-2">
              <p className="truncate text-sm font-bold">{nombre}</p>
              <p className="truncate text-xs text-muted">{user?.email}</p>
              <p className="mt-1 text-xs font-semibold text-lilac">{rolLabel(rol)}</p>
            </div>
            {esJefe && <Link to="/app/planes" onClick={() => setOpen(false)} role="menuitem"
              className="mx-1.5 mb-1.5 flex items-center gap-2 rounded-xl bg-lilac-bg px-3 py-2 text-xs font-semibold text-lilac">
              <Gem size={14} /> {trial > 0 ? t(trial === 1 ? 'Prueba gratis · {n} día' : 'Prueba gratis · {n} días', { n: trial }) : t('Prueba finalizada')}
            </Link>}
            <div className="my-1 h-px bg-line" />
            {esJefe && <><Link to="/app/obras" onClick={() => setOpen(false)} role="menuitem" className={item}><Building2 size={17} /> {t('Mis obras')}</Link>
            <Link to="/app/planes" onClick={() => setOpen(false)} role="menuitem" className={item}><Gem size={17} /> {t('Planes')}</Link></>}
            <button onClick={toggle} role="menuitem" className={item}>
              {dark ? <Sun size={17} /> : <Moon size={17} />} {dark ? t('Cambiar a modo claro') : t('Cambiar a modo oscuro')}
            </button>
            <div className="my-1 h-px bg-line" />
            <button onClick={signOut} role="menuitem" className={`${item} text-peach hover:bg-peach-bg hover:text-peach`}><LogOut size={17} /> {t('Cerrar sesión')}</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
