import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, Wallet, Package, KanbanSquare, ShieldAlert, ArrowDownLeft, ArrowUpRight, FilePlus2, ChevronRight } from 'lucide-react';
import * as db from '../../lib/db';
import { useObra } from '../../context/ObraContext';
import { Badge, Card, PageHeader, StatCard, daysUntil, fmtDate, fmtMoney } from '../../components/ui';
import { ESTADO_PEDIDO } from './Pedidos';
import type { CajaMovimiento, Pedido, Tarea } from '../../types';
import { t } from '../../i18n';

interface Data {
  tareas: Tarea[]; pedidos: Pedido[]; caja: CajaMovimiento[];
  seguros: { id: string; tipo: string; aseguradora: string; vigencia_hasta: string }[];
  adicionales: { id: string; estado: string; costo_estimado: number }[];
}

const COLS = [
  { k: 'por_comenzar', get label() { return t('Por comenzar'); }, bar: 'bg-lilac' },
  { k: 'en_curso', get label() { return t('En curso'); }, bar: 'bg-sky' },
  { k: 'en_pausa', get label() { return t('En pausa'); }, bar: 'bg-peach' },
  { k: 'terminada', get label() { return t('Terminada'); }, bar: 'bg-sage' },
] as const;

export default function Resumen() {
  const { obraActiva } = useObra();
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    if (!obraActiva) return;
    const f = { obra_id: obraActiva.id };
    Promise.all([
      db.list<Tarea>('tareas', f), db.list<Pedido>('pedidos', f), db.list<CajaMovimiento>('caja_movimientos', f, 'fecha'),
      db.list<Data['seguros'][number]>('seguros', f), db.list<Data['adicionales'][number]>('adicionales', f),
    ]).then(([tareas, pedidos, caja, seguros, adicionales]) => setData({ tareas, pedidos, caja, seguros, adicionales }))
      .catch(console.error);
  }, [obraActiva]);

  if (!obraActiva) return null;
  if (!data) return <Card className="p-10 text-center text-sm text-muted">{t("Cargando resumen…")}</Card>;

  const ing = data.caja.filter((m) => m.tipo === 'ingreso').reduce((a, m) => a + Number(m.monto), 0);
  const egr = data.caja.filter((m) => m.tipo === 'egreso').reduce((a, m) => a + Number(m.monto), 0);
  // El presupuesto asignado a la obra es el fondo inicial de la caja chica.
  const presupuesto = Number(obraActiva.presupuesto_caja) || 0;
  const fondos = presupuesto + ing;
  const saldo = fondos - egr;
  const usado = fondos ? Math.min(100, Math.round((egr / fondos) * 100)) : 0;
  const activos = data.pedidos.filter((p) => p.estado !== 'entregado');
  const done = data.tareas.filter((tk) => tk.estado === 'terminada').length;
  const avance = data.tareas.length ? Math.round((done / data.tareas.length) * 100) : 0;
  const alertas = data.seguros.filter((s) => daysUntil(s.vigencia_hasta) <= 30);
  const adicAprob = data.adicionales.filter((a) => a.estado === 'aprobado').reduce((a, x) => a + Number(x.costo_estimado), 0);

  return (
    <div>
      <PageHeader title={t("Resumen de obra")} subtitle={`${obraActiva.nombre}${obraActiva.direccion ? ` · ${obraActiva.direccion}` : ''}`} icon={LayoutDashboard} tone="sage" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("Saldo caja chica")} value={fmtMoney(saldo)} icon={Wallet} tone={saldo < 0 ? 'peach' : 'rose'}
          hint={fondos ? (
            <div><div className="mb-1 flex justify-between"><span>{t('Gastado de {x}', { x: fmtMoney(fondos) })}</span><span>{usado}%</span></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><motion.div className={`h-full ${usado > 85 ? 'bg-peach' : 'bg-rose'}`} initial={{ width: 0 }} animate={{ width: `${usado}%` }} transition={{ duration: 0.8 }} /></div></div>
          ) : t('Sin presupuesto asignado — editalo en Mis obras')} />
        <StatCard label={t("Pedidos activos")} value={activos.length} icon={Package} tone="peach" hint={t('{n} pendientes de aprobación', { n: data.pedidos.filter((p) => p.estado === 'pendiente').length })} />
        <StatCard label={t("Avance de tareas")} value={`${avance}%`} icon={KanbanSquare} tone="sky" hint={t('{a} de {b} terminadas', { a: done, b: data.tareas.length })} />
        <StatCard label={t("Adicionales aprobados")} value={fmtMoney(adicAprob)} icon={FilePlus2} tone="lilac" hint={t('{n} esperando aprobación', { n: data.adicionales.filter((a) => a.estado === 'propuesto').length })} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">{t("Estado del tablero")}</h2>
            <Link to="/app/seguimiento" className="inline-flex items-center text-sm font-semibold text-sky hover:underline">{t("Ver tablero")} <ChevronRight size={16} /></Link>
          </div>
          <div className="mb-5 flex h-3 overflow-hidden rounded-full bg-slate-100">
            {COLS.map((c, i) => {
              const n = data.tareas.filter((tk) => tk.estado === c.k).length;
              return n ? <motion.div key={c.k} className={c.bar} initial={{ width: 0 }} animate={{ width: `${(n / data.tareas.length) * 100}%` }} transition={{ delay: i * 0.1, duration: 0.6 }} /> : null;
            })}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {COLS.map((c) => (
              <div key={c.k} className="rounded-xl bg-slate-50 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted"><span className={`h-2 w-2 rounded-full ${c.bar}`} />{c.label}</div>
                <p className="mt-1 text-2xl font-bold">{data.tareas.filter((tk) => tk.estado === c.k).length}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 flex items-center gap-2 font-bold"><ShieldAlert size={18} className="text-peach" /> {t("Alertas")}</h2>
          {alertas.length === 0 && activos.filter((p) => p.prioridad === 'critica').length === 0 ? (
            <p className="rounded-xl bg-sage-bg p-4 text-sm font-medium text-sage">{t("Todo en orden. Sin vencimientos próximos.")}</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {alertas.map((s) => {
                const d = daysUntil(s.vigencia_hasta);
                return <li key={s.id} className="rounded-xl bg-peach-bg p-3 text-peach"><b>{t('Póliza {x}', { x: s.aseguradora })}</b> {d < 0 ? t('vencida hace {n} días', { n: -d }) : t('vence en {n} días', { n: d })}</li>;
              })}
              {activos.filter((p) => p.prioridad === 'critica').map((p) => <li key={p.id} className="rounded-xl bg-rose-bg p-3 text-rose">{t("Pedido crítico:")} <b>{p.titulo}</b></li>)}
            </ul>
          )}
        </Card>

        <Card className="p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">{t("Últimos movimientos de caja")}</h2>
            <Link to="/app/obra/caja-chica" className="inline-flex items-center text-sm font-semibold text-rose hover:underline">{t("Caja chica")} <ChevronRight size={16} /></Link>
          </div>
          <ul className="divide-y divide-line">
            {data.caja.slice(0, 5).map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className={`grid h-8 w-8 place-items-center rounded-lg ${m.tipo === 'ingreso' ? 'bg-sage-bg text-sage' : 'bg-rose-bg text-rose'}`}>
                  {m.tipo === 'ingreso' ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                </span>
                <span className="flex-1 truncate">{m.concepto}</span>
                <span className="hidden text-xs text-muted sm:inline">{fmtDate(m.fecha)}</span>
                <span className={`shrink-0 text-right font-semibold tabular-nums sm:w-28 ${m.tipo === 'ingreso' ? 'text-sage' : 'text-rose'}`}>{m.tipo === 'ingreso' ? '+' : '−'}{fmtMoney(m.monto)}</span>
              </li>
            ))}
            {data.caja.length === 0 && <li className="py-4 text-sm text-muted">{t("Sin movimientos.")}</li>}
          </ul>
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">{t("Pedidos recientes")}</h2>
            <Link to="/app/pedidos/mis-pedidos" className="text-sm font-semibold text-peach hover:underline">{t("Ver todos")}</Link>
          </div>
          <ul className="space-y-2">
            {data.pedidos.slice(0, 5).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{p.titulo}</span>
                <Badge tone={ESTADO_PEDIDO[p.estado].tone}>{ESTADO_PEDIDO[p.estado].label}</Badge>
              </li>
            ))}
            {data.pedidos.length === 0 && <li className="text-sm text-muted">{t("Sin pedidos.")}</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
