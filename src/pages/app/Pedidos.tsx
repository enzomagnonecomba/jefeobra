import { useMemo, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  PackagePlus, ClipboardList, Calculator, Plus, Trash2, Send, Search, Package, CalendarDays, Store, ArrowRight,
  Ruler, Box, BrickWall, Percent,
} from 'lucide-react';
import { useTable } from '../../hooks/useTable';
import { useToast } from '../../components/Toast';
import {
  Badge, Button, Card, EmptyState, Field, IconButton, Modal, PageHeader, PRIORIDAD_LABEL, PRIORIDAD_TONE, Segmented, TONE, fmtDate, type Tone,
} from '../../components/ui';
import { PEDIDO_ESTADOS, PRIORIDADES, type Pedido, type PedidoEstado, type PedidoItem, type Prioridad } from '../../types';

export const ESTADO_PEDIDO: Record<PedidoEstado, { label: string; tone: Tone }> = {
  pendiente: { label: 'Pendiente', tone: 'peach' },
  aprobado: { label: 'Aprobado', tone: 'sage' },
  en_camino: { label: 'En camino', tone: 'sky' },
  entregado: { label: 'Entregado', tone: 'lilac' },
};

const UNIDADES = ['u', 'm', 'm²', 'm³', 'kg', 'tn', 'bolsa', 'barra', 'l', 'rollo', 'caja'];
const emptyItem = (): PedidoItem => ({ descripcion: '', cantidad: 1, unidad: 'u' });

