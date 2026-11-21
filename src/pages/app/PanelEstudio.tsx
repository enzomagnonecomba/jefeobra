import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Building2, ClipboardList, PackageCheck, Truck, ShieldAlert, Search, CalendarDays, Store, HardHat, ChevronRight, ArrowLeft, Check, ArrowRight, Users, Package,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { Badge, Card, EmptyState, Modal, PageHeader, PRIORIDAD_LABEL, PRIORIDAD_TONE, Segmented, StatCard, TONE, daysUntil, fmtDate, fmtMoney } from '../../components/ui';
import { Select } from '../../components/Select';
import * as db from '../../lib/db';
import { cargarPanel, type DatosPanel } from '../../lib/estudio';
import { ResumenObra } from './Resumen';
import { ESTADO_PEDIDO } from './Pedidos';
import { PEDIDO_ESTADOS, type Obra, type Pedido, type PedidoEstado } from '../../types';
import { t } from '../../i18n';

// ---------------------------------------------------------------- datos
function usePanel() {
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState<DatosPanel | null>(null);

  const cargar = useCallback(async () => {
    if (!user) return;
    try { setData(await cargarPanel(user.id)); }
    catch (e) { toast.error((e as Error).message); setData({ obras: [], jefes: {}, pedidos: [], tareas: [], caja: [], seguros: [], adicionales: [] }); }
  }, [user, toast]);

  useEffect(() => { void cargar(); }, [cargar]);

  /** Cambia el estado de un pedido (lo único que puede editar el administrativo). */
  const cambiarEstado = async (id: string, estado: PedidoEstado) => {
    const prev = data;
    setData((d) => d && { ...d, pedidos: d.pedidos.map((p) => (p.id === id ? { ...p, estado } : p)) });
    try {
      await db.update<Pedido>('pedidos', id, { estado });
      toast.ok(t('Pedido actualizado: {x}', { x: ESTADO_PEDIDO[estado].label }));
    } catch (e) {
      setData(prev);
      toast.error((e as Error).message);
    }
  };

  return { data, cambiarEstado };
}

const saldoObra = (o: Obra, d: DatosPanel) => {
  const caja = d.caja.filter((m) => m.obra_id === o.id);
  const ing = caja.filter((m) => m.tipo === 'ingreso').reduce((a, m) => a + Number(m.monto), 0);
  const egr = caja.filter((m) => m.tipo === 'egreso').reduce((a, m) => a + Number(m.monto), 0);
  return (Number(o.presupuesto_caja) || 0) + ing - egr;
};

const avanceObra = (o: Obra, d: DatosPanel) => {
  const ts = d.tareas.filter((x) => x.obra_id === o.id);
  return ts.length ? Math.round((ts.filter((x) => x.estado === 'terminada').length / ts.length) * 100) : 0;
};

