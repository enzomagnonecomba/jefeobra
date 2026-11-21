import { useState } from 'react';
import { Check, Copy, Hash } from 'lucide-react';
import { formatCodigo } from '../lib/estudio';
import { t } from '../i18n';

/** Chip con el ID de la obra y botón para copiarlo. */
export function CodigoObra({ codigo, activo = true, className = '' }: { codigo?: string | null; activo?: boolean; className?: string }) {
  const [ok, setOk] = useState(false);
  const texto = formatCodigo(codigo);
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 font-mono text-xs font-bold tracking-wider ${activo ? 'border-lilac/30 bg-lilac-bg text-lilac' : 'border-line bg-slate-100 text-muted line-through'} ${className}`}>
      <Hash size={12} aria-hidden="true" />
      <span data-testid="codigo-obra">{texto}</span>
      {codigo && (
        <button type="button" title={t('Copiar ID')}
          onClick={async (e) => {
            e.stopPropagation();
            try { await navigator.clipboard.writeText(texto); setOk(true); setTimeout(() => setOk(false), 1500); } catch { /* sin permiso */ }
          }}
          className="ml-0.5 grid h-5 w-5 place-items-center rounded hover:bg-white/60">
          <span className="sr-only">{t('Copiar ID')}</span>
          {ok ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
        </button>
      )}
    </span>
  );
}
