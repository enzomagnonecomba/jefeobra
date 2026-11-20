import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Search, Trash2, Pencil, type LucideIcon } from 'lucide-react';
import { useTable } from '../hooks/useTable';
import { useToast } from './Toast';
import { Badge, Button, Card, EmptyState, Field, IconButton, Modal, PageHeader, TONE, fmtDate, fmtMoney, today, type Tone } from './ui';
import type { Row, TableName } from '../types';
import { t } from '../i18n';

export interface Option { value: string; label: string; tone?: Tone }

export interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'money' | 'date' | 'select' | 'textarea';
  options?: Option[];
  required?: boolean;
  placeholder?: string;
  full?: boolean;
  defaultValue?: string | number | (() => string | number);
}

export interface ColumnDef<T> {
  key: string;
  label: string;
  align?: 'right';
  render?: (row: T) => ReactNode;
}

export interface CrudConfig<T extends Row> {
  table: TableName;
  title: string;
  subtitle: string;
  singular: string;
  icon: LucideIcon;
  tone: Tone;
  fields: FieldDef[];
  columns: ColumnDef<T>[];
  statusKey?: string;
  searchKeys: string[];
  orderBy?: string;
  ascending?: boolean;
  summary?: (rows: T[]) => ReactNode;
  rowAccent?: (row: T) => Tone | null;
}

type AnyRow = Row & Record<string, unknown>;

const ROW_ACCENT: Record<Tone, string> = {
  sage: 'bg-sage-bg/40', lilac: 'bg-lilac-bg/40', peach: 'bg-peach-bg/50',
  sky: 'bg-sky-bg/40', rose: 'bg-rose-bg/50', slate: 'bg-slate-50',
};

/** Celda automática según el tipo de campo. */
function autoCell(field: FieldDef | undefined, value: unknown): ReactNode {
  if (value === null || value === undefined || value === '') return <span className="text-slate-300">—</span>;
  if (!field) return String(value);
  if (field.type === 'money') return <span className="font-semibold tabular-nums">{fmtMoney(value as number)}</span>;
  if (field.type === 'date') return <span className="tabular-nums">{fmtDate(String(value))}</span>;
  if (field.type === 'select') {
    const o = field.options?.find((x) => x.value === value);
    return o?.tone ? <Badge tone={o.tone}>{t(o.label)}</Badge> : (o ? t(o.label) : String(value));
  }
  return String(value);
}

function StatusPill({ field, value, onChange }: { field: FieldDef; value: string; onChange: (v: string) => void }) {
  const o = field.options?.find((x) => x.value === value);
  return (
    <span className={`relative inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE[o?.tone ?? 'slate']}`}>
      {o ? t(o.label) : value}
      <select
        aria-label={t('Cambiar {x}', { x: t(field.label) })}
        className="absolute inset-0 cursor-pointer opacity-0"
        value={value}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onChange(e.target.value)}
      >
        {field.options?.map((x) => <option key={x.value} value={x.value}>{t(x.label)}</option>)}
      </select>
    </span>
  );
}

