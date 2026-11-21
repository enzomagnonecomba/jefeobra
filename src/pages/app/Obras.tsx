import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Building2, Plus, MapPin, Check, Trash2 } from 'lucide-react';
import { useObra } from '../../context/ObraContext';
import { useToast } from '../../components/Toast';
import { Badge, Button, Card, Field, Modal, PageHeader, fmtMoney } from '../../components/ui';
import type { Obra } from '../../types';
import { t } from '../../i18n';
import { Select } from '../../components/Select';

const ESTADO = {
  activa: { get label() { return t('Activa'); }, tone: 'sage' as const },
  pausada: { get label() { return t('Pausada'); }, tone: 'peach' as const },
  finalizada: { get label() { return t('Finalizada'); }, tone: 'slate' as const },
};

export default function Obras() {
  const { obras, obraActiva, seleccionar, crearObra, actualizarObra, eliminarObra } = useObra();
  const toast = useToast();
  const [editing, setEditing] = useState<Obra | 'new' | null>(null);
  const [form, setForm] = useState({ nombre: '', direccion: '', presupuesto_caja: '0', estado: 'activa' as Obra['estado'] });

  const open = (o: Obra | 'new') => {
    setForm(o === 'new' ? { nombre: '', direccion: '', presupuesto_caja: '0', estado: 'activa' }
      : { nombre: o.nombre, direccion: o.direccion ?? '', presupuesto_caja: String(o.presupuesto_caja ?? 0), estado: o.estado });
    setEditing(o);
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const values = { nombre: form.nombre.trim(), direccion: form.direccion.trim() || null, presupuesto_caja: Number(form.presupuesto_caja) || 0 };
    try {
      if (editing === 'new') await crearObra(values);
      else if (editing) await actualizarObra(editing.id, { ...values, estado: form.estado });
      toast.ok(t('Obra guardada'));
      setEditing(null);
    } catch (err) { toast.error((err as Error).message); }
  }

  return (
    <div>
      <PageHeader title={t("Mis obras")} subtitle={t("Cada obra es un espacio independiente con sus propios datos")} icon={Building2} tone="sage"
        actions={<Button icon={Plus} onClick={() => open('new')}>{t("Nueva obra")}</Button>} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {obras.map((o, i) => (
          <Card key={o.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04 } }} whileHover={{ y: -3 }}
            className={`p-5 ${obraActiva?.id === o.id ? 'ring-2 ring-sage/30' : ''}`}>
            <div className="mb-2 flex items-start justify-between gap-2">
              <h3 className="font-bold">{o.nombre}</h3>
              <Badge tone={ESTADO[o.estado].tone}>{ESTADO[o.estado].label}</Badge>
            </div>
            <p className="mb-1 flex items-center gap-1 text-sm text-muted"><MapPin size={14} /> {o.direccion || t('Sin dirección')}</p>
            <p className="mb-4 text-sm text-muted">{t("Presupuesto caja chica:")} <b className="text-ink">{fmtMoney(o.presupuesto_caja)}</b></p>
            <div className="flex gap-2">
              {obraActiva?.id === o.id
                ? <Badge tone="sage"><Check size={12} /> {t("Obra activa")}</Badge>
                : <Button variant="soft" onClick={() => seleccionar(o.id)}>{t("Usar esta obra")}</Button>}
              <Button variant="ghost" className="ml-auto" onClick={() => open(o)}>{t("Editar")}</Button>
            </div>
          </Card>
        ))}
        <motion.button whileHover={{ y: -3 }} onClick={() => open('new')}
          className="grid min-h-40 place-items-center rounded-2xl border-2 border-dashed border-line text-sm font-semibold text-muted hover:border-slate-300 hover:text-ink">
          <span className="flex items-center gap-2"><Plus size={18} /> {t("Agregar obra")}</span>
        </motion.button>
      </div>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? t('Nueva obra') : t('Editar obra')}>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label={t("Nombre *")}><input className="field" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></Field>
          <Field label={t("Dirección")}><input className="field" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} /></Field>
          <Field label={t("Presupuesto de caja chica")}><input type="number" min={0} className="field" value={form.presupuesto_caja} onChange={(e) => setForm({ ...form, presupuesto_caja: e.target.value })} /></Field>
          {editing !== 'new' && (
            <Field label={t("Estado")}>
              <Select<Obra['estado']> value={form.estado} ariaLabel={t('Estado')} onChange={(v) => setForm({ ...form, estado: v })}
                options={(Object.keys(ESTADO) as Obra['estado'][]).map((k) => ({ value: k, label: ESTADO[k].label, tone: ESTADO[k].tone }))} />
            </Field>
          )}
          <div className="flex justify-between pt-2">
            {editing && editing !== 'new' ? (
              <Button type="button" variant="danger" icon={Trash2} onClick={async () => {
                if (!window.confirm(t('¿Eliminar "{x}" y TODOS sus datos (tareas, pedidos, caja…)? No se puede deshacer.', { x: editing.nombre }))) return;
                await eliminarObra(editing.id); setEditing(null); toast.ok(t('Obra eliminada'));
              }}>{t("Eliminar")}</Button>
            ) : <span />}
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
