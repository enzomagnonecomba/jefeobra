import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useObra } from '../context/ObraContext';
import { cambiarEstado, crearTarea, listarTareas } from '../services/tareas';
import { ESTADO_LABEL, TAREA_ESTADOS, type NuevaTarea, type Prioridad, type Tarea, type TareaEstado } from '../types';

const PRIORIDADES: Prioridad[] = ['critica', 'alta', 'media', 'baja'];
const COLOR_PRIORIDAD: Record<Prioridad, string> = {
  critica: 'text-red-400', alta: 'text-orange-400', media: 'text-amber-300', baja: 'text-slate-400',
};
const input = 'rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm';

const FORM_VACIO = { titulo: '', frente: '', prioridad: 'media' as Prioridad, responsable: '', fecha_estimada: '' };

export default function Tareas() {
  const { obraActiva } = useObra();
  const obraId = obraActiva?.id;
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState<'todos' | TareaEstado>('todos');
  const [prioridad, setPrioridad] = useState<'todas' | Prioridad>('todas');
  const [frente, setFrente] = useState('todos');
  const [form, setForm] = useState(FORM_VACIO);
  const [error, setError] = useState<string | null>(null);

  const recargar = () => {
    if (obraId) listarTareas(obraId).then(setTareas).catch((e) => setError(e.message));
  };
  useEffect(recargar, [obraId]);

  const frentes = useMemo(
    () => [...new Set(tareas.map((t) => t.frente).filter(Boolean))] as string[],
    [tareas],
  );

  const filtradas = useMemo(
    () =>
      tareas.filter(
        (t) =>
          (estado === 'todos' || t.estado === estado) &&
          (prioridad === 'todas' || t.prioridad === prioridad) &&
          (frente === 'todos' || t.frente === frente) &&
          (!q || `${t.titulo} ${t.responsable ?? ''}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [tareas, estado, prioridad, frente, q],
  );

  async function onEstado(t: Tarea, nuevo: TareaEstado) {
    setTareas((prev) => prev.map((x) => (x.id === t.id ? { ...x, estado: nuevo } : x)));
    try {
      await cambiarEstado(t.id, nuevo);
    } catch (e) {
      setError((e as Error).message);
      recargar();
    }
  }

  async function onCrear(e: FormEvent) {
    e.preventDefault();
    if (!obraId || !form.titulo.trim()) return;
    const nueva: NuevaTarea = {
      obra_id: obraId,
      titulo: form.titulo.trim(),
      descripcion: null,
      frente: form.frente || null,
      prioridad: form.prioridad,
      responsable: form.responsable || null,
      fecha_estimada: form.fecha_estimada || null,
      estado: 'por_comenzar',
    };
    try {
      await crearTarea(nueva);
      setForm(FORM_VACIO);
      recargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tareas</h1>

      <form onSubmit={onCrear} className="grid gap-2 rounded-lg border border-slate-700 bg-slate-900 p-3 md:grid-cols-6">
        <input className={`${input} md:col-span-2`} placeholder="Título de la tarea" value={form.titulo}
          onChange={(e) => setForm({ ...form, titulo: e.target.value })} required />
        <input className={input} placeholder="Frente / rubro" value={form.frente}
          onChange={(e) => setForm({ ...form, frente: e.target.value })} />
        <select className={input} value={form.prioridad} onChange={(e) => setForm({ ...form, prioridad: e.target.value as Prioridad })}>
          {PRIORIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <input className={input} placeholder="Responsable" value={form.responsable}
          onChange={(e) => setForm({ ...form, responsable: e.target.value })} />
        <button className="rounded-md bg-amber-400 px-3 py-2 font-semibold text-slate-950">Nueva tarea</button>
      </form>

      <div className="grid gap-2 md:grid-cols-4">
        <input className={input} placeholder="Buscar por título o responsable" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={input} value={estado} onChange={(e) => setEstado(e.target.value as 'todos' | TareaEstado)}>
          <option value="todos">Todos los estados</option>
          {TAREA_ESTADOS.map((e) => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
        </select>
        <select className={input} value={prioridad} onChange={(e) => setPrioridad(e.target.value as 'todas' | Prioridad)}>
          <option value="todas">Todas las prioridades</option>
          {PRIORIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className={input} value={frente} onChange={(e) => setFrente(e.target.value)}>
          <option value="todos">Todos los frentes</option>
          {frentes.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-slate-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-3 py-2">Título</th>
              <th className="px-3 py-2">Frente</th>
              <th className="px-3 py-2">Prioridad</th>
              <th className="px-3 py-2">Responsable</th>
              <th className="px-3 py-2">Fecha est.</th>
              <th className="px-3 py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((t) => (
              <tr key={t.id} className="border-t border-slate-800">
                <td className="px-3 py-2 font-medium">{t.titulo}</td>
                <td className="px-3 py-2">{t.frente ?? '—'}</td>
                <td className={`px-3 py-2 font-semibold ${COLOR_PRIORIDAD[t.prioridad]}`}>{t.prioridad}</td>
                <td className="px-3 py-2">{t.responsable ?? '—'}</td>
                <td className="px-3 py-2">{t.fecha_estimada ?? '—'}</td>
                <td className="px-3 py-2">
                  <select aria-label={`Estado de ${t.titulo}`} value={t.estado}
                    onChange={(e) => onEstado(t, e.target.value as TareaEstado)}
                    className={input}>
                    {TAREA_ESTADOS.map((e) => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
                  </select>
                </td>
              </tr>
            ))}
            {filtradas.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Sin tareas para los filtros elegidos.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
