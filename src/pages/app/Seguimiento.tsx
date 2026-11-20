import { useMemo, useState, type DragEvent, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { KanbanSquare, Plus, CalendarDays, ChevronLeft, ChevronRight, Search, Tag, Trash2 } from 'lucide-react';
import { useTable } from '../../hooks/useTable';
import { useToast } from '../../components/Toast';
import {
  Badge, Button, Field, IconButton, Modal, PageHeader, PRIORIDAD_LABEL, PRIORIDAD_TONE, TONE, daysUntil, fmtDate, type Tone,
} from '../../components/ui';
import { PRIORIDADES, TAREA_ESTADOS, type Prioridad, type Tarea, type TareaEstado } from '../../types';

const COLS: Record<TareaEstado, { label: string; tone: Tone; dot: string }> = {
  por_comenzar: { label: 'Por comenzar', tone: 'lilac', dot: 'bg-lilac' },
  en_curso: { label: 'En curso', tone: 'sky', dot: 'bg-sky' },
  en_pausa: { label: 'En pausa', tone: 'peach', dot: 'bg-peach' },
  terminada: { label: 'Terminada', tone: 'sage', dot: 'bg-sage' },
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

  const allTags = useMemo(() => [...new Set(rows.flatMap((t) => t.etiquetas ?? []))].sort(), [rows]);

  const visible = useMemo(() => rows.filter((t) =>
    (!tag || t.etiquetas?.includes(tag)) &&
    (!q || `${t.titulo} ${t.descripcion ?? ''}`.toLowerCase().includes(q.toLowerCase())),
  ), [rows, q, tag]);

  const byCol = (c: TareaEstado) =>
    visible.filter((t) => t.estado === c).sort((a, b) => PRIORIDADES.indexOf(a.prioridad) - PRIORIDADES.indexOf(b.prioridad) || (a.orden ?? 0) - (b.orden ?? 0));

  const move = (t: Tarea, estado: TareaEstado) => { if (t.estado !== estado) void patch(t.id, { estado, orden: Date.now() }); };

  function onDrop(e: DragEvent, col: TareaEstado) {
    e.preventDefault();
    const t = rows.find((x) => x.id === (dragId ?? e.dataTransfer.getData('text/plain')));
    if (t) move(t, col);
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

  function openForm(t: Tarea | 'new', estado: TareaEstado = 'por_comenzar') {
    setConfirmDel(false);
    setForm(t === 'new' ? { ...EMPTY, estado } : {
      titulo: t.titulo, descripcion: t.descripcion ?? '', prioridad: t.prioridad, fecha_limite: t.fecha_limite ?? '',
      etiquetas: (t.etiquetas ?? []).join(', '), estado: t.estado,
    });
    setEditing(t);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const values = {
      titulo: form.titulo.trim(), descripcion: form.descripcion.trim() || null, prioridad: form.prioridad,
      fecha_limite: form.fecha_limite || null, estado: form.estado,
      etiquetas: form.etiquetas.split(',').map((s) => s.trim()).filter(Boolean),
    };
    try {
      if (editing === 'new') { await create({ ...values, orden: Date.now() }); toast.ok('Tarea creada'); }
      else if (editing) { await patch(editing.id, values); toast.ok('Tarea actualizada'); }
      setEditing(null);
    } catch (err) { toast.error((err as Error).message); }
  }

  async function onDelete() {
    if (!editing || editing === 'new') return;
    if (!confirmDel) return setConfirmDel(true);
    await destroy(editing.id);
    setEditing(null);
  }

  const done = rows.filter((t) => t.estado === 'terminada').length;
  const pct = rows.length ? Math.round((done / rows.length) * 100) : 0;

  return (
    <div>
      <PageHeader title="Seguimiento" subtitle={`${rows.length} tareas · ${pct}% terminadas`} icon={KanbanSquare} tone="sky"
        actions={<Button icon={Plus} onClick={() => openForm('new')}>Nueva tarea</Button>} />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="field pl-9" placeholder="Buscar tareas…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Tag size={14} className="text-muted" />
            {allTags.map((t) => (
              <button key={t} onClick={() => setTag(tag === t ? null : t)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${tag === t ? 'bg-lilac text-white' : 'bg-lilac-bg text-lilac hover:brightness-95'}`}>
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="thin-scroll -mx-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
        <div className="grid min-w-[1000px] grid-cols-4 gap-4">
          {TAREA_ESTADOS.map((col, ci) => {
            const items = byCol(col);
            const meta = COLS[col];
            return (
              <div key={col}
                onDragOver={(e) => { e.preventDefault(); setOverCol(col); }}
                onDragLeave={() => setOverCol((c) => (c === col ? null : c))}
                onDrop={(e) => onDrop(e, col)}
                className={`flex flex-col rounded-2xl border p-3 transition-colors ${overCol === col ? 'border-slate-300 bg-white' : 'border-transparent bg-slate-100/60'}`}>
                <div className="mb-3 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                    <span className="text-sm font-bold">{meta.label}</span>
                    <span className={`rounded-full px-2 text-xs font-semibold ${TONE[meta.tone]}`}>{items.length}</span>
                  </div>
                  <IconButton icon={Plus} label={`Nueva tarea en ${meta.label}`} onClick={() => openForm('new', col)} />
                </div>

                <form onSubmit={(e) => quickAdd(e, col)} className="mb-2">
                  <input className="w-full rounded-xl border border-dashed border-slate-300 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-solid focus:bg-white"
                    placeholder="+ Tarea rápida (Enter)" value={quick[col] ?? ''} onChange={(e) => setQuick({ ...quick, [col]: e.target.value })} />
                </form>

                <div className="flex min-h-24 flex-1 flex-col gap-2">
                  <AnimatePresence initial={false}>
                    {items.map((t) => {
                      const d = t.fecha_limite ? daysUntil(t.fecha_limite) : null;
                      const late = d !== null && d < 0 && t.estado !== 'terminada';
                      return (
                        <motion.div key={t.id} layout layoutId={t.id}
                          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: dragId === t.id ? 0.4 : 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ type: 'spring', damping: 28, stiffness: 340 }}>
                          <div draggable
                            onDragStart={(e) => { setDragId(t.id); e.dataTransfer.setData('text/plain', t.id); e.dataTransfer.effectAllowed = 'move'; }}
                            onDragEnd={() => { setDragId(null); setOverCol(null); }}
                            onClick={() => openForm(t)}
                            className="group cursor-grab rounded-xl border border-line bg-white p-3 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift active:cursor-grabbing">
                            <div className="mb-2 flex items-start justify-between gap-2">
                              <p className={`text-sm font-semibold leading-snug ${t.estado === 'terminada' ? 'text-muted line-through' : ''}`}>{t.titulo}</p>
                              <Badge tone={PRIORIDAD_TONE[t.prioridad]}>{PRIORIDAD_LABEL[t.prioridad]}</Badge>
                            </div>
                            {t.descripcion && <p className="mb-2 line-clamp-2 text-xs text-muted">{t.descripcion}</p>}
                            <div className="flex flex-wrap items-center gap-1.5">
                              {t.etiquetas?.map((et) => <span key={et} className="rounded-md bg-lilac-bg px-1.5 py-0.5 text-[11px] font-semibold text-lilac">{et}</span>)}
                              {t.fecha_limite && (
                                <span className={`ml-auto inline-flex items-center gap-1 text-[11px] font-semibold ${late ? 'rounded-md bg-peach-bg px-1.5 py-0.5 text-peach' : 'text-muted'}`}>
                                  <CalendarDays size={12} /> {fmtDate(t.fecha_limite)}
                                </span>
                              )}
                            </div>
                            <div className="mt-2 flex justify-between opacity-0 transition group-hover:opacity-100 max-sm:opacity-100">
                              <IconButton icon={ChevronLeft} label="Mover a la columna anterior" disabled={ci === 0} className="disabled:invisible"
                                onClick={(e) => { e.stopPropagation(); move(t, TAREA_ESTADOS[ci - 1]); }} />
                              <IconButton icon={ChevronRight} label="Mover a la columna siguiente" disabled={ci === 3} className="disabled:invisible"
                                onClick={(e) => { e.stopPropagation(); move(t, TAREA_ESTADOS[ci + 1]); }} />
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  {!loading && items.length === 0 && (
                    <div className="grid flex-1 place-items-center rounded-xl border border-dashed border-slate-200 py-6 text-xs text-slate-400">Soltá tareas acá</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Nueva tarea' : 'Editar tarea'}>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Título *" className="sm:col-span-2">
            <input className="field" required autoFocus value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          </Field>
          <Field label="Descripción" className="sm:col-span-2">
            <textarea className="field min-h-20" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          </Field>
          <Field label="Prioridad">
            <select className="field" value={form.prioridad} onChange={(e) => setForm({ ...form, prioridad: e.target.value as Prioridad })}>
              {PRIORIDADES.map((p) => <option key={p} value={p}>{PRIORIDAD_LABEL[p]}</option>)}
            </select>
          </Field>
          <Field label="Fecha límite">
            <input type="date" className="field" value={form.fecha_limite} onChange={(e) => setForm({ ...form, fecha_limite: e.target.value })} />
          </Field>
          <Field label="Estado">
            <select className="field" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value as TareaEstado })}>
              {TAREA_ESTADOS.map((s) => <option key={s} value={s}>{COLS[s].label}</option>)}
            </select>
          </Field>
          <Field label="Etiquetas de obra (separadas por coma)">
            <input className="field" placeholder="Estructura, PB" list="tags" value={form.etiquetas} onChange={(e) => setForm({ ...form, etiquetas: e.target.value })} />
            <datalist id="tags">{allTags.map((t) => <option key={t} value={t} />)}</datalist>
          </Field>
          <div className="mt-2 flex items-center justify-between sm:col-span-2">
            {editing && editing !== 'new'
              ? <Button type="button" variant="danger" icon={Trash2} onClick={onDelete}>{confirmDel ? 'Confirmar' : 'Eliminar'}</Button>
              : <span />}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button type="submit">Guardar</Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
