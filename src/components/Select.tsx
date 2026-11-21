import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { TONE, type Tone } from './ui';

export interface SelectOption<V extends string = string> {
  value: V;
  label: string;
  tone?: Tone;
  hint?: string;
}

const DOT: Record<Tone, string> = {
  sage: 'bg-sage', lilac: 'bg-lilac', peach: 'bg-peach', sky: 'bg-sky', rose: 'bg-rose', slate: 'bg-slate-400',
};

interface Props<V extends string> {
  value: V | '';
  options: SelectOption<V>[];
  onChange: (v: V) => void;
  placeholder?: string;
  ariaLabel?: string;
  /** 'field' = input de formulario · 'pill' = badge de estado · 'ghost' = botón compacto (encabezado) */
  variant?: 'field' | 'pill' | 'ghost';
  className?: string;
  /** Contenido custom del botón (si no, muestra la etiqueta de la opción elegida). */
  trigger?: ReactNode;
  icon?: ReactNode;
  menuMinWidth?: number;
  align?: 'start' | 'end';
}

/**
 * Menú desplegable accesible (role=listbox) que reemplaza al <select> nativo.
 * El menú se renderiza en un portal con posición fija, así no lo recortan los
 * modales con scroll, y se abre hacia arriba si no hay lugar abajo.
 */
export function Select<V extends string>({
  value, options, onChange, placeholder = '—', ariaLabel, variant = 'field', className = '', trigger, icon, menuMinWidth = 180, align = 'start',
}: Props<V>) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; up: boolean; maxH: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: '', at: 0 });
  const id = useId();

  const selected = options.find((o) => o.value === value);
  // El nombre accesible incluye el valor visible (WCAG 2.5.3 "label in name").
  // Con trigger propio, el nombre sale del contenido (texto oculto + texto visible).
  const accName = ariaLabel && !trigger ? `${ariaLabel}: ${selected?.label ?? placeholder}` : undefined;
  const selectedIdx = Math.max(0, options.findIndex((o) => o.value === value));

  const place = useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.max(r.width, menuMinWidth);
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const up = below < 220 && above > below;
    let left = align === 'end' ? r.right - width : r.left;
    left = Math.min(Math.max(8, left), window.innerWidth - width - 8);
    setPos({ top: up ? r.top - 6 : r.bottom + 6, left, width, up, maxH: Math.min(320, up ? above : below) });
  }, [align, menuMinWidth]);

  useLayoutEffect(() => { if (open) place(); }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const tgt = e.target as Node;
      if (!btnRef.current?.contains(tgt) && !listRef.current?.contains(tgt)) setOpen(false);
    };
    const onMove = () => place();
    const onEsc = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
    document.addEventListener('keydown', onEsc, true);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      document.removeEventListener('keydown', onEsc, true);
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
  }, [open, place]);

  // Mantiene visible la opción activa al navegar con el teclado.
  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const openMenu = () => { setActive(selectedIdx); setOpen(true); };
  const choose = (i: number) => {
    const o = options[i];
    if (o) onChange(o.value);
    setOpen(false);
    btnRef.current?.focus();
  };

  function onKeyDown(e: KeyboardEvent) {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openMenu(); }
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(options.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(options.length - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(active); }
    else if (e.key === 'Tab') setOpen(false);
    else if (e.key.length === 1) {
      // Búsqueda por tipeo: salta a la opción que empieza con lo escrito.
      const now = Date.now();
      typed.current = { text: (now - typed.current.at < 600 ? typed.current.text : '') + e.key.toLowerCase(), at: now };
      const i = options.findIndex((o) => o.label.toLowerCase().startsWith(typed.current.text));
      if (i >= 0) setActive(i);
    }
  }

  const base = {
    field: 'field flex items-center justify-between gap-2 text-left',
    pill: `relative inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE[selected?.tone ?? 'slate']} hover:brightness-95`,
    ghost: 'inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-ink',
  }[variant];

  return (
    <>
      <button
        ref={btnRef} type="button" aria-label={accName} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? id : undefined}
        onClick={(e) => { e.stopPropagation(); if (open) setOpen(false); else openMenu(); }}
        onKeyDown={onKeyDown}
        className={`${base} outline-none transition focus-visible:ring-4 focus-visible:ring-lilac-bg ${open && variant === 'field' ? 'border-lilac/40 ring-4 ring-lilac-bg' : ''} ${className}`}
      >
        {trigger && ariaLabel && <span className="sr-only">{ariaLabel}: </span>}
        {trigger ?? (
          <span className="flex min-w-0 items-center gap-2">
            {icon}
            {variant === 'field' && selected?.tone && <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[selected.tone]}`} />}
            <span className={`truncate ${selected ? '' : 'text-slate-400'}`}>{selected?.label ?? placeholder}</span>
          </span>
        )}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }} className="shrink-0 opacity-60">
          <ChevronDown size={variant === 'pill' ? 12 : 16} />
        </motion.span>
      </button>

      {createPortal(
        <AnimatePresence>
          {open && pos && (
            <motion.ul
              ref={listRef} id={id} role="listbox" aria-label={ariaLabel} tabIndex={-1}
              aria-activedescendant={`${id}-${active}`}
              initial={{ opacity: 0, y: pos.up ? 6 : -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: pos.up ? 4 : -4, scale: 0.98 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              style={{
                position: 'fixed', left: pos.left, width: pos.width, maxHeight: pos.maxH,
                ...(pos.up ? { bottom: window.innerHeight - pos.top } : { top: pos.top }),
                transformOrigin: pos.up ? 'bottom' : 'top',
              }}
              className="thin-scroll z-[70] overflow-y-auto rounded-2xl border border-line bg-white p-1.5 shadow-lift"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => e.stopPropagation()}
            >
              {options.map((o, i) => {
                const isSel = o.value === value;
                return (
                  <li key={o.value} id={`${id}-${i}`} data-idx={i} role="option" aria-selected={isSel}
                    onMouseEnter={() => setActive(i)} onClick={() => choose(i)}
                    className={`relative flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors ${
                      i === active ? 'bg-slate-100 text-ink' : 'text-slate-600'} ${isSel ? 'font-semibold text-ink' : ''}`}>
                    {o.tone
                      ? <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${TONE[o.tone]}`}><span className={`h-1.5 w-1.5 rounded-full ${DOT[o.tone]}`} />{o.label}</span>
                      : (
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate">{o.label}</span>
                          {o.hint && <span className="truncate text-xs font-normal text-muted">{o.hint}</span>}
                        </span>
                      )}
                    {isSel && <Check size={15} className="ml-auto shrink-0 text-lilac" />}
                  </li>
                );
              })}
            </motion.ul>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
