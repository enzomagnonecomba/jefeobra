import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Users, Link2, Copy, Check, Trash2, Lock, Gem, Send, Clock, UserCheck, Share2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useObra } from '../../context/ObraContext';
import { useToast } from '../../components/Toast';
import { Badge, Button, Card, EmptyState, Field, IconButton, Modal, PageHeader, fmtDate } from '../../components/ui';
import { Select } from '../../components/Select';
import { crearInvitacion, linkInvitacion, listarInvitaciones, revocarAcceso, type Acceso } from '../../lib/estudio';
import { t } from '../../i18n';

const TODAS = '__todas';

/** Botón que copia un texto y muestra un check. */
function CopyButton({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <Button type="button" variant="soft" icon={ok ? Check : Copy}
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1800); } catch { /* sin permiso */ }
      }}>
      {ok ? t('Copiado') : t('Copiar link')}
    </Button>
  );
}

export default function Equipo() {
  const { user, setPlan } = useAuth();
  const { obras } = useObra();
  const toast = useToast();
  const [accesos, setAccesos] = useState<Acceso[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nombre: '', email: '', alcance: TODAS });
  const [busy, setBusy] = useState(false);
  const [creada, setCreada] = useState<Acceso | null>(null);
  const [revocar, setRevocar] = useState<Acceso | null>(null);

  const plan = (user?.user_metadata?.plan as string | undefined) ?? 'profesional';
  const habilitado = plan === 'estudio';

  const cargar = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try { setAccesos(await listarInvitaciones(user.id)); }
    catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }, [user, toast]);

  useEffect(() => { void cargar(); }, [cargar]);

  const alcanceLabel = (a: Acceso) => a.obra_id ? (obras.find((o) => o.id === a.obra_id)?.nombre ?? t('Obra eliminada')) : t('Todas mis obras');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const nuevo = await crearInvitacion({
        nombre: form.nombre.trim() || null,
        email: form.email.trim() || null,
        obra_id: form.alcance === TODAS ? null : form.alcance,
      });
      setAccesos((p) => [nuevo, ...p]);
      setCreada(nuevo);
      setForm({ nombre: '', email: '', alcance: TODAS });
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setBusy(false); }
  }

  async function confirmarRevocar() {
    if (!revocar) return;
    try {
      await revocarAcceso(revocar.id);
      setAccesos((p) => p.filter((a) => a.id !== revocar.id));
      toast.ok(t('Acceso revocado'));
    } catch (e) { toast.error((e as Error).message); }
    setRevocar(null);
  }

  async function compartir(a: Acceso) {
    const url = linkInvitacion(a.token);
    const text = t('Te invito a ver mis obras en obrabase:');
    if (navigator.share) { try { await navigator.share({ title: 'obrabase', text, url }); return; } catch { /* cancelado */ } }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, '_blank', 'noopener');
  }

  if (!habilitado) {
    return (
      <div>
        <PageHeader title={t('Equipo del estudio')} subtitle={t('Conectá a los administrativos del estudio con tus obras')} icon={Users} tone="lilac" />
        <Card className="mx-auto max-w-xl p-8 text-center" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-lilac-bg text-lilac"><Lock size={24} /></div>
          <h2 className="text-lg font-bold">{t('Incluido en el plan Estudio')}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            {t('Invitá a los administrativos del estudio para que vean el resumen de tus obras y gestionen los pedidos que enviás, sin llamarte.')}
          </p>
          <Button className="mt-6" icon={Gem} onClick={async () => {
            try { await setPlan('estudio'); toast.ok(t('Plan {plan} seleccionado para tu prueba', { plan: t('Estudio') })); }
            catch (e) { toast.error((e as Error).message); }
          }}>{t('Probar el plan Estudio')}</Button>
          <p className="mt-3 text-xs text-muted">{t('Durante la prueba gratuita podés cambiar de plan cuando quieras.')}</p>
        </Card>
      </div>
    );
  }

  const pendientes = accesos.filter((a) => a.estado === 'pendiente');
  const activos = accesos.filter((a) => a.estado === 'activo');

  return (
    <div>
      <PageHeader title={t('Equipo del estudio')} subtitle={t('Conectá a los administrativos del estudio con tus obras')} icon={Users} tone="lilac" />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,380px)_1fr]">
        {/* Nueva invitación */}
        <Card className="h-fit p-5 sm:p-6">
          <h2 className="mb-1 flex items-center gap-2 font-bold"><Link2 size={18} className="text-lilac" /> {t('Invitar administrativo')}</h2>
          <p className="mb-5 text-sm text-muted">{t('Generá un link y compartilo. Quien lo abra podrá ver el resumen y los pedidos de las obras elegidas, y cambiar el estado de los pedidos.')}</p>
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label={t('Nombre (opcional)')}>
              <input className="field" placeholder={t('Ej. Laura — Compras')} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </Field>
            <Field label={t('Email (opcional)')}>
              <input className="field" type="email" placeholder="laura@estudio.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label={t('Obras que puede ver')}>
              <Select value={form.alcance} ariaLabel={t('Obras que puede ver')} onChange={(v) => setForm({ ...form, alcance: v })}
                options={[
                  { value: TODAS, label: t('Todas mis obras'), hint: t('Incluye las que crees después') },
                  ...obras.map((o) => ({ value: o.id, label: o.nombre, hint: o.direccion ?? undefined })),
                ]} />
            </Field>
            <Button type="submit" icon={Send} disabled={busy} className="w-full">{busy ? t('Generando…') : t('Generar link de invitación')}</Button>
          </form>
        </Card>

        {/* Listado */}
        <div className="space-y-5">
          {loading ? <Card className="p-10 text-center text-sm text-muted">{t('Cargando…')}</Card>
            : accesos.length === 0 ? (
              <EmptyState icon={Users} title={t('Todavía no invitaste a nadie')} text={t('Las invitaciones que generes van a aparecer acá, con su estado.')} />
            ) : (
              <>
                {activos.length > 0 && (
                  <section>
                    <h3 className="label mb-2 flex items-center gap-1.5"><UserCheck size={13} /> {t('Conectados')} ({activos.length})</h3>
                    <div className="space-y-2">
                      <AnimatePresence initial={false}>
                        {activos.map((a) => (
                          <motion.div key={a.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 20 }}>
                            <Card className="flex items-center gap-3 p-4">
                              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sage-bg font-bold uppercase text-sage">{(a.nombre ?? a.email ?? '?')[0]}</div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold">{a.nombre ?? a.email}</p>
                                <p className="truncate text-xs text-muted">{a.email && a.nombre ? `${a.email} · ` : ''}{alcanceLabel(a)} · {t('desde {f}', { f: fmtDate(a.accepted_at) })}</p>
                              </div>
                              <Badge tone="sage">{t('Activo')}</Badge>
                              <IconButton icon={Trash2} label={t('Revocar acceso')} onClick={() => setRevocar(a)} />
                            </Card>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </section>
                )}
                {pendientes.length > 0 && (
                  <section>
                    <h3 className="label mb-2 flex items-center gap-1.5"><Clock size={13} /> {t('Invitaciones pendientes')} ({pendientes.length})</h3>
                    <div className="space-y-2">
                      <AnimatePresence initial={false}>
                        {pendientes.map((a) => (
                          <motion.div key={a.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 20 }}>
                            <Card className="flex flex-wrap items-center gap-3 p-4">
                              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-peach-bg text-peach"><Link2 size={17} /></div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold">{a.nombre ?? a.email ?? t('Invitación sin nombre')}</p>
                                <p className="truncate text-xs text-muted">{alcanceLabel(a)} · {t('creada el {f}', { f: fmtDate(a.created_at) })}</p>
                              </div>
                              <div className="flex w-full items-center gap-1 sm:w-auto">
                                <Badge tone="peach">{t('Pendiente')}</Badge>
                                <div className="flex-1 sm:hidden" />
                                <IconButton icon={Share2} label={t('Compartir')} onClick={() => compartir(a)} />
                                <IconButton icon={Copy} label={t('Copiar link')} onClick={async () => {
                                  try { await navigator.clipboard.writeText(linkInvitacion(a.token)); toast.ok(t('Link copiado')); } catch { /* sin permiso */ }
                                }} />
                                <IconButton icon={Trash2} label={t('Revocar acceso')} onClick={() => setRevocar(a)} />
                              </div>
                            </Card>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </section>
                )}
              </>
            )}
        </div>
      </div>

      {/* Link generado */}
      <Modal open={!!creada} onClose={() => setCreada(null)} title={t('Invitación lista')}>
        {creada && (
          <div className="space-y-4">
            <p className="text-sm text-muted">{t('Compartí este link con el administrativo. Al abrirlo e ingresar con su cuenta, queda conectado a {x}.', { x: alcanceLabel(creada).toLowerCase() })}</p>
            <div className="break-all rounded-xl border border-dashed border-line bg-slate-50 p-3 font-mono text-xs">{linkInvitacion(creada.token)}</div>
            <div className="flex flex-wrap gap-2">
              <CopyButton text={linkInvitacion(creada.token)} />
              <Button type="button" icon={Share2} onClick={() => compartir(creada)}>{t('Compartir')}</Button>
            </div>
            <p className="text-xs text-muted">{t('Cualquiera con el link puede aceptar la invitación una sola vez. Podés revocarla cuando quieras.')}</p>
          </div>
        )}
      </Modal>

      {/* Confirmar revocar */}
      <Modal open={!!revocar} onClose={() => setRevocar(null)} title={t('Revocar acceso')}>
        {revocar && (
          <div className="space-y-5">
            <p className="text-sm">
              {revocar.estado === 'activo'
                ? t('{x} dejará de ver tus obras y pedidos.', { x: revocar.nombre ?? revocar.email ?? t('Esta persona') })
                : t('El link de invitación dejará de funcionar.')}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRevocar(null)}>{t('Cancelar')}</Button>
              <Button variant="danger" icon={Trash2} onClick={confirmarRevocar}>{t('Revocar')}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
