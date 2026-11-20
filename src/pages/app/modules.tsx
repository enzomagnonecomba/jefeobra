import {
  Wallet, HardHat, FilePlus2, FolderInput, Truck, Container, ShieldCheck, Shirt, Wrench,
  ArrowDownLeft, ArrowUpRight, Scale, Clock, Users, AlertTriangle,
} from 'lucide-react';
import { type CrudConfig } from '../../components/CrudModule';
import { Badge, StatCard, daysUntil, fmtDate, fmtMoney } from '../../components/ui';
import { useObra } from '../../context/ObraContext';
import type { Row } from '../../types';
import { t } from '../../i18n';

type R = Row & Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const sum = (rows: R[], fn: (r: R) => number) => rows.reduce((a, r) => a + fn(r), 0);

// ---------------------------------------------------------------- CAJA CHICA
function CajaSummary({ rows }: { rows: R[] }) {
  const { obraActiva } = useObra();
  const ing = sum(rows.filter((r) => r.tipo === 'ingreso'), (r) => Number(r.monto));
  const egr = sum(rows.filter((r) => r.tipo === 'egreso'), (r) => Number(r.monto));
  // El presupuesto asignado a la obra es el fondo inicial de la caja chica.
  const presupuesto = Number(obraActiva?.presupuesto_caja) || 0;
  const saldo = presupuesto + ing - egr;
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard label={t("Ingresos")} value={fmtMoney(ing)} icon={ArrowDownLeft} tone="sage"
        hint={presupuesto ? t('+ presupuesto inicial {x}', { x: fmtMoney(presupuesto) }) : undefined} />
      <StatCard label={t("Egresos")} value={fmtMoney(egr)} icon={ArrowUpRight} tone="rose" />
      <StatCard label={t("Saldo disponible")} value={<span className={saldo < 0 ? 'text-peach' : ''}>{fmtMoney(saldo)}</span>} icon={Scale} tone={saldo < 0 ? 'peach' : 'sky'}
        hint={t("Presupuesto + ingresos − egresos")} />
    </div>
  );
}

const CATEGORIAS_CAJA = [
  { value: 'ferreteria', label: 'Ferretería' }, { value: 'materiales', label: 'Materiales menores' },
  { value: 'viaticos', label: 'Viáticos / combustible' }, { value: 'comida', label: 'Comida / refrigerio' },
  { value: 'servicios', label: 'Servicios' }, { value: 'reposicion', label: 'Reposición de caja' }, { value: 'varios', label: 'Varios' },
];

export const cajaConfig: CrudConfig<R> = {
  table: 'caja_movimientos', title: 'Caja Chica', subtitle: 'Ingresos y egresos menores del día a día', singular: 'Movimiento',
  icon: Wallet, tone: 'rose', orderBy: 'fecha', statusKey: 'tipo', searchKeys: ['concepto', 'categoria'],
  fields: [
    { key: 'tipo', label: 'Tipo', type: 'select', required: true, options: [{ value: 'egreso', label: 'Egreso', tone: 'rose' }, { value: 'ingreso', label: 'Ingreso', tone: 'sage' }] },
    { key: 'fecha', label: 'Fecha', type: 'date', required: true },
    { key: 'concepto', label: 'Concepto', type: 'text', required: true, full: true, placeholder: 'Ej. Discos de corte' },
    { key: 'categoria', label: 'Categoría', type: 'select', required: true, options: CATEGORIAS_CAJA },
    { key: 'monto', label: 'Monto', type: 'money', required: true },
  ],
  columns: [
    { key: 'fecha', label: 'Fecha' }, { key: 'concepto', label: 'Concepto' }, { key: 'categoria', label: 'Categoría' }, { key: 'tipo', label: 'Tipo' },
    { key: 'monto', label: 'Monto', align: 'right', render: (r) => <span className={`font-semibold tabular-nums ${r.tipo === 'egreso' ? 'text-rose' : 'text-sage'}`}>{r.tipo === 'egreso' ? '−' : '+'}{fmtMoney(r.monto)}</span> },
  ],
  summary: (rows) => <CajaSummary rows={rows} />,
};

