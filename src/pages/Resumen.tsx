import { useEffect, useState } from 'react';
import { useObra } from '../context/ObraContext';
import { listarTareas } from '../services/tareas';
import { ESTADO_LABEL, TAREA_ESTADOS, type Tarea } from '../types';

export default function Resumen() {
  const { obraActiva } = useObra();
  const obraId = obraActiva?.id;
  const [tareas, setTareas] = useState<Tarea[]>([]);

  useEffect(() => {
    if (obraId) listarTareas(obraId).then(setTareas).catch(console.error);
  }, [obraId]);

  if (!obraActiva) return <p className="text-slate-400">Seleccioná una obra para ver el resumen.</p>;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{obraActiva.nombre}</h1>
        <p className="text-slate-400">{obraActiva.direccion}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {TAREA_ESTADOS.map((e) => (
          <div key={e} className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <p className="text-sm text-slate-400">{ESTADO_LABEL[e]}</p>
            <p className="text-3xl font-bold">{tareas.filter((t) => t.estado === e).length}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