// ---------------------------------------------------------------- pedidos
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
    // Primero lo urgente: prioridad crítica/alta y fecha requerida más cercana.
    const pr = ['critica', 'alta', 'media', 'baja'];
    return pr.indexOf(a.prioridad) - pr.indexOf(b.prioridad) || String(a.fecha_requerida ?? '9').localeCompare(String(b.fecha_requerida ?? '9'));
  }), [pedidos, filtro, obraId, q]);

  const estadoOpts = PEDIDO_ESTADOS.map((s) => ({ value: s, label: ESTADO_PEDIDO[s].label, tone: ESTADO_PEDIDO[s].tone }));
  const siguiente: Partial<Record<PedidoEstado, PedidoEstado>> = { pendiente: 'aprobado', aprobado: 'en_camino', en_camino: 'entregado' };
  const accion: Partial<Record<PedidoEstado, string>> = { pendiente: t('Aprobar'), aprobado: t('Marcar en camino'), en_camino: t('Marcar entregado') };

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
              const urgente = d !== null && d <= 1 && p.estado !== 'entregado';
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
                    {siguiente[p.estado] && (
                      <button onClick={(e) => { e.stopPropagation(); cambiarEstado(p.id, siguiente[p.estado]!); }}
                        className={`ml-auto inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition hover:brightness-95 ${TONE[ESTADO_PEDIDO[siguiente[p.estado]!].tone]}`}>
                        {p.estado === 'pendiente' ? <Check size={13} /> : <ArrowRight size={13} />} {accion[p.estado]}
                      </button>
                    )}
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
                <div className="flex flex-wrap items-center gap-2">
                  {PEDIDO_ESTADOS.map((s, i) => (
                    <div key={s} className="flex items-center gap-2">
                      <button onClick={() => cambiarEstado(actual.id, s)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${actual.estado === s ? `${TONE[ESTADO_PEDIDO[s].tone]} ring-2 ring-slate-300` : 'bg-slate-100 text-muted hover:text-ink'}`}>
                        {ESTADO_PEDIDO[s].label}
                      </button>
                      {i < PEDIDO_ESTADOS.length - 1 && <ArrowRight size={12} className="text-slate-300" />}
                    </div>
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

// ---------------------------------------------------------------- panel
export default function PanelEstudio() {
  const { data, cambiarEstado } = usePanel();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'obras' ? 'obras' : 'pedidos';
  const navigate = useNavigate();

  if (!data) return <Card className="p-10 text-center text-sm text-muted">{t('Cargando…')}</Card>;

  const header = <PageHeader title={t('Panel de gestión')} subtitle={t('Obras compartidas con vos por los jefes de obra del estudio')} icon={Building2} tone="lilac" />;

  if (data.obras.length === 0) {
    return (
      <div>
        {header}
        <EmptyState icon={Users} title={t('Todavía no tenés obras conectadas')}
          text={t('Pedile al jefe de obra que te envíe un link de invitación desde Equipo. Al abrirlo, sus obras van a aparecer acá.')}
          action={<Link to="/app/equipo" className="inline-flex items-center gap-2 text-sm font-semibold text-lilac">{t('¿Sos jefe de obra? Invitá a tu equipo')} <ArrowRight size={16} /></Link>} />
      </div>
    );
  }

  const pendientes = data.pedidos.filter((p) => p.estado === 'pendiente');
  const enCamino = data.pedidos.filter((p) => p.estado === 'en_camino');
  const alertas = data.seguros.filter((s) => daysUntil(s.vigencia_hasta) <= 30);

  return (
    <div>
      {header}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label={t('Obras conectadas')} value={data.obras.length} icon={Building2} tone="lilac" />
        <StatCard label={t('Pedidos por aprobar')} value={pendientes.length} icon={ClipboardList} tone="peach"
          hint={pendientes.some((p) => p.prioridad === 'critica') ? t('Hay pedidos críticos') : undefined} />
        <StatCard label={t('En camino')} value={enCamino.length} icon={Truck} tone="sky" />
        <StatCard label={t('Alertas de seguros')} value={alertas.length} icon={ShieldAlert} tone={alertas.length ? 'rose' : 'sage'}
          hint={alertas.length ? t('Pólizas que vencen en 30 días o menos') : t('Todo en orden. Sin vencimientos próximos.')} />
      </div>

      <div className="mb-5">
        <Segmented value={tab} onChange={(v) => setParams(v === 'pedidos' ? {} : { tab: v }, { replace: true })}
          options={[{ value: 'pedidos', label: `${t('Pedidos')} (${data.pedidos.length})` }, { value: 'obras', label: `${t('Obras')} (${data.obras.length})` }]} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
          {tab === 'pedidos' ? (
            <GestionPedidos data={data} pedidos={data.pedidos} cambiarEstado={cambiarEstado} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.obras.map((o, i) => {
                const pend = pendientes.filter((p) => p.obra_id === o.id).length;
                const alert = alertas.filter((s) => s.obra_id === o.id).length;
                const avance = avanceObra(o, data);
                return (
                  <Card key={o.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04 } }} whileHover={{ y: -3 }}
                    onClick={() => navigate(`/app/estudio/obras/${o.id}`)} className="cursor-pointer p-5 transition-shadow hover:shadow-lift">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <h3 className="font-bold leading-snug">{o.nombre}</h3>
                      <ChevronRight size={18} className="shrink-0 text-muted" />
                    </div>
                    <p className="mb-4 truncate text-sm text-muted">{o.direccion ?? t('Sin dirección')}{o.user_id && data.jefes[o.user_id] ? ` · ${data.jefes[o.user_id].nombre}` : ''}</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><p className="text-xs text-muted">{t('Saldo caja chica')}</p><p className="font-bold tabular-nums">{fmtMoney(saldoObra(o, data))}</p></div>
                      <div><p className="text-xs text-muted">{t('Avance de tareas')}</p><p className="font-bold">{avance}%</p>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><motion.div className="h-full bg-sky" initial={{ width: 0 }} animate={{ width: `${avance}%` }} /></div></div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {pend > 0 && <Badge tone="peach"><PackageCheck size={12} /> {t('{n} por aprobar', { n: pend })}</Badge>}
                      {alert > 0 && <Badge tone="rose"><ShieldAlert size={12} /> {t('{n} alertas', { n: alert })}</Badge>}
                      {pend === 0 && alert === 0 && <Badge tone="sage">{t('Al día')}</Badge>}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------- detalle de obra
export function ObraEstudio() {
  const { id } = useParams();
  const { data, cambiarEstado } = usePanel();

  if (!data) return <Card className="p-10 text-center text-sm text-muted">{t('Cargando…')}</Card>;
  const obra = data.obras.find((o) => o.id === id);
  if (!obra) {
    return <EmptyState icon={Building2} title={t('No tenés acceso a esta obra')} action={<Link to="/app/estudio" className="text-sm font-semibold text-lilac">{t('Volver al panel')}</Link>} />;
  }
  const jefe = obra.user_id ? data.jefes[obra.user_id] : undefined;

  return (
    <div>
      <Link to="/app/estudio?tab=obras" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink"><ArrowLeft size={16} /> {t('Volver al panel')}</Link>
      <ResumenObra obra={obra} readOnly header={
        <PageHeader title={obra.nombre} icon={Building2} tone="lilac"
          subtitle={[obra.direccion, jefe?.nombre && t('Jefe de obra: {x}', { x: jefe.nombre })].filter(Boolean).join(' · ')}
          actions={<Badge tone="sky">{t('Solo lectura')}</Badge>} />
      } />
      <h2 className="mb-4 mt-8 flex items-center gap-2 text-lg font-bold"><ClipboardList size={20} className="text-peach" /> {t('Pedidos de la obra')}</h2>
      <GestionPedidos data={data} pedidos={data.pedidos.filter((p) => p.obra_id === obra.id)} cambiarEstado={cambiarEstado} mostrarObra={false} />
    </div>
  );
}