// ---------------------------------------------------------------- JORNALES
export const jornalesConfig: CrudConfig<R> = {
  table: 'jornales', title: 'Jornales', subtitle: 'Asistencia y horas del personal en obra', singular: 'Jornal',
  icon: HardHat, tone: 'sky', orderBy: 'fecha', statusKey: 'asistencia', searchKeys: ['trabajador', 'categoria'],
  fields: [
    { key: 'fecha', label: 'Fecha', type: 'date', required: true },
    { key: 'trabajador', label: 'Trabajador', type: 'text', required: true },
    { key: 'categoria', label: 'Categoría', type: 'select', required: true, options: [
      { value: 'oficial', label: 'Oficial' }, { value: 'medio_oficial', label: 'Medio oficial' },
      { value: 'ayudante', label: 'Ayudante' }, { value: 'subcontratista', label: 'Subcontratista' }] },
    { key: 'asistencia', label: 'Asistencia', type: 'select', required: true, options: [
      { value: 'presente', label: 'Presente', tone: 'sage' }, { value: 'media_jornada', label: 'Media jornada', tone: 'sky' }, { value: 'ausente', label: 'Ausente', tone: 'peach' }] },
    { key: 'horas', label: 'Horas trabajadas', type: 'number', required: true, defaultValue: 8 },
    { key: 'tarifa_hora', label: 'Tarifa por hora', type: 'money', defaultValue: 0 },
    { key: 'observacion', label: 'Observación', type: 'textarea' },
  ],
  columns: [
    { key: 'fecha', label: 'Fecha' }, { key: 'trabajador', label: 'Trabajador' }, { key: 'categoria', label: 'Categoría' },
    { key: 'asistencia', label: 'Asistencia' }, { key: 'horas', label: 'Horas', align: 'right' },
    { key: 'total', label: 'Total', align: 'right', render: (r) => <span className="font-semibold tabular-nums">{fmtMoney(Number(r.horas) * Number(r.tarifa_hora))}</span> },
  ],
  summary: (rows) => (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard label={t("Personas registradas")} value={new Set(rows.map((r) => r.trabajador)).size} icon={Users} tone="lilac" />
      <StatCard label={t("Horas acumuladas")} value={sum(rows, (r) => Number(r.horas)).toLocaleString('es-AR')} icon={Clock} tone="sky" />
      <StatCard label={t("Costo de mano de obra")} value={fmtMoney(sum(rows, (r) => Number(r.horas) * Number(r.tarifa_hora)))} icon={Wallet} tone="rose" />
    </div>
  ),
};

// ---------------------------------------------------------------- ADICIONALES
export const adicionalesConfig: CrudConfig<R> = {
  table: 'adicionales', title: 'Adicionales', subtitle: 'Trabajos fuera del presupuesto original', singular: 'Adicional',
  icon: FilePlus2, tone: 'rose', orderBy: 'fecha', statusKey: 'estado', searchKeys: ['descripcion', 'motivo'],
  fields: [
    { key: 'descripcion', label: 'Descripción', type: 'text', required: true, full: true },
    { key: 'motivo', label: 'Motivo', type: 'textarea' },
    { key: 'fecha', label: 'Fecha', type: 'date', required: true },
    { key: 'costo_estimado', label: 'Costo estimado', type: 'money', required: true },
    { key: 'estado', label: 'Estado de aprobación', type: 'select', required: true, options: [
      { value: 'propuesto', label: 'Propuesto', tone: 'peach' }, { value: 'aprobado', label: 'Aprobado', tone: 'sage' }, { value: 'rechazado', label: 'Rechazado', tone: 'slate' }] },
  ],
  columns: [
    { key: 'fecha', label: 'Fecha' }, { key: 'descripcion', label: 'Descripción' },
    { key: 'motivo', label: 'Motivo', render: (r) => <span className="block max-w-xs truncate text-muted">{r.motivo || '—'}</span> },
    { key: 'costo_estimado', label: 'Costo', align: 'right' }, { key: 'estado', label: 'Estado' },
  ],
  summary: (rows) => (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard label={t("Aprobados")} value={fmtMoney(sum(rows.filter((r) => r.estado === 'aprobado'), (r) => Number(r.costo_estimado)))} icon={FilePlus2} tone="sage" />
      <StatCard label={t("Pendientes de aprobación")} value={fmtMoney(sum(rows.filter((r) => r.estado === 'propuesto'), (r) => Number(r.costo_estimado)))} icon={Clock} tone="peach" />
      <StatCard label={t("Cantidad total")} value={rows.length} icon={Scale} tone="rose" />
    </div>
  ),
};

