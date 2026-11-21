export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="#1F2937" />
        <path d="M8 23V13l8-5 8 5v10" fill="none" stroke="#D1FAE5" strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M13 23v-5h6v5" fill="none" stroke="#EDE9FE" strokeWidth="2.2" strokeLinejoin="round" />
      </svg>
      {!compact && <span className="text-lg font-extrabold tracking-tight">obra<span className="text-slate-500">base</span></span>}
    </span>
  );
}