// ==================================================================== NUEVO PEDIDO
export function NuevoPedido() {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const { create } = useTable<Pedido>('pedidos');
  const pre = (location.state as { items?: PedidoItem[]; titulo?: string } | null) ?? {};

  const [titulo, setTitulo] = useState(pre.titulo ?? '');
  const [proveedor, setProveedor] = useState('');
  const [prioridad, setPrioridad] = useState<Prioridad>('media');
  const [fecha, setFecha] = useState('');
  const [notas, setNotas] = useState('');
  const [items, setItems] = useState<PedidoItem[]>(pre.items?.length ? pre.items : [emptyItem()]);
  const [busy, setBusy] = useState(false);

  const setItem = (i: number, p: Partial<PedidoItem>) => setItems(items.map((it, j) => (j === i ? { ...it, ...p } : it)));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const clean = items.filter((i) => i.descripcion.trim() && i.cantidad > 0);
    if (!clean.length) return toast.error('Agregá al menos un ítem con descripción y cantidad');
    setBusy(true);
    try {
      await create({
        titulo: titulo.trim(), proveedor: proveedor.trim() || null, prioridad, fecha_requerida: fecha || null,
        notas: notas.trim() || null, items: clean, estado: 'pendiente',
      });
      toast.ok('Pedido enviado');
      navigate('/app/pedidos/mis-pedidos');
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setBusy(false); }
  }

  return (
    <div className="max-w-4xl">
      <PageHeader title="Nuevo pedido" subtitle="Solicitá materiales e insumos para la obra" icon={PackagePlus} tone="peach" />
      <form onSubmit={onSubmit} className="space-y-5">
        <Card className="grid gap-4 p-6 sm:grid-cols-2">
          <Field label="Título del pedido *" className="sm:col-span-2">
            <input className="field" required placeholder="Ej. Materiales mampostería PB" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </Field>
          <Field label="Proveedor sugerido">
            <input className="field" placeholder="Opcional" value={proveedor} onChange={(e) => setProveedor(e.target.value)} />
          </Field>
          <Field label="Fecha requerida">
            <input type="date" className="field" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <span className="label">Prioridad</span>
            <div className="flex flex-wrap gap-2">
              {PRIORIDADES.map((p) => (
                <motion.button type="button" key={p} whileTap={{ scale: 0.95 }} onClick={() => setPrioridad(p)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${prioridad === p ? `${TONE[PRIORIDAD_TONE[p]]} ring-2 ring-slate-300` : 'border border-line bg-white text-muted'}`}>
                  {PRIORIDAD_LABEL[p]}
                </motion.button>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">Ítems <span className="font-medium text-muted">({items.length})</span></h2>
            <Button type="button" variant="soft" icon={Plus} onClick={() => setItems([...items, emptyItem()])}>Agregar ítem</Button>
          </div>
          <div className="space-y-2">
            <div className="hidden grid-cols-[1fr_110px_110px_36px] gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted sm:grid">
              <span>Descripción</span><span>Cantidad</span><span>Unidad</span><span />
            </div>
            <AnimatePresence initial={false}>
              {items.map((it, i) => (
                <motion.div key={i} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_110px_110px_36px]">
                  <input className="field col-span-2 sm:col-span-1" placeholder="Ej. Cemento portland" aria-label="Descripción" value={it.descripcion} onChange={(e) => setItem(i, { descripcion: e.target.value })} />
                  <input className="field" type="number" min={0} step="any" aria-label="Cantidad" value={it.cantidad} onChange={(e) => setItem(i, { cantidad: Number(e.target.value) })} />
                  <select className="field" aria-label="Unidad" value={it.unidad} onChange={(e) => setItem(i, { unidad: e.target.value })}>
                    {UNIDADES.map((u) => <option key={u}>{u}</option>)}
                  </select>
                  <IconButton icon={Trash2} label="Quitar ítem" className="self-center" disabled={items.length === 1} onClick={() => setItems(items.filter((_, j) => j !== i))} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </Card>

        <Card className="p-6">
          <Field label="Notas para compras">
            <textarea className="field min-h-20" placeholder="Especificaciones, marcas, lugar de descarga…" value={notas} onChange={(e) => setNotas(e.target.value)} />
          </Field>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button type="submit" icon={Send} disabled={busy}>{busy ? 'Enviando…' : 'Enviar pedido'}</Button>
        </div>
      </form>
    </div>
  );
}

// ==================================================================== MIS PEDIDOS
export function MisPedidos() {
  const { rows, loading, patch, destroy } = useTable<Pedido>('pedidos');
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState<'todos' | PedidoEstado>('todos');
  const [q, setQ] = useState('');
  const [detalle, setDetalle] = useState<Pedido | null>(null);

  const list = useMemo(() => rows.filter((p) =>
    (filtro === 'todos' || p.estado === filtro) &&
    (!q || `${p.titulo} ${p.proveedor ?? ''} ${p.items.map((i) => i.descripcion).join(' ')}`.toLowerCase().includes(q.toLowerCase())),
  ), [rows, filtro, q]);

  return (
    <div>
      <PageHeader title="Mis pedidos" subtitle="Historial y estado de tus solicitudes" icon={ClipboardList} tone="peach"
        actions={<Button icon={Plus} onClick={() => navigate('/app/pedidos/nuevo')}>Nuevo pedido</Button>} />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Segmented value={filtro} onChange={setFiltro}
          options={[{ value: 'todos', label: `Todos (${rows.length})` }, ...PEDIDO_ESTADOS.map((s) => ({ value: s, label: `${ESTADO_PEDIDO[s].label} (${rows.filter((r) => r.estado === s).length})` }))]} />
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="field pl-9" placeholder="Buscar pedido o material…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {loading ? <Card className="p-10 text-center text-sm text-muted">Cargando…</Card> : rows.length === 0 ? (
        <EmptyState icon={Package} title="Sin pedidos todavía" text="Cuando hagas tu primer pedido de materiales lo vas a ver acá con su estado."
          action={<Button icon={Plus} onClick={() => navigate('/app/pedidos/nuevo')}>Nuevo pedido</Button>} />
      ) : (
        <motion.div layout className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {list.map((p, i) => (
              <Card key={p.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.03 } }} exit={{ opacity: 0, scale: 0.95 }}
                whileHover={{ y: -3 }} onClick={() => setDetalle(p)} className="cursor-pointer p-5 transition-shadow hover:shadow-lift">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <h3 className="font-bold leading-snug">{p.titulo}</h3>
                  <Badge tone={ESTADO_PEDIDO[p.estado].tone}>{ESTADO_PEDIDO[p.estado].label}</Badge>
                </div>
                <ul className="mb-4 space-y-1 text-sm text-muted">
                  {p.items.slice(0, 3).map((it, j) => <li key={j} className="flex justify-between gap-2"><span className="truncate">{it.descripcion}</span><span className="shrink-0 tabular-nums font-medium text-ink">{it.cantidad} {it.unidad}</span></li>)}
                  {p.items.length > 3 && <li className="text-xs">+{p.items.length - 3} ítems más</li>}
                </ul>
                <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3 text-xs text-muted">
                  <Badge tone={PRIORIDAD_TONE[p.prioridad]}>{PRIORIDAD_LABEL[p.prioridad]}</Badge>
                  {p.fecha_requerida && <span className="inline-flex items-center gap-1"><CalendarDays size={12} /> {fmtDate(p.fecha_requerida)}</span>}
                  {p.proveedor && <span className="inline-flex items-center gap-1"><Store size={12} /> {p.proveedor}</span>}
                </div>
              </Card>
            ))}
          </AnimatePresence>
          {list.length === 0 && <p className="col-span-full py-10 text-center text-sm text-muted">Sin pedidos para este filtro.</p>}
        </motion.div>
      )}

      <Modal open={!!detalle} onClose={() => setDetalle(null)} title={detalle?.titulo ?? ''} wide>
        {detalle && (
          <div className="space-y-5">
            <div>
              <span className="label">Estado</span>
              <div className="flex flex-wrap items-center gap-2">
                {PEDIDO_ESTADOS.map((s, i) => (
                  <div key={s} className="flex items-center gap-2">
                    <button onClick={() => { void patch(detalle.id, { estado: s }); setDetalle({ ...detalle, estado: s }); }}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${detalle.estado === s ? `${TONE[ESTADO_PEDIDO[s].tone]} ring-2 ring-slate-300` : 'bg-slate-100 text-muted hover:text-ink'}`}>
                      {ESTADO_PEDIDO[s].label}
                    </button>
                    {i < PEDIDO_ESTADOS.length - 1 && <ArrowRight size={12} className="text-slate-300" />}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <div><span className="label">Prioridad</span><Badge tone={PRIORIDAD_TONE[detalle.prioridad]}>{PRIORIDAD_LABEL[detalle.prioridad]}</Badge></div>
              <div><span className="label">Requerido</span>{fmtDate(detalle.fecha_requerida)}</div>
              <div><span className="label">Proveedor</span>{detalle.proveedor ?? '—'}</div>
              <div><span className="label">Creado</span>{fmtDate(detalle.created_at)}</div>
            </div>
            <div className="overflow-hidden rounded-xl border border-line">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-2 text-left">Ítem</th><th className="px-4 py-2 text-right">Cantidad</th></tr></thead>
                <tbody>{detalle.items.map((it, i) => <tr key={i} className="border-t border-line"><td className="px-4 py-2">{it.descripcion}</td><td className="px-4 py-2 text-right tabular-nums">{it.cantidad} {it.unidad}</td></tr>)}</tbody>
              </table>
            </div>
            {detalle.notas && <div><span className="label">Notas</span><p className="text-sm">{detalle.notas}</p></div>}
            <div className="flex justify-between">
              <Button variant="danger" icon={Trash2} onClick={() => { void destroy(detalle.id); setDetalle(null); }}>Eliminar pedido</Button>
              <Button variant="soft" onClick={() => navigate('/app/pedidos/nuevo', { state: { titulo: `${detalle.titulo} (copia)`, items: detalle.items } })}>Duplicar</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ==================================================================== CÁLCULOS
type Calc = 'superficie' | 'hormigon' | 'ladrillos' | 'desperdicio';
const LADRILLOS: Record<string, { label: string; porM2: number }> = {
  comun: { label: 'Ladrillo común (5.5x12x25)', porM2: 60 },
  hueco12: { label: 'Hueco 12x18x33', porM2: 16 },
  hueco18: { label: 'Hueco 18x18x33', porM2: 16 },
  bloque: { label: 'Bloque de hormigón 20x20x40', porM2: 12.5 },
};

export function Calculos() {
  const navigate = useNavigate();
  const [tipo, setTipo] = useState<Calc>('hormigon');
  const [v, setV] = useState({ largo: '5', ancho: '4', espesor: '0.12', desperdicio: '10', ladrillo: 'hueco12', base: '100' });
  const n = (k: keyof typeof v) => Math.max(0, Number(v[k]) || 0);
  const factor = 1 + n('desperdicio') / 100;

  const res = useMemo(() => {
    const area = n('largo') * n('ancho');
    switch (tipo) {
      case 'superficie': return { valor: area * factor, unidad: 'm²', detalle: `${area.toFixed(2)} m² + ${n('desperdicio')}% desperdicio`, item: 'Superficie de piso / revestimiento' };
      case 'hormigon': {
        const vol = area * n('espesor') * factor;
        return { valor: vol, unidad: 'm³', detalle: `${area.toFixed(2)} m² × ${n('espesor')} m de espesor + ${n('desperdicio')}%`, item: 'Hormigón elaborado H-21',
          extra: [{ k: 'Cemento (aprox. 7 bolsas/m³)', v: `${Math.ceil(vol * 7)} bolsas` }, { k: 'Arena', v: `${(vol * 0.65).toFixed(2)} m³` }, { k: 'Piedra', v: `${(vol * 0.85).toFixed(2)} m³` }] };
      }
      case 'ladrillos': {
        const l = LADRILLOS[v.ladrillo];
        return { valor: Math.ceil(area * l.porM2 * factor), unidad: 'u', detalle: `${area.toFixed(2)} m² × ${l.porM2} u/m² + ${n('desperdicio')}%`, item: l.label };
      }
      case 'desperdicio': return { valor: n('base') * factor, unidad: 'u', detalle: `${n('base')} + ${n('desperdicio')}% de desperdicio`, item: 'Material' };
    }
  }, [tipo, v]); // eslint-disable-line react-hooks/exhaustive-deps

  const input = (k: keyof typeof v, label: string, suffix: string) => (
    <Field label={label}>
      <div className="relative">
        <input className="field pr-12" type="number" min={0} step="any" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted">{suffix}</span>
      </div>
    </Field>
  );

  const valorRedondeado = res.unidad === 'u' ? Math.ceil(res.valor) : Number(res.valor.toFixed(2));

  return (
    <div className="max-w-5xl">
      <PageHeader title="Cálculos" subtitle="Calculadora rápida de obra" icon={Calculator} tone="lilac" />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {([
          ['superficie', 'Superficie', Ruler], ['hormigon', 'Hormigón', Box], ['ladrillos', 'Ladrillos por m²', BrickWall], ['desperdicio', 'Desperdicio %', Percent],
        ] as const).map(([k, label, Icon]) => (
          <motion.button key={k} whileTap={{ scale: 0.97 }} onClick={() => setTipo(k)}
            className={`flex items-center gap-3 rounded-2xl border p-4 text-left text-sm font-semibold transition ${tipo === k ? 'border-lilac/30 bg-lilac-bg text-lilac shadow-soft' : 'border-line bg-white hover:border-slate-300'}`}>
            <Icon size={18} /> {label}
          </motion.button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card className="grid content-start gap-4 p-6 sm:grid-cols-2">
          {tipo !== 'desperdicio' && <>{input('largo', 'Largo', 'm')}{input('ancho', tipo === 'ladrillos' ? 'Alto del muro' : 'Ancho', 'm')}</>}
          {tipo === 'hormigon' && input('espesor', 'Espesor', 'm')}
          {tipo === 'ladrillos' && (
            <Field label="Tipo de ladrillo">
              <select className="field" value={v.ladrillo} onChange={(e) => setV({ ...v, ladrillo: e.target.value })}>
                {Object.entries(LADRILLOS).map(([k, l]) => <option key={k} value={k}>{l.label}</option>)}
              </select>
            </Field>
          )}
          {tipo === 'desperdicio' && input('base', 'Cantidad neta', 'u')}
          {input('desperdicio', 'Desperdicio', '%')}
        </Card>

        <AnimatePresence mode="wait">
          <motion.div key={tipo} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
            <Card className="flex h-full flex-col bg-gradient-to-br from-white to-lilac-bg/40 p-6">
              <span className="label">Resultado</span>
              <motion.p key={valorRedondeado} initial={{ scale: 0.96, opacity: 0.6 }} animate={{ scale: 1, opacity: 1 }} className="text-4xl font-extrabold tracking-tight">
                {valorRedondeado.toLocaleString('es-AR')} <span className="text-xl text-muted">{res.unidad}</span>
              </motion.p>
              <p className="mt-1 text-sm text-muted">{res.detalle}</p>
              {'extra' in res && res.extra && (
                <ul className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
                  {res.extra.map((x) => <li key={x.k} className="flex justify-between"><span className="text-muted">{x.k}</span><span className="font-semibold">{x.v}</span></li>)}
                </ul>
              )}
              <div className="flex-1" />
              <Button className="mt-6" icon={Send}
                onClick={() => navigate('/app/pedidos/nuevo', { state: { titulo: `Pedido desde cálculo: ${res.item}`, items: [{ descripcion: res.item, cantidad: valorRedondeado, unidad: res.unidad }] } })}>
                Enviar a nuevo pedido
              </Button>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