// ---------------------------------------------------------------- MANIFIESTO
export const manifiestoConfig: CrudConfig<R> = {
  table: 'manifiestos', title: 'Manifiesto', subtitle: 'Entrada y salida de documentación, planos y remitos', singular: 'Registro',
  icon: FolderInput, tone: 'lilac', orderBy: 'fecha', statusKey: 'movimiento', searchKeys: ['descripcion', 'referencia', 'responsable'],
  fields: [
    { key: 'movimiento', label: 'Movimiento', type: 'select', required: true, options: [{ value: 'entrada', label: 'Entrada', tone: 'sage' }, { value: 'salida', label: 'Salida', tone: 'sky' }] },
    { key: 'tipo', label: 'Tipo de documento', type: 'select', required: true, options: [
      { value: 'plano', label: 'Plano', tone: 'lilac' }, { value: 'remito', label: 'Remito', tone: 'peach' },
      { value: 'documentacion', label: 'Documentación', tone: 'sky' }, { value: 'otro', label: 'Otro', tone: 'slate' }] },
    { key: 'descripcion', label: 'Descripción', type: 'text', required: true, full: true },
    { key: 'referencia', label: 'N° / Referencia', type: 'text', placeholder: 'Ej. EST-04 rev C' },
    { key: 'responsable', label: 'Entregado / recibido por', type: 'text' },
    { key: 'fecha', label: 'Fecha', type: 'date', required: true },
  ],
  columns: [
    { key: 'fecha', label: 'Fecha' }, { key: 'movimiento', label: 'Mov.' }, { key: 'tipo', label: 'Tipo' },
    { key: 'descripcion', label: 'Descripción' }, { key: 'referencia', label: 'Referencia' }, { key: 'responsable', label: 'Responsable' },
  ],
};

// ---------------------------------------------------------------- FLETES
export const fletesConfig: CrudConfig<R> = {
  table: 'fletes', title: 'Fletes', subtitle: 'Agenda de transportes y envíos', singular: 'Flete',
  icon: Truck, tone: 'sky', orderBy: 'fecha', statusKey: 'estado', searchKeys: ['origen', 'destino', 'carga', 'transportista'],
  fields: [
    { key: 'fecha', label: 'Fecha', type: 'date', required: true },
    { key: 'estado', label: 'Estado', type: 'select', required: true, options: [
      { value: 'programado', label: 'Programado', tone: 'lilac' }, { value: 'en_transito', label: 'En tránsito', tone: 'sky' },
      { value: 'realizado', label: 'Realizado', tone: 'sage' }, { value: 'cancelado', label: 'Cancelado', tone: 'slate' }] },
    { key: 'origen', label: 'Origen', type: 'text', required: true },
    { key: 'destino', label: 'Destino', type: 'text', required: true },
    { key: 'carga', label: 'Carga', type: 'text', full: true },
    { key: 'transportista', label: 'Transportista', type: 'text' },
    { key: 'costo', label: 'Costo', type: 'money' },
  ],
  columns: [
    { key: 'fecha', label: 'Fecha' }, { key: 'origen', label: 'Origen' }, { key: 'destino', label: 'Destino' },
    { key: 'carga', label: 'Carga' }, { key: 'transportista', label: 'Transportista' }, { key: 'costo', label: 'Costo', align: 'right' }, { key: 'estado', label: 'Estado' },
  ],
};

