import { useMemo, useState, type DragEvent, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { KanbanSquare, Plus, CalendarDays, ChevronLeft, ChevronRight, Search, Tag, Trash2 } from 'lucide-react';
import { useTable } from '../../hooks/useTable';
import { useToast } from '../../components/Toast';
import {
  Badge, Button, Field, IconButton, Modal, PageHeader, PRIORIDAD_LABEL, PRIORIDAD_TONE, TONE, daysUntil, fmtDate, type Tone,
} from '../../components/ui';
import { PRIORIDADES, TAREA_ESTADOS, type Prioridad, type Tarea, type TareaEstado } from '../../types';
import { t } from '../../i18n';
import { Select } from '../../components/Select';

const COLS: Record<TareaEstado, { label: string; tone: Tone; dot: string }> = {
  por_comenzar: { get label() { return t('Por comenzar'); }, tone: 'lilac', dot: 'bg-lilac' },
  en_curso: { get label() { return t('En curso'); }, tone: 'sky', dot: 'bg-sky' },
  en_pausa: { get label() { return t('En pausa'); }, tone: 'peach', dot: 'bg-peach' },
  terminada: { get label() { return t('Terminada'); }, tone: 'sage', dot: 'bg-sage' },
};

const EMPTY = { titulo: '', descripcion: '', prioridad: 'media' as Prioridad, fecha_limite: '', etiquetas: '', estado: 'por_comenzar' as TareaEstado };

export default function Seguimiento() {
  const { rows, loading, create, patch, destroy } = useTable<Tarea>('tareas');
  const toast = useToast();
  const [q, setQ] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<TareaEstado | null>(null);
  const [quick, setQuick] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Tarea | 'new' | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [confirmDel, setConfirmDel] = useState(false);

  const allTags = useMemo(() => [...new Set(rows.flatMap((tk) => tk.etiquetas ?? []))].sort(), [rows]);

  const visible = useMemo(() => rows.filter((tk) =>
    (!tag || tk.etiquetas?.includes(tag)) &&
    (!q || `${tk.titulo} ${tk.descripcion ?? ''}`.toLowerCase().includes(q.toLowerCase())),
  ), [rows, q, tag]);

  const byCol = (c: TareaEstado) =>
    visible.filter((tk) => tk.estado === c).sort((a, b) => PRIORIDADES.indexOf(a.prioridad) - PRIORIDADES.indexOf(b.prioridad) || (a.orden ?? 0) - (b.orden ?? 0));

  const move = (tk: Tarea, estado: TareaEstado) => { if (tk.estado !== estado) void patch(tk.id, { estado, orden: Date.now() }); };

  function onDrop(e: DragEvent, col: TareaEstado) {
    e.preventDefault();
    const tk = rows.find((x) => x.id === (dragId ?? e.dataTransfer.getData('text/plain')));
    if (tk) move(tk, col);
    setDragId(null); setOverCol(null);
  }

  async function quickAdd(e: FormEvent, col: TareaEstado) {
    e.preventDefault();
    const titulo = quick[col]?.trim();
    if (!titulo) return;
    setQuick({ ...quick, [col]: '' });
    try {
      await create({ titulo, estado: col, prioridad: 'media', etiquetas: tag ? [tag] : [], orden: Date.now() });
    } catch (err) { toast.error((err as Error).message); }
  }

  function openForm(tk: Tarea | 'new', estado: TareaEstado = 'por_comenzar') {
    setConfirmDel(false);
    setForm(tk === 'new' ? { ...EMPTY, estado } : {
      titulo: tk.titulo, descripcion: tk.descripcion ?? '', prioridad: tk.prioridad, fecha_limite: tk.fecha_limite ?? '',
      etiquetas: (tk.etiquetas ?? []).join(', '), estado: tk.estado,
    });
    setEditing(tk);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const values = {
      titulo: form.titulo.trim(), descripcion: form.descripcion.trim() || null, prioridad: form.prioridad,
      fecha_limite: form.fecha_limite || null, estado: form.estado,
      etiquetas: form.etiquetas.split(',').map((s) => s.trim()).filter(Boolean),
    };
    try {
      if (editing === 'new') { await create({ ...values, orden: Date.now() }); toast.ok(t('Tarea creada')); }
      else if (editing) { await patch(editing.id, values); toast.ok(t('Tarea actualizada')); }
      setEditing(null);
    } catch (err) { toast.error((err as Error).message); }
  }

  async function onDelete() {
    if (!editing || editing === 'new') return;
    if (!confirmDel) return setConfirmDel(true);
    await destroy(editing.id);
    setEditing(null);
  }

  const done = rows.filter((tk) => tk.estado === 'terminada').length;
  const pct = rows.length ? Math.round((done / rows.length) * 100) : 0;

  return (
    <div>
      <PageHeader title={t("Seguimiento")} subtitle={t('{n} tareas · {p}% terminadas', { n: rows.length, p: pct })} icon={KanbanSquare} tone="sky"
        actions={<Button icon={Plus} onClick={() => openForm('new')}>{t("Nueva tarea")}</Button>} />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-auto sm:min-w-[220px] sm:max-w-xs sm:flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="field pl-9" placeholder={t("Buscar tareas…")} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {allTags.length > 0 && (
          <div className="thin-scroll -mx-4 flex items-center gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
            <Tag size={14} className="shrink-0 text-muted" />
            {allTags.map((tk) => (
              <button key={tk} onClick={() => setTag(tag === tk ? null : tk)}
                className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold transition ${tag === tk ? 'bg-lilac text-white' : 'bg-lilac-bg text-lilac hover:brightness-95'}`}>
                {tk}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="thin-scroll -mx-4 snap-x snap-mandatory overflow-x-auto scroll-px-4 px-4 pb-4 sm:mx-0 sm:px-0 xl:snap-none xl:overflow-visible">
        <div className="flex gap-3 sm:gap-4 xl:grid xl:grid-cols-4">
          {TAREA_ESTADOS.map((col, ci) => {
            const items = byCol(col);
            const meta = COLS[col];
            return (
              <div key={col}
                onDragOver={(e) => { e.preventDefault(); setOverCol(col); }}
                onDragLeave={() => setOverCol((c) => (c === col ? null : c))}
                onDrop={(e) => onDrop(e, col)}
                className={`flex w-[82vw] shrink-0 snap-start flex-col rounded-2xl border p-3 transition-colors sm:w-[300px] xl:w-auto ${overCol === col ? 'border-slate-300 bg-white' : 'border-transparent bg-slate-100/60'}`}>
                <div className="mb-3 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                    <span className="text-sm font-bold">{meta.label}</span>
                    <span className={`rounded-full px-2 text-xs font-semibold ${TONE[meta.tone]}`}>{items.length}</span>
                  </div>
                  <IconButton icon={Plus} label={t('Nueva tarea en {x}', { x: meta.label })} onClick={() => openForm('new', col)} />
                </div>

                <form onSubmit={(e) => quickAdd(e, col)} className="mb-2">
                  <input className="w-full rounded-xl border border-dashed border-slate-300 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-solid focus:bg-white"
                    placeholder={t("+ Tarea rápida (Enter)")} value={quick[col] ?? ''} onChange={(e) => setQuick({ ...quick, [col]: e.target.value })} />
                </form>

                <div className="flex min-h-24 flex-1 flex-col gap-2">
                  <AnimatePresence initial={false}>
                    {items.map((tk) => {
                      const d = tk.fecha_limite ? daysUntil(tk.fecha_limite) : null;
                      const late = d !== null && d < 0 && tk.estado !== 'terminada';
                      return (
                        <motion.div key={tk.id} layout layoutId={tk.id}
                          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: dragId === tk.id ? 0.4 : 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ type: 'spring', damping: 28, stiffness: 340 }}>
                          <div draggable
                            onDragStart={(e) => { setDragId(tk.id); e.dataTransfer.setData('text/plain', tk.id); e.dataTransfer.effectAllowed = 'move'; }}
                            onDragEnd={() => { setDragId(null); setOverCol(null); }}
                            onClick={() => openForm(tk)}
                            className="group cursor-grab rounded-xl border border-line bg-white p-3 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift active:cursor-grabbing">
                            <div className="mb-2 flex items-start justify-between gap-2">
                              <p className={`text-sm font-semibold leading-snug ${tk.estado === 'terminada' ? 'text-muted line-through' : ''}`}>{tk.titulo}</p>
                              <Badge tone={PRIORIDAD_TONE[tk.prioridad]}>{PRIORIDAD_LABEL[tk.prioridad]}</Badge>
                            </div>
                            {tk.descripcion && <p className="mb-2 line-clamp-2 text-xs text-muted">{tk.descripcion}</p>}
                            <div className="flex flex-wrap items-center gap-1.5">
                              {tk.etiquetas?.map((et) => <span key={et} className="rounded-md bg-lilac-bg px-1.5 py-0.5 text-[11px] font-semibold text-lilac">{et}</span>)}
                              {tk.fecha_limite && (
                                <span className={`ml-auto inline-flex items-center gap-1 text-[11px] font-semibold ${late ? 'rounded-md bg-peach-bg px-1.5 py-0.5 text-peach' : 'text-muted'}`}>
                                  <CalendarDays size={12} /> {fmtDate(tk.fecha_limite)}
                                </span>
                              )}
                            </div>
                            <div className="mt-2 flex justify-between opacity-0 transition group-hover:opacity-100 max-sm:opacity-100">
                              <IconButton icon={ChevronLeft} label={t("Mover a la columna anterior")} disabled={ci === 0} className="disabled:invisible"
                                onClick={(e) => { e.stopPropagation(); move(tk, TAREA_ESTADOS[ci - 1]); }} />
                              <IconButton icon={ChevronRight} label={t("Mover a la columna siguiente")} disabled={ci === 3} className="disabled:invisible"
                                onClick={(e) => { e.stopPropagation(); move(tk, TAREA_ESTADOS[ci + 1]); }} />
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  {!loading && items.length === 0 && (
                    <div className="grid flex-1 place-items-center rounded-xl border border-dashed border-slate-200 py-6 text-xs text-slate-400">{t("Soltá tareas acá")}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? t('Nueva tarea') : t('Editar tarea')}>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field label={t("Título *")} className="sm:col-span-2">
            <input className="field" required autoFocus value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          </Field>
          <Field label={t("Descripción")} className="sm:col-span-2">
            <textarea className="field min-h-20" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          </Field>
          <Field label={t("Prioridad")}>
            <Select<Prioridad> value={form.prioridad} ariaLabel={t('Prioridad')} onChange={(v) => setForm({ ...form, prioridad: v })}
              options={PRIORIDADES.map((p) => ({ value: p, label: PRIORIDAD_LABEL[p], tone: PRIORIDAD_TONE[p] }))} />
          </Field>
          <Field label={t("Fecha límite")}>
            <input type="date" className="field" value={form.fecha_limite} onChange={(e) => setForm({ ...form, fecha_limite: e.target.value })} />
          </Field>
          <Field label={t("Estado")}>
            <Select<TareaEstado> value={form.estado} ariaLabel={t('Estado')} onChange={(v) => setForm({ ...form, estado: v })}
              options={TAREA_ESTADOS.map((s) => ({ value: s, label: COLS[s].label, tone: COLS[s].tone }))} />
          </Field>
          <Field label={t("Etiquetas de obra (separadas por coma)")}>
            <input className="field" placeholder={t("Estructura, PB")} list="tags" value={form.etiquetas} onChange={(e) => setForm({ ...form, etiquetas: e.target.value })} />
            <datalist id="tags">{allTags.map((tk) => <option key={tk} value={tk} />)}</datalist>
          </Field>
          <div className="mt-2 flex items-center justify-between sm:col-span-2">
            {editing && editing !== 'new'
              ? <Button type="button" variant="danger" icon={Trash2} onClick={onDelete}>{confirmDel ? t('Confirmar') : t('Eliminar')}</Button>
              : <span />}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>{t("Cancelar")}</Button>
              <Button type="submit">{t("Guardar")}</Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
