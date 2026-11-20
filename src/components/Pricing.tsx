import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { PLANES, TRIAL_DAYS, precio, type Plan } from '../lib/planes';
import { Badge, Segmented, TONE } from './ui';

/**
 * Tarjetas de planes. `onElegir` (dashboard) reemplaza el link de registro (landing).
 * `actual` marca el plan en prueba del usuario.
 */
export function Pricing({ onElegir, actual }: { onElegir?: (p: Plan) => void; actual?: Plan['id'] }) {
  const [anual, setAnual] = useState(false);

  return (
    <div>
      <div className="mb-10 flex flex-col items-center gap-3">
        <Segmented value={anual ? 'anual' : 'mensual'} onChange={(v) => setAnual(v === 'anual')}
          options={[{ value: 'mensual', label: 'Mensual' }, { value: 'anual', label: 'Anual · 2 meses gratis' }]} />
        <p className="flex items-center gap-1.5 text-sm text-muted">
          <Sparkles size={14} className="text-lilac" /> {TRIAL_DAYS} días gratis en cualquier plan · sin tarjeta
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {PLANES.map((p, i) => {
          const esActual = actual === p.id;
          const cta = esActual ? 'Tu plan de prueba' : `Probar ${TRIAL_DAYS} días gratis`;
          const btn = `mt-8 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition ${
            p.destacado ? 'bg-ink text-white shadow-lift hover:-translate-y-0.5' : 'border border-line bg-white hover:border-slate-300'} ${esActual ? 'pointer-events-none opacity-60' : ''}`;
          return (
            <motion.div key={p.id}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              whileHover={{ y: -6 }}
              className={`relative flex flex-col rounded-3xl border bg-white p-7 shadow-soft ${p.destacado ? 'border-lilac/40 ring-4 ring-lilac-bg' : 'border-line'}`}>
              {p.destacado && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-lilac px-3 py-1 text-xs font-bold text-white">Más elegido</span>}
              <div className="flex items-center justify-between">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${TONE[p.tone]}`}>{p.nombre}</span>
                <Badge tone="peach">Próximamente</Badge>
              </div>
              <p className="mt-4 text-sm text-muted">{p.descripcion}</p>
              <p className="mt-5 flex items-end gap-1">
                <motion.span key={`${p.id}-${anual}`} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="text-4xl font-extrabold tracking-tight">
                  US$ {precio(p, anual)}
                </motion.span>
                <span className="mb-1 text-sm text-muted">/ mes</span>
              </p>
              <p className="h-4 text-xs text-muted">{anual ? `Facturado anual: US$ ${precio(p, true) * 12}` : ''}</p>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2"><Check size={16} className="mt-0.5 shrink-0 text-sage" />{f}</li>
                ))}
              </ul>
              {onElegir
                ? <button type="button" onClick={() => onElegir(p)} className={btn}>{cta}</button>
                : <Link to={`/registro?plan=${p.id}`} className={btn}>{cta}</Link>}
            </motion.div>
          );
        })}
      </div>
      <p className="mt-6 text-center text-xs text-muted">Precios de referencia en dólares. Los planes todavía no se cobran: durante el lanzamiento todas las funciones están disponibles.</p>
    </div>
  );
}