export default function CrudModule<T extends Row>({ config }: { config: CrudConfig<T> }) {
  const { table, title, subtitle, singular, icon, tone, fields, columns, statusKey, searchKeys, orderBy, ascending, summary, rowAccent } = config;
  const { rows: rawRows, loading, create, patch, destroy } = useTable<T>(table, orderBy, ascending);
  const rows = rawRows as unknown as AnyRow[];
  const toast = useToast();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('todos');
  const [editing, setEditing] = useState<AnyRow | 'new' | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const statusField = fields.find((f) => f.key === statusKey);
  const fieldByKey = useMemo(() => Object.fromEntries(fields.map((f) => [f.key, f])), [fields]);

  const filtered = useMemo(() => rows.filter((r) =>
    (status === 'todos' || r[statusKey ?? ''] === status) &&
    (!q || searchKeys.some((k) => String(r[k] ?? '').toLowerCase().includes(q.toLowerCase()))),
  ), [rows, q, status, statusKey, searchKeys]);

  function openForm(row: AnyRow | 'new') {
    const init: Record<string, string> = {};
    for (const f of fields) {
      const def = typeof f.defaultValue === 'function' ? f.defaultValue() : f.defaultValue;
      const v = row === 'new' ? (def ?? (f.type === 'date' && f.required ? today() : f.options?.[0]?.value ?? '')) : row[f.key];
      init[f.key] = v === null || v === undefined ? '' : String(v);
    }
    setForm(init);
    setConfirmDelete(false);
    setEditing(row);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const values: Record<string, unknown> = {};
    for (const f of fields) {
      const v = form[f.key]?.trim?.() ?? '';
      values[f.key] = v === '' ? null : f.type === 'number' || f.type === 'money' ? Number(v) : v;
    }
    setBusy(true);
    try {
      if (editing === 'new') {
        await create(values as Partial<T>);
        toast.ok(t('Registro guardado'));
      } else if (editing) {
        await patch(editing.id, values as Partial<T>);
        toast.ok(t('Cambios guardados'));
      }
      setEditing(null);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!editing || editing === 'new') return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    await destroy(editing.id);
    toast.ok(t('Registro eliminado'));
    setEditing(null);
  }

  return (
    <div>
      <PageHeader title={t(title)} subtitle={t(subtitle)} icon={icon} tone={tone}
        actions={<Button icon={Plus} onClick={() => openForm('new')}>{t('Agregar {x}', { x: t(singular).toLowerCase() })}</Button>} />

      {summary && !loading && <div className="mb-6">{summary(rawRows)}</div>}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="field pl-9" placeholder={t("Buscar…")} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {statusField && (
          <div className="flex flex-wrap gap-1.5">
            {[{ value: 'todos', label: 'Todos', tone: 'slate' as Tone }, ...(statusField.options ?? [])].map((o) => (
              <button key={o.value} onClick={() => setStatus(o.value)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${status === o.value ? `${TONE[o.tone ?? 'slate']} ring-2 ring-slate-200` : 'bg-white text-muted border border-line hover:text-ink'}`}>
                {t(o.label)}
                <span className="ml-1 opacity-60">
                  {o.value === 'todos' ? rows.length : rows.filter((r) => r[statusKey!] === o.value).length}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <Card className="p-10 text-center text-sm text-muted">{t("Cargando…")}</Card>
      ) : rows.length === 0 ? (
        <EmptyState icon={icon} title={t('Todavía no hay registros en {x}', { x: t(title) })} text={t("Cargá el primero para empezar a llevar el control.")}
          action={<Button icon={Plus} onClick={() => openForm('new')}>{t('Agregar {x}', { x: t(singular).toLowerCase() })}</Button>} />
      ) : (
        <Card className="overflow-hidden">
          <div className="thin-scroll overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-slate-50/60 text-xs uppercase tracking-wide text-muted">
                  {columns.map((c) => <th key={c.key} className={`whitespace-nowrap px-4 py-3 font-semibold ${c.align === 'right' ? 'text-right' : ''}`}>{t(c.label)}</th>)}
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {filtered.map((r) => {
                    const accent = rowAccent?.(r as unknown as T);
                    return (
                      <motion.tr key={r.id} layout
                        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 20 }}
                        onClick={() => openForm(r)}
                        className={`group cursor-pointer border-b border-line/70 last:border-0 hover:bg-slate-50/70 ${accent ? ROW_ACCENT[accent] : ''}`}>
                        {columns.map((c) => (
                          <td key={c.key} className={`whitespace-nowrap px-4 py-3 ${c.align === 'right' ? 'text-right' : ''}`}>
                            {c.render
                              ? c.render(r as unknown as T)
                              : c.key === statusKey && statusField
                                ? <StatusPill field={statusField} value={String(r[c.key])} onChange={(v) => patch(r.id, { [c.key]: v } as Partial<T>)} />
                                : autoCell(fieldByKey[c.key], r[c.key])}
                          </td>
                        ))}
                        <td className="px-2 py-3 text-right">
                          <span className="inline-flex opacity-0 transition group-hover:opacity-100">
                            <IconButton icon={Pencil} label={t("Editar")} />
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
                {filtered.length === 0 && (
                  <tr><td colSpan={columns.length + 1} className="px-4 py-10 text-center text-muted">{t("Sin resultados para el filtro actual.")}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? t('Agregar {x}', { x: t(singular).toLowerCase() }) : t('Editar {x}', { x: t(singular).toLowerCase() })}>
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.map((f) => (
            <Field key={f.key} label={`${t(f.label)}${f.required ? ' *' : ''}`} className={f.full || f.type === 'textarea' ? 'sm:col-span-2' : ''}>
              {f.type === 'select' ? (
                <select className="field" value={form[f.key] ?? ''} required={f.required} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                  {!f.required && <option value="">—</option>}
                  {f.options?.map((o) => <option key={o.value} value={o.value}>{t(o.label)}</option>)}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea className="field min-h-24" placeholder={f.placeholder && t(f.placeholder)} value={form[f.key] ?? ''} required={f.required}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              ) : (
                <input className="field"
                  type={f.type === 'money' || f.type === 'number' ? 'number' : f.type}
                  step={f.type === 'money' ? '0.01' : f.type === 'number' ? 'any' : undefined}
                  min={f.type === 'money' || f.type === 'number' ? 0 : undefined}
                  placeholder={f.placeholder && t(f.placeholder)} value={form[f.key] ?? ''} required={f.required}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              )}
            </Field>
          ))}
          <div className="mt-2 flex items-center justify-between gap-2 sm:col-span-2">
            {editing && editing !== 'new' ? (
              <Button type="button" variant="danger" icon={Trash2} onClick={onDelete}>
                {confirmDelete ? t('Confirmar eliminación') : t('Eliminar')}
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>{t("Cancelar")}</Button>
              <Button type="submit" disabled={busy}>{busy ? t('Guardando…') : t('Guardar')}</Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
