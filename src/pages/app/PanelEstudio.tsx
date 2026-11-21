import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Building2, ClipboardList, PackageCheck, Truck, ShieldAlert, Search, CalendarDays, Store, HardHat, ChevronRight, ArrowLeft, Check, X,
  ArrowRight, Users, Package, Container, KanbanSquare, MapPin, Clock, PauseCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { Badge, Card, EmptyState, Modal, PageHeader, PRIORIDAD_LABEL, PRIORIDAD_TONE, Segmented, StatCard, TONE, daysUntil, fmtDate, fmtMoney, type Tone } from '../../components/ui';
import { Select } from '../../components/Select';
import * as db from '../../lib/db';
import { cargarPanel, type DatosPanel } from '../../lib/estudio';
import type { Rol } from '../../lib/roles';
import { ResumenObra } from './Resumen';
import { ESTADO_PEDIDO } from './Pedidos';
import {
  FLETE_ESTADOS, PEDIDO_ESTADOS, TAREA_ESTADOS, VOLQUETE_ESTADOS,
  type Flete, type Obra, type Pedido, type PedidoEstado, type Tarea, type TareaEstado, type Volquete,
} from '../../types';
import { t } from '../../i18n';

const VACIO: DatosPanel = { obras: [], jefes: {}, pedidos: [], tareas: [], caja: [], seguros: [], adicionales: [], fletes: [], volquetes: [] };

const ESTADO_FLETE: Record<Flete['estado'], { readonly label: string; tone: Tone }> = {
  programado: { get label() { return t('Programado'); }, tone: 'lilac' },
  en_transito: { get label() { return t('En tránsito'); }, tone: 'sky' },
  realizado: { get label() { return t('Realizado'); }, tone: 'sage' },
  cancelado: { get label() { return t('Cancelado'); }, tone: 'slate' },
};
const ESTADO_VOLQUETE: Record<Volquete['estado'], { readonly label: string; tone: Tone }> = {
  solicitado: { get label() { return t('Solicitado'); }, tone: 'lilac' },
  en_obra: { get label() { return t('En obra'); }, tone: 'sky' },
  recambio: { get label() { return t('Recambio'); }, tone: 'peach' },
  retirado: { get label() { return t('Retirado'); }, tone: 'sage' },
};
const COL_TAREA: Record<TareaEstado, { readonly label: string; tone: Tone; bar: string }> = {
  por_comenzar: { get label() { return t('Por comenzar'); }, tone: 'lilac', bar: 'bg-lilac' },
  en_curso: { get label() { return t('En curso'); }, tone: 'sky', bar: 'bg-sky' },
  en_pausa: { get label() { return t('En pausa'); }, tone: 'peach', bar: 'bg-peach' },
  terminada: { get label() { return t('Terminada'); }, tone: 'sage', bar: 'bg-sage' },
};

// ---------------------------------------------------------------- datos
type Tabla = 'pedidos' | 'fletes' | 'volquetes';

function usePanel() {
  const { user, rol } = useAuth();
  const toast = useToast();
  const [data, setData] = useState<DatosPanel | null>(null);

  const cargar = useCallback(async () => {
    if (!user) return;
    try { setData(await cargarPanel(user.id, rol)); }
    catch (e) { toast.error((e as Error).message); setData(VACIO); }
  }, [user, rol, toast]);

  useEffect(() => { void cargar(); }, [cargar]);

  /** Compras solo puede cambiar el estado (lo refuerza un trigger en la base). */
  const cambiarEstado = async (tabla: Tabla, id: string, estado: string, label: string) => {
    const prev = data;
    setData((d) => d && { ...d, [tabla]: (d[tabla] as { id: string }[]).map((x) => (x.id === id ? { ...x, estado } : x)) });
    try {
      await db.update(tabla, id, { estado });
      toast.ok(t('Estado actualizado: {x}', { x: label }));
    } catch (e) {
      setData(prev);
      toast.error((e as Error).message);
    }
  };

  return { data, rol, cambiarEstado };
}

