import { AnimatePresence, motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { t } from '../i18n';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { dark, toggle } = useTheme();
  const label = dark ? t('Cambiar a modo claro') : t('Cambiar a modo oscuro');
  return (
    <button onClick={toggle} aria-label={label} title={label}
      className={`relative grid h-9 w-9 place-items-center overflow-hidden rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-ink ${className}`}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={dark ? 'moon' : 'sun'}
          initial={{ y: -14, opacity: 0, rotate: -60 }} animate={{ y: 0, opacity: 1, rotate: 0 }} exit={{ y: 14, opacity: 0, rotate: 60 }}
          transition={{ duration: 0.2 }}>
          {dark ? <Moon size={18} /> : <Sun size={18} />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