// ---------------------------------------------------------------- VOLQUETES
export const volquetesConfig: CrudConfig<R> = {
  table: 'volquetes', title: 'Volquetes', subtitle: 'Alquiler, entrega, recambio y retiro', singular: 'Volquete',
  icon: Container, tone: 'peach', statusKey: 'estado', searchKeys: ['empresa', 'numero'],
  fields: [
    { key: 'empresa', label: 'Empresa', type: 'text', required: true },
    { key: 'numero', label: 'N° de volquete', type: 'text' },
    { key: 'fecha_entrega', label: 'Fecha de entrega', type: 'date' },
    { key: 'fecha_retiro', label: 'Retiro / recambio previsto', type: 'date' },
    { key: 'costo', label: 'Costo', type: 'money' },
    { key: 'estado', label: 'Estado', type: 'select', required: true, options: [
      { value: 'solicitado', label: 'Solicitado', tone: 'lilac' }, { value: 'en_obra', label: 'En obra', tone: 'sky' },
      { value: 'recambio', label: 'Recambio', tone: 'peach' }, { value: 'retirado', label: 'Retirado', tone: 'sage' }] },
  ],
  columns: [
    { key: 'empresa', label: 'Empresa' }, { key: 'numero', label: 'N°' }, { key: 'fecha_entrega', label: 'Entrega' },
    { key: 'fecha_retiro', label: 'Retiro', render: (r) => {
      if (!r.fecha_retiro) return <span className="text-slate-300">—</span>;
      const d = daysUntil(r.fecha_retiro);
      return <span className="inline-flex items-center gap-2 tabular-nums">{fmtDate(r.fecha_retiro)}{r.estado === 'en_obra' && d <= 1 && <Badge tone="peach">{d < 0 ? t('Vencido') : d === 0 ? t('Hoy') : t('Mañana')}</Badge>}</span>;
    } },
    { key: 'costo', label: 'Costo', align: 'right' }, { key: 'estado', label: 'Estado' },
  ],
};

// ---------------------------------------------------------------- SEGUROS
const vencimiento = (hasta: string) => {
  const d = daysUntil(hasta);
  if (d < 0) return { tone: 'rose' as const, label: t('Vencida hace {n} d', { n: -d }) };
  if (d <= 30) return { tone: 'peach' as const, label: t('Vence en {n} d', { n: d }) };
  return { tone: 'sage' as const, label: t('Vigente') };
};

export const segurosConfig: CrudConfig<R> = {
  table: 'seguros', title: 'Seguros', subtitle: 'Pólizas vigentes y alertas de vencimiento', singular: 'Póliza',
  icon: ShieldCheck, tone: 'sage', orderBy: 'vigencia_hasta', ascending: true, statusKey: 'tipo', searchKeys: ['aseguradora', 'poliza'],
  fields: [
    { key: 'tipo', label: 'Tipo', type: 'select', required: true, options: [
      { value: 'art', label: 'ART', tone: 'sky' }, { value: 'responsabilidad_civil', label: 'Resp. civil', tone: 'lilac' },
      { value: 'seguro_tecnico', label: 'Seguro técnico', tone: 'peach' }, { value: 'otro', label: 'Otro', tone: 'slate' }] },
    { key: 'aseguradora', label: 'Aseguradora', type: 'text', required: true },
    { key: 'poliza', label: 'N° de póliza', type: 'text' },
    { key: 'suma_asegurada', label: 'Suma asegurada', type: 'money' },
    { key: 'vigencia_desde', label: 'Vigencia desde', type: 'date' },
    { key: 'vigencia_hasta', label: 'Vigencia hasta', type: 'date', required: true },
  ],
  columns: [
    { key: 'tipo', label: 'Tipo' }, { key: 'aseguradora', label: 'Aseguradora' }, { key: 'poliza', label: 'Póliza' },
    { key: 'vigencia_hasta', label: 'Vence' },
    { key: 'alerta', label: 'Estado', render: (r) => { const v = vencimiento(r.vigencia_hasta); return <Badge tone={v.tone}>{v.tone !== 'sage' && <AlertTriangle size={12} />}{v.label}</Badge>; } },
  ],
  rowAccent: (r) => (daysUntil(r.vigencia_hasta) <= 30 ? 'peach' : null),
};