const saldoObra = (o: Obra, d: DatosPanel) => {
  const caja = d.caja.filter((m) => m.obra_id === o.id);
  const ing = caja.filter((m) => m.tipo === 'ingreso').reduce((a, m) => a + Number(m.monto), 0);
  const egr = caja.filter((m) => m.tipo === 'egreso').reduce((a, m) => a + Number(m.monto), 0);
  return (Number(o.presupuesto_caja) || 0) + ing - egr;
};

const avanceDe = (tareas: Tarea[]) => (tareas.length ? Math.round((tareas.filter((x) => x.estado === 'terminada').length / tareas.length) * 100) : 0);

// ---------------------------------------------------------------- pedidos (Compras)
function GestionPedidos({ data, pedidos, cambiarEstado, mostrarObra = true }: {
  data: DatosPanel; pedidos: Pedido[]; cambiarEstado: (id: string, e: PedidoEstado) => void; mostrarObra?: boolean;
}) {
  const [filtro, setFiltro] = useState<'todos' | PedidoEstado>('pendiente');
  const [obraId, setObraId] = useState('');
  const [q, setQ] = useState('');
  const [detalle, setDetalle] = useState<Pedido | null>(null);
  const obraDe = (id: string) => data.obras.find((o) => o.id === id);
  const jefeDe = (id: string) => { const o = obraDe(id); return o?.user_id ? data.jefes[o.user_id]?.nombre : undefined; };

  const list = useMemo(() => pedidos.filter((p) =>
    (filtro === 'todos' || p.estado === filtro) &&
    (!obraId || p.obra_id === obraId) &&
    (!q || `${p.titulo} ${p.proveedor ?? ''} ${p.items.map((i) => i.descripcion).join(' ')}`.toLowerCase().includes(q.toLowerCase())),
  ).sort((a, b) => {
    const pr = ['critica', 'alta', 'media', 'baja'];
    return pr.indexOf(a.prioridad) - pr.indexOf(b.prioridad) || String(a.fecha_requerida ?? '9').localeCompare(String(b.fecha_requerida ?? '9'));
  }), [pedidos, filtro, obraId, q]);

  const estadoOpts = PEDIDO_ESTADOS.map((s) => ({ value: s, label: ESTADO_PEDIDO[s].label, tone: ESTADO_PEDIDO[s].tone }));
  const siguiente: Partial<Record<PedidoEstado, PedidoEstado>> = { aprobado: 'en_camino', en_camino: 'entregado' };
  const accion: Partial<Record<PedidoEstado, string>> = { aprobado: t('Marcar en camino'), en_camino: t('Marcar entregado') };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="thin-scroll -mx-4 w-[calc(100%+2rem)] overflow-x-auto px-4 pb-1 sm:mx-0 sm:w-auto sm:overflow-visible sm:px-0 sm:pb-0">
          <Segmented value={filtro} onChange={setFiltro}
            options={[{ value: 'todos', label: `${t('Todos')} (${pedidos.length})` },
              ...PEDIDO_ESTADOS.map((s) => ({ value: s, label: `${ESTADO_PEDIDO[s].label} (${pedidos.filter((p) => p.estado === s).length})` }))]} />
        </div>
        {mostrarObra && data.obras.length > 1 && (
          <Select value={obraId} ariaLabel={t('Obra')} onChange={setObraId} className="sm:!w-56" menuMinWidth={220}
            options={[{ value: '', label: t('Todas las obras') }, ...data.obras.map((o) => ({ value: o.id, label: o.nombre }))]} />
        )}
        <div className="relative w-full sm:w-auto sm:min-w-[200px] sm:max-w-xs sm:flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="field pl-9" placeholder={t('Buscar pedido o material…')} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {pedidos.length === 0 ? (
        <EmptyState icon={Package} title={t('Sin pedidos todavía')} text={t('Cuando el jefe de obra envíe pedidos de materiales, van a aparecer acá.')} />
      ) : list.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">{t('Sin pedidos para este filtro.')}</p>
      ) : (
        <motion.div layout className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {list.map((p) => {
              const d = p.fecha_requerida ? daysUntil(p.fecha_requerida) : null;
              const urgente = d !== null && d <= 1 && !['entregado', 'rechazado'].includes(p.estado);
              return (
                <Card key={p.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
                  className="flex cursor-pointer flex-col p-5 transition-shadow hover:shadow-lift" onClick={() => setDetalle(p)}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    {mostrarObra ? <span className="inline-flex min-w-0 items-center gap-1 truncate text-xs font-semibold text-muted"><Building2 size={12} className="shrink-0" />{obraDe(p.obra_id)?.nombre}</span> : <span />}
                    <div onClick={(e) => e.stopPropagation()}>
                      <Select variant="pill" value={p.estado} ariaLabel={t('Cambiar {x}', { x: t('Estado') })} onChange={(v) => cambiarEstado(p.id, v as PedidoEstado)} options={estadoOpts} align="end" />
                    </div>
                  </div>
                  <h3 className="mb-2 font-bold leading-snug">{p.titulo}</h3>
                  <ul className="mb-4 space-y-1 text-sm text-muted">
                    {p.items.slice(0, 3).map((it, j) => <li key={j} className="flex justify-between gap-2"><span className="truncate">{it.descripcion}</span><span className="shrink-0 font-medium tabular-nums text-ink">{it.cantidad} {t(it.unidad)}</span></li>)}
                    {p.items.length > 3 && <li className="text-xs">{t('+{n} ítems más', { n: p.items.length - 3 })}</li>}
                  </ul>
                  <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line pt-3 text-xs text-muted">
                    <Badge tone={PRIORIDAD_TONE[p.prioridad]}>{PRIORIDAD_LABEL[p.prioridad]}</Badge>
                    {p.fecha_requerida && <span className={`inline-flex items-center gap-1 ${urgente ? 'rounded-md bg-peach-bg px-1.5 py-0.5 font-semibold text-peach' : ''}`}><CalendarDays size={12} /> {fmtDate(p.fecha_requerida)}</span>}
                    {jefeDe(p.obra_id) && <span className="inline-flex items-center gap-1"><HardHat size={12} /> {jefeDe(p.obra_id)}</span>}
                    <div className="ml-auto flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {p.estado === 'pendiente' && (
                        <>
                          <button onClick={() => cambiarEstado(p.id, 'rechazado')}
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-600 transition hover:brightness-95">
                            <X size={13} /> {t('Rechazar')}
                          </button>
                          <button onClick={() => cambiarEstado(p.id, 'aprobado')}
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold transition hover:brightness-95 ${TONE.sage}`}>
                            <Check size={13} /> {t('Aprobar')}
                          </button>
                        </>
                      )}
                      {siguiente[p.estado] && (
                        <button onClick={() => cambiarEstado(p.id, siguiente[p.estado]!)}
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold transition hover:brightness-95 ${TONE[ESTADO_PEDIDO[siguiente[p.estado]!].tone]}`}>
                          <ArrowRight size={13} /> {accion[p.estado]}
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      <Modal open={!!detalle} onClose={() => setDetalle(null)} title={detalle?.titulo ?? ''} wide>
        {detalle && (() => {
          const actual = pedidos.find((p) => p.id === detalle.id) ?? detalle;
          return (
            <div className="space-y-5">
              <div>
                <span className="label">{t('Estado')}</span>
                <div className="flex flex-wrap gap-2">
                  {PEDIDO_ESTADOS.map((s) => (
                    <button key={s} onClick={() => cambiarEstado(actual.id, s)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${actual.estado === s ? `${TONE[ESTADO_PEDIDO[s].tone]} ring-2 ring-slate-300` : 'bg-slate-100 text-muted hover:text-ink'}`}>
                      {ESTADO_PEDIDO[s].label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                <div><span className="label">{t('Obra')}</span>{obraDe(actual.obra_id)?.nombre}</div>
                <div><span className="label">{t('Jefe de obra')}</span>{jefeDe(actual.obra_id) ?? '—'}</div>
                <div><span className="label">{t('Prioridad')}</span><Badge tone={PRIORIDAD_TONE[actual.prioridad]}>{PRIORIDAD_LABEL[actual.prioridad]}</Badge></div>
                <div><span className="label">{t('Requerido')}</span>{fmtDate(actual.fecha_requerida)}</div>
                <div><span className="label">{t('Proveedor')}</span>{actual.proveedor ? <span className="inline-flex items-center gap-1"><Store size={13} />{actual.proveedor}</span> : '—'}</div>
                <div><span className="label">{t('Creado')}</span>{fmtDate(actual.created_at)}</div>
              </div>
              <div className="overflow-hidden rounded-xl border border-line">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-2 text-left">{t('Ítem')}</th><th className="px-4 py-2 text-right">{t('Cantidad')}</th></tr></thead>
                  <tbody>{actual.items.map((it, i) => <tr key={i} className="border-t border-line"><td className="px-4 py-2">{it.descripcion}</td><td className="px-4 py-2 text-right tabular-nums">{it.cantidad} {t(it.unidad)}</td></tr>)}</tbody>
                </table>
              </div>
              {actual.notas && <div><span className="label">{t('Notas')}</span><p className="text-sm">{actual.notas}</p></div>}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------- servicios (Compras)
function GestionServicios({ data, fletes, volquetes, cambiarEstado, mostrarObra = true }: {
  data: DatosPanel; fletes: Flete[]; volquetes: Volquete[];
  cambiarEstado: (tabla: Tabla, id: string, estado: string, label: string) => void; mostrarObra?: boolean;
}) {
  const obraDe = (id: string) => data.obras.find((o) => o.id === id)?.nombre;
  const fOpts = FLETE_ESTADOS.map((s) => ({ value: s, label: ESTADO_FLETE[s].label, tone: ESTADO_FLETE[s].tone }));
  const vOpts = VOLQUETE_ESTADOS.map((s) => ({ value: s, label: ESTADO_VOLQUETE[s].label, tone: ESTADO_VOLQUETE[s].tone }));

  const ObraTag = ({ id }: { id: string }) => mostrarObra
    ? <span className="inline-flex min-w-0 items-center gap-1 truncate text-xs font-semibold text-muted"><Building2 size={12} className="shrink-0" />{obraDe(id)}</span>
    : <span />;

  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-3 flex items-center gap-2 font-bold"><Truck size={18} className="text-sky" /> {t('Fletes')} <span className="text-sm font-medium text-muted">({fletes.length})</span></h3>
        {fletes.length === 0 ? <p className="rounded-2xl border border-dashed border-line py-8 text-center text-sm text-muted">{t('Sin fletes registrados.')}</p> : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {fletes.map((f) => (
              <Card key={f.id} className="flex flex-col p-5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <ObraTag id={f.obra_id} />
                  <Select variant="pill" align="end" value={f.estado} ariaLabel={t('Cambiar {x}', { x: t('Estado') })} options={fOpts}
                    onChange={(v) => cambiarEstado('fletes', f.id, v, ESTADO_FLETE[v as Flete['estado']].label)} />
                </div>
                <p className="mb-1 flex items-center gap-1.5 font-bold leading-snug"><MapPin size={15} className="shrink-0 text-muted" />{f.origen} <ArrowRight size={14} className="text-muted" /> {f.destino}</p>
                {f.carga && <p className="mb-3 text-sm text-muted">{f.carga}</p>}
                <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-3 text-xs text-muted">
                  <span className="inline-flex items-center gap-1"><CalendarDays size={12} /> {fmtDate(f.fecha)}</span>
                  {f.transportista && <span className="inline-flex items-center gap-1"><Truck size={12} /> {f.transportista}</span>}
                  <span className="ml-auto font-semibold tabular-nums text-ink">{fmtMoney(f.costo)}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
      <section>
        <h3 className="mb-3 flex items-center gap-2 font-bold"><Container size={18} className="text-peach" /> {t('Volquetes')} <span className="text-sm font-medium text-muted">({volquetes.length})</span></h3>
        {volquetes.length === 0 ? <p className="rounded-2xl border border-dashed border-line py-8 text-center text-sm text-muted">{t('Sin volquetes registrados.')}</p> : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {volquetes.map((v) => {
              const d = v.fecha_retiro ? daysUntil(v.fecha_retiro) : null;
              return (
                <Card key={v.id} className="flex flex-col p-5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <ObraTag id={v.obra_id} />
                    <Select variant="pill" align="end" value={v.estado} ariaLabel={t('Cambiar {x}', { x: t('Estado') })} options={vOpts}
                      onChange={(x) => cambiarEstado('volquetes', v.id, x, ESTADO_VOLQUETE[x as Volquete['estado']].label)} />
                  </div>
                  <p className="mb-3 font-bold leading-snug">{v.empresa}{v.numero ? ` · ${v.numero}` : ''}</p>
                  <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-3 text-xs text-muted">
                    <span>{t('Entrega')}: {fmtDate(v.fecha_entrega)}</span>
                    <span className={d !== null && d <= 1 && v.estado === 'en_obra' ? 'rounded-md bg-peach-bg px-1.5 py-0.5 font-semibold text-peach' : ''}>{t('Retiro')}: {fmtDate(v.fecha_retiro)}</span>
                    <span className="ml-auto font-semibold tabular-nums text-ink">{fmtMoney(v.costo)}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- tareas (Dirección de obra)
function TareasResumen({ tareas }: { tareas: Tarea[] }) {
  const avance = avanceDe(tareas);
  return (
    <div className="space-y-5">
      <Card className="p-5 sm:p-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold">{t('Estado del tablero')}</h3>
          <span className="text-sm font-semibold text-sky">{t('{p}% terminado', { p: avance })}</span>
        </div>
        <div className="mb-4 flex h-3 overflow-hidden rounded-full bg-slate-100">
          {TAREA_ESTADOS.map((c, i) => {
            const n = tareas.filter((x) => x.estado === c).length;
            return n ? <motion.div key={c} className={COL_TAREA[c].bar} initial={{ width: 0 }} animate={{ width: `${(n / tareas.length) * 100}%` }} transition={{ delay: i * 0.08, duration: 0.5 }} /> : null;
          })}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TAREA_ESTADOS.map((c) => (
            <div key={c} className="rounded-xl bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted"><span className={`h-2 w-2 rounded-full ${COL_TAREA[c].bar}`} />{COL_TAREA[c].label}</div>
              <p className="mt-1 text-2xl font-bold">{tareas.filter((x) => x.estado === c).length}</p>
            </div>
          ))}
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {TAREA_ESTADOS.map((c) => {
          const items = tareas.filter((x) => x.estado === c);
          return (
            <div key={c} className="rounded-2xl bg-slate-100/60 p-3">
              <p className="mb-2 flex items-center gap-2 px-1 text-sm font-bold"><span className={`h-2 w-2 rounded-full ${COL_TAREA[c].bar}`} />{COL_TAREA[c].label}
                <span className={`rounded-full px-2 text-xs ${TONE[COL_TAREA[c].tone]}`}>{items.length}</span></p>
              <div className="space-y-2">
                {items.map((x) => {
                  const d = x.fecha_limite ? daysUntil(x.fecha_limite) : null;
                  return (
                    <div key={x.id} className="rounded-xl border border-line bg-white p-3 shadow-soft">
                      <div className="mb-1.5 flex items-start justify-between gap-2">
                        <p className={`text-sm font-semibold leading-snug ${x.estado === 'terminada' ? 'text-muted line-through' : ''}`}>{x.titulo}</p>
                        <Badge tone={PRIORIDAD_TONE[x.prioridad]}>{PRIORIDAD_LABEL[x.prioridad]}</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {x.etiquetas?.map((e) => <span key={e} className="rounded-md bg-lilac-bg px-1.5 py-0.5 text-[11px] font-semibold text-lilac">{e}</span>)}
                        {x.fecha_limite && <span className={`ml-auto inline-flex items-center gap-1 text-[11px] font-semibold ${d !== null && d < 0 && x.estado !== 'terminada' ? 'rounded-md bg-peach-bg px-1.5 py-0.5 text-peach' : 'text-muted'}`}><CalendarDays size={12} /> {fmtDate(x.fecha_limite)}</span>}
                      </div>
                    </div>
                  );
                })}
                {items.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 py-5 text-center text-xs text-slate-400">{t('Sin tareas')}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- tarjetas de obras
function ObrasGrid({ data, rol }: { data: DatosPanel; rol: Rol }) {
  const navigate = useNavigate();
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {data.obras.map((o, i) => {
        const tareas = data.tareas.filter((x) => x.obra_id === o.id);
        const avance = avanceDe(tareas);
        const pend = data.pedidos.filter((p) => p.obra_id === o.id && p.estado === 'pendiente').length;
        const alert = data.seguros.filter((s) => s.obra_id === o.id && daysUntil(s.vigencia_hasta) <= 30).length;
        return (
          <Card key={o.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04 } }} whileHover={{ y: -3 }}
            onClick={() => navigate(`/app/estudio/obras/${o.id}`)} className="cursor-pointer p-5 transition-shadow hover:shadow-lift">
            <div className="mb-1 flex items-start justify-between gap-2">
              <h3 className="font-bold leading-snug">{o.nombre}</h3>
              <ChevronRight size={18} className="shrink-0 text-muted" />
            </div>
            <p className="mb-4 truncate text-sm text-muted">{o.direccion ?? t('Sin dirección')}{o.user_id && data.jefes[o.user_id] ? ` · ${data.jefes[o.user_id].nombre}` : ''}</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {rol === 'compras'
                ? <div><p className="text-xs text-muted">{t('Saldo caja chica')}</p><p className="font-bold tabular-nums">{fmtMoney(saldoObra(o, data))}</p></div>
                : <div><p className="text-xs text-muted">{t('En curso')}</p><p className="font-bold">{tareas.filter((x) => x.estado === 'en_curso').length}</p></div>}
              <div><p className="text-xs text-muted">{t('Avance de tareas')}</p><p className="font-bold">{avance}%</p>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><motion.div className="h-full bg-sky" initial={{ width: 0 }} animate={{ width: `${avance}%` }} /></div></div>
            </div>
            {rol === 'compras' && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {pend > 0 && <Badge tone="peach"><PackageCheck size={12} /> {t('{n} por aprobar', { n: pend })}</Badge>}
                {alert > 0 && <Badge tone="rose"><ShieldAlert size={12} /> {t('{n} alertas', { n: alert })}</Badge>}
                {pend === 0 && alert === 0 && <Badge tone="sage">{t('Al día')}</Badge>}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- panel
export default function PanelEstudio() {
  const { data, rol, cambiarEstado } = usePanel();
  const [params, setParams] = useSearchParams();
  const esCompras = rol === 'compras';
  const tabs = esCompras ? ['pedidos', 'servicios', 'obras'] as const : ['obras'] as const;
  const tab = (tabs as readonly string[]).includes(params.get('tab') ?? '') ? params.get('tab')! : tabs[0];

  if (!data) return <Card className="p-10 text-center text-sm text-muted">{t('Cargando…')}</Card>;

  const header = esCompras
    ? <PageHeader title={t('Panel de gestión')} subtitle={t('Obras compartidas con vos por los jefes de obra del estudio')} icon={Building2} tone="lilac" />
    : <PageHeader title={t('Resumen de tareas')} subtitle={t('Avance de las obras compartidas con vos')} icon={KanbanSquare} tone="sky" />;

  if (data.obras.length === 0) {
    return (
      <div>
        {header}
        <EmptyState icon={Users} title={t('Todavía no tenés obras conectadas')}
          text={t('Pedile al jefe de obra que te envíe un link de invitación desde Equipo. Al abrirlo, sus obras van a aparecer acá.')} />
      </div>
    );
  }

  const pendientes = data.pedidos.filter((p) => p.estado === 'pendiente');
  const alertas = data.seguros.filter((s) => daysUntil(s.vigencia_hasta) <= 30);
  const serviciosActivos = data.fletes.filter((f) => f.estado === 'programado' || f.estado === 'en_transito').length
    + data.volquetes.filter((v) => v.estado !== 'retirado').length;

  return (
    <div>
      {header}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label={t('Obras conectadas')} value={data.obras.length} icon={Building2} tone="lilac" />
        {esCompras ? <>
          <StatCard label={t('Pedidos por aprobar')} value={pendientes.length} icon={ClipboardList} tone="peach"
            hint={pendientes.some((p) => p.prioridad === 'critica') ? t('Hay pedidos críticos') : undefined} />
          <StatCard label={t('Servicios activos')} value={serviciosActivos} icon={Truck} tone="sky" hint={t('Fletes y volquetes en curso')} />
          <StatCard label={t('Alertas de seguros')} value={alertas.length} icon={ShieldAlert} tone={alertas.length ? 'rose' : 'sage'}
            hint={alertas.length ? t('Pólizas que vencen en 30 días o menos') : t('Todo en orden. Sin vencimientos próximos.')} />
        </> : <>
          <StatCard label={t('Avance general')} value={`${avanceDe(data.tareas)}%`} icon={KanbanSquare} tone="sky" />
          <StatCard label={t('En curso')} value={data.tareas.filter((x) => x.estado === 'en_curso').length} icon={Clock} tone="lilac" />
          <StatCard label={t('En pausa')} value={data.tareas.filter((x) => x.estado === 'en_pausa').length} icon={PauseCircle} tone="peach" />
        </>}
      </div>

      {esCompras && (
        <div className="mb-5">
          <Segmented value={tab} onChange={(v) => setParams(v === 'pedidos' ? {} : { tab: v }, { replace: true })}
            options={[
              { value: 'pedidos', label: `${t('Pedidos')} (${data.pedidos.length})` },
              { value: 'servicios', label: `${t('Servicios')} (${data.fletes.length + data.volquetes.length})` },
              { value: 'obras', label: `${t('Obras')} (${data.obras.length})` },
            ]} />
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
          {tab === 'pedidos' && <GestionPedidos data={data} pedidos={data.pedidos} cambiarEstado={(id, e) => cambiarEstado('pedidos', id, e, ESTADO_PEDIDO[e].label)} />}
          {tab === 'servicios' && <GestionServicios data={data} fletes={data.fletes} volquetes={data.volquetes} cambiarEstado={cambiarEstado} />}
          {tab === 'obras' && <ObrasGrid data={data} rol={rol} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------- detalle de obra
export function ObraEstudio() {
  const { id } = useParams();
  const { data, rol, cambiarEstado } = usePanel();

  if (!data) return <Card className="p-10 text-center text-sm text-muted">{t('Cargando…')}</Card>;
  const obra = data.obras.find((o) => o.id === id);
  if (!obra) {
    return <EmptyState icon={Building2} title={t('No tenés acceso a esta obra')} action={<Link to="/app/estudio" className="text-sm font-semibold text-lilac">{t('Volver al panel')}</Link>} />;
  }
  const jefe = obra.user_id ? data.jefes[obra.user_id] : undefined;
  const header = (
    <PageHeader title={obra.nombre} icon={Building2} tone="lilac"
      subtitle={[obra.direccion, jefe?.nombre && t('Jefe de obra: {x}', { x: jefe.nombre })].filter(Boolean).join(' · ')}
      actions={<Badge tone="sky">{t('Solo lectura')}</Badge>} />
  );

  return (
    <div>
      <Link to={rol === 'compras' ? '/app/estudio?tab=obras' : '/app/estudio'} className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink"><ArrowLeft size={16} /> {t('Volver al panel')}</Link>
      {rol === 'compras' ? (
        <>
          <ResumenObra obra={obra} readOnly header={header} />
          <h2 className="mb-4 mt-8 flex items-center gap-2 text-lg font-bold"><ClipboardList size={20} className="text-peach" /> {t('Pedidos de la obra')}</h2>
          <GestionPedidos data={data} pedidos={data.pedidos.filter((p) => p.obra_id === obra.id)} mostrarObra={false}
            cambiarEstado={(pid, e) => cambiarEstado('pedidos', pid, e, ESTADO_PEDIDO[e].label)} />
          <h2 className="mb-4 mt-8 flex items-center gap-2 text-lg font-bold"><Truck size={20} className="text-sky" /> {t('Servicios')}</h2>
          <GestionServicios data={data} mostrarObra={false} cambiarEstado={cambiarEstado}
            fletes={data.fletes.filter((f) => f.obra_id === obra.id)} volquetes={data.volquetes.filter((v) => v.obra_id === obra.id)} />
        </>
      ) : (
        <>
          {header}
          <TareasResumen tareas={data.tareas.filter((x) => x.obra_id === obra.id)} />
        </>
      )}
    </div>
  );
}
