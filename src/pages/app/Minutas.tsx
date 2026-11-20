import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { NotebookPen, Plus, Users, CheckSquare, Trash2, X, CalendarDays, Printer } from 'lucide-react';
import { useTable } from '../../hooks/useTable';
import { useToast } from '../../components/Toast';
import { Button, Card, EmptyState, Field, IconButton, Modal, PageHeader, fmtDate, today } from '../../components/ui';
import type { Acuerdo, Minuta } from '../../types';

const EMPTY = () => ({ titulo: '', fecha: today(), asistentes: [] as string[], temas: '', acuerdos: [] as Acuerdo[] });

export default function Minutas() {
  const { rows, loading, create, patch, destroy } = useTable<Minuta>('minutas', 'fecha');
  const toast = useToast();
  const [editing, setEditing] = useState<Minuta | 'new' | null>(null);
  const [form, setForm] = useState(EMPTY());
  const [asistente, setAsistente] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const open = (m: Minuta | 'new') => {
    setForm(m === 'new' ? EMPTY() : { titulo: m.titulo, fecha: m.fecha, asistentes: m.asistentes ?? [], temas: m.temas ?? '', acuerdos: m.acuerdos ?? [] });
    setAsistente('');
    setEditing(m);
  };

  const addAsistente = (e?: KeyboardEvent) => {
    if (e && e.key !== 'Enter' && e.key !== ',') return;
    e?.preventDefault();
    const v = asistente.trim();
    if (v && !form.asistentes.includes(v)) setForm({ ...form, asistentes: [...form.asistentes, v] });
    setAsistente('');
  };

  const setAcuerdo = (i: number, p: Partial<Acuerdo>) => setForm({ ...form, acuerdos: form.acuerdos.map((a, j) => (j === i ? { ...a, ...p } : a)) });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const values = { ...form, temas: form.temas.trim() || null, acuerdos: form.acuerdos.filter((a) => a.texto.trim()) };
    try {
      if (editing === 'new') { const m = await create(values); setSelected(m.id); toast.ok('Minuta guardada'); }
      else if (editing) { await patch(editing.id, values); toast.ok('Minuta actualizada'); }
      setEditing(null);
    } catch (err) { toast.error((err as Error).message); }
  }

  const current = rows.find((m) => m.id === selected) ?? rows[0];

  return (
    <div>
      <PageHeader title="Minutas" subtitle="Actas de reunión de obra" icon={NotebookPen} tone="lilac"
        actions={<Button icon={Plus} onClick={() => open('new')}>Nueva minuta</Button>} />

      {loading ? <Card className="p-10 text-center text-sm text-muted">Cargando…</Card> : rows.length === 0 ? (
        <EmptyState icon={NotebookPen} title="Sin minutas" text="Registrá asistentes, temas tratados y acuerdos con responsables." action={<Button icon={Plus} onClick={() => open('new')}>Nueva minuta</Button>} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
          <div className="space-y-2">
            {rows.map((m) => (
              <motion.button key={m.id} layout whileHover={{ x: 2 }} onClick={() => setSelected(m.id)}
                className={`w-full rounded-2xl border p-4 text-left transition ${current?.id === m.id ? 'border-lilac/30 bg-lilac-bg/60' : 'border-line bg-white hover:border-slate-300'}`}>
                <p className="font-semibold leading-snug">{m.titulo}</p>
                <p className="mt-1 flex items-center gap-3 text-xs text-muted">
                  <span className="inline-flex items-center gap-1"><CalendarDays size={12} />{fmtDate(m.fecha)}</span>
                  <span className="inline-flex items-center gap-1"><CheckSquare size={12} />{m.acuerdos?.length ?? 0} acuerdos</span>
                </p>
              </motion.button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {current && (
              <motion.div key={current.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <Card className="p-6 print:border-0 print:shadow-none">
                  <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-lilac">Acta de reunión · {fmtDate(current.fecha)}</p>
                      <h2 className="text-xl font-bold">{current.titulo}</h2>
                    </div>
                    <div className="flex gap-1 print:hidden">
                      <Button variant="soft" icon={Printer} onClick={() => window.print()}>Imprimir</Button>
                      <Button variant="soft" onClick={() => open(current)}>Editar</Button>
                      <IconButton icon={Trash2} label="Eliminar minuta" onClick={() => { if (window.confirm('¿Eliminar esta minuta?')) void destroy(current.id); }} />
                    </div>
                  </div>
                  <section className="mb-5">
                    <h3 className="label flex items-center gap-1.5"><Users size={13} /> Asistentes</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {current.asistentes?.length ? current.asistentes.map((a) => <span key={a} className="rounded-full bg-sky-bg px-3 py-1 text-xs font-semibold text-sky">{a}</span>) : <span className="text-sm text-muted">—</span>}
                    </div>
                  </section>
                  <section className="mb-5">
                    <h3 className="label">Temas tratados</h3>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{current.temas || '—'}</p>
                  </section>
                  <section>
                    <h3 className="label flex items-center gap-1.5"><CheckSquare size={13} /> Acuerdos y responsables</h3>
                    {current.acuerdos?.length ? (
                      <div className="overflow-hidden rounded-xl border border-line">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-2 text-left">Acuerdo</th><th className="px-4 py-2 text-left">Responsable</th><th className="px-4 py-2 text-left">Fecha</th></tr></thead>
                          <tbody>{current.acuerdos.map((a, i) => <tr key={i} className="border-t border-line"><td className="px-4 py-2">{a.texto}</td><td className="px-4 py-2 font-medium">{a.responsable || '—'}</td><td className="px-4 py-2 tabular-nums">{fmtDate(a.fecha)}</td></tr>)}</tbody>
                        </table>
                      </div>
                    ) : <p className="text-sm text-muted">Sin acuerdos registrados.</p>}
                  </section>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Nueva minuta' : 'Editar minuta'} wide>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
            <Field label="Título *"><input className="field" required placeholder="Reunión semanal de coordinación" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></Field>
            <Field label="Fecha *"><input type="date" className="field" required value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></Field>
          </div>
          <div>
            <span className="label">Asistentes</span>
            <div className="field flex flex-wrap items-center gap-1.5 py-2">
              {form.asistentes.map((a) => (
                <span key={a} className="inline-flex items-center gap-1 rounded-full bg-sky-bg px-2.5 py-0.5 text-xs font-semibold text-sky">
                  {a}<button type="button" aria-label={`Quitar ${a}`} onClick={() => setForm({ ...form, asistentes: form.asistentes.filter((x) => x !== a) })}><X size={12} /></button>
                </span>
              ))}
              <input className="min-w-32 flex-1 bg-transparent outline-none" placeholder="Nombre + Enter" value={asistente}
                onChange={(e) => setAsistente(e.target.value)} onKeyDown={addAsistente} onBlur={() => addAsistente()} />
            </div>
          </div>
          <Field label="Temas tratados"><textarea className="field min-h-28" value={form.temas} onChange={(e) => setForm({ ...form, temas: e.target.value })} /></Field>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="label mb-0">Acuerdos</span>
              <Button type="button" variant="soft" icon={Plus} onClick={() => setForm({ ...form, acuerdos: [...form.acuerdos, { texto: '', responsable: '', fecha: '' }] })}>Agregar</Button>
            </div>
            <div className="space-y-2">
              {form.acuerdos.map((a, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-[1fr_150px_140px_36px]">
                  <input className="field" placeholder="Acuerdo" aria-label="Acuerdo" value={a.texto} onChange={(e) => setAcuerdo(i, { texto: e.target.value })} />
                  <input className="field" placeholder="Responsable" aria-label="Responsable" value={a.responsable} onChange={(e) => setAcuerdo(i, { responsable: e.target.value })} />
                  <input className="field" type="date" aria-label="Fecha" value={a.fecha} onChange={(e) => setAcuerdo(i, { fecha: e.target.value })} />
                  <IconButton icon={Trash2} label="Quitar acuerdo" className="self-center" onClick={() => setForm({ ...form, acuerdos: form.acuerdos.filter((_, j) => j !== i) })} />
                </div>
              ))}
              {form.acuerdos.length === 0 && <p className="text-sm text-muted">Sin acuerdos todavía.</p>}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button type="submit">Guardar minuta</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