// ---------------------------------------------------------------- EPP
export const eppConfig: CrudConfig<R> = {
  table: 'epp_entregas', title: 'EPP / Ropa de trabajo', subtitle: 'Entregas de elementos de protección por operario', singular: 'Entrega',
  icon: Shirt, tone: 'lilac', orderBy: 'fecha', searchKeys: ['operario', 'elemento'],
  fields: [
    { key: 'operario', label: 'Operario', type: 'text', required: true },
    { key: 'elemento', label: 'Elemento', type: 'select', required: true, options: [
      'Casco', 'Botines de seguridad', 'Guantes', 'Anteojos de seguridad', 'Protección auditiva', 'Arnés', 'Ropa de trabajo', 'Chaleco reflectivo', 'Barbijo / respirador', 'Otro',
    ].map((x) => ({ value: x, label: x })) },
    { key: 'talle', label: 'Talle', type: 'text' },
    { key: 'cantidad', label: 'Cantidad', type: 'number', required: true, defaultValue: 1 },
    { key: 'fecha', label: 'Fecha de entrega', type: 'date', required: true },
    { key: 'proximo_recambio', label: 'Próximo recambio', type: 'date' },
  ],
  columns: [
    { key: 'fecha', label: 'Fecha' }, { key: 'operario', label: 'Operario' }, { key: 'elemento', label: 'Elemento' },
    { key: 'talle', label: 'Talle' }, { key: 'cantidad', label: 'Cant.', align: 'right' },
    { key: 'proximo_recambio', label: 'Recambio', render: (r) => r.proximo_recambio
      ? <span className="inline-flex items-center gap-2 tabular-nums">{fmtDate(r.proximo_recambio)}{daysUntil(r.proximo_recambio) <= 15 && <Badge tone="peach">{t("Pronto")}</Badge>}</span>
      : <span className="text-slate-300">—</span> },
  ],
};

// ---------------------------------------------------------------- HERRAMIENTAS
export const herramientasConfig: CrudConfig<R> = {
  table: 'herramientas', title: 'Herramientas', subtitle: 'Inventario y asignación de equipos', singular: 'Herramienta',
  icon: Wrench, tone: 'sky', statusKey: 'estado', searchKeys: ['nombre', 'categoria', 'asignado_a'],
  fields: [
    { key: 'nombre', label: 'Nombre', type: 'text', required: true, full: true },
    { key: 'categoria', label: 'Categoría', type: 'text', placeholder: 'Eléctricas, manuales, medición…' },
    { key: 'cantidad', label: 'Cantidad', type: 'number', required: true, defaultValue: 1 },
    { key: 'asignado_a', label: 'Asignada a', type: 'text' },
    { key: 'estado', label: 'Estado', type: 'select', required: true, options: [
      { value: 'operativa', label: 'Operativa', tone: 'sage' }, { value: 'en_reparacion', label: 'En reparación', tone: 'peach' }, { value: 'baja', label: 'Baja', tone: 'slate' }] },
  ],
  columns: [
    { key: 'nombre', label: 'Nombre' }, { key: 'categoria', label: 'Categoría' }, { key: 'cantidad', label: 'Cant.', align: 'right' },
    { key: 'asignado_a', label: 'Asignada a' }, { key: 'estado', label: 'Estado' },
  ],
};

