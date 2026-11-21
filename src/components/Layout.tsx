import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { NavLink, useLocation, useOutlet, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  KanbanSquare, PackagePlus, ClipboardList, Calculator, Wallet, HardHat, FilePlus2, FolderInput, NotebookPen,
  LayoutDashboard, Truck, Container, ShieldCheck, Shirt, Wrench, Building2, PanelLeftClose, PanelLeftOpen,
  Menu, X, Gem, type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useObra } from '../context/ObraContext';
import { hasSupabase } from '../lib/supabase';
import { Logo } from './Logo';
import { Button, Card, Field } from './ui';
import { useToast } from './Toast';
import { ThemeToggle } from './ThemeToggle';
import { LangSwitcher } from './LangSwitcher';
import { diasDePrueba } from '../lib/planes';
import { t } from '../i18n';
import { Select } from './Select';
import { UserMenu } from './UserMenu';

interface NavItem { to: string; label: string; icon: LucideIcon }
export const NAV: { title: string; items: NavItem[] }[] = [
  { title: 'Seguimiento', items: [{ to: '/app/seguimiento', label: 'Tablero de tareas', icon: KanbanSquare }] },
  { title: 'Pedidos', items: [
    { to: '/app/pedidos/nuevo', label: 'Nuevo pedido', icon: PackagePlus },
    { to: '/app/pedidos/mis-pedidos', label: 'Mis pedidos', icon: ClipboardList },
    { to: '/app/pedidos/calculos', label: 'Cálculos', icon: Calculator },
  ] },
  { title: 'Obra', items: [
    { to: '/app/obra/resumen', label: 'Resumen obra', icon: LayoutDashboard },
    { to: '/app/obra/caja-chica', label: 'Caja chica', icon: Wallet },
    { to: '/app/obra/jornales', label: 'Jornales', icon: HardHat },
    { to: '/app/obra/adicionales', label: 'Adicionales', icon: FilePlus2 },
    { to: '/app/obra/manifiesto', label: 'Manifiesto', icon: FolderInput },
    { to: '/app/obra/minutas', label: 'Minutas', icon: NotebookPen },
  ] },
  { title: 'Servicios', items: [
    { to: '/app/servicios/fletes', label: 'Fletes', icon: Truck },
    { to: '/app/servicios/volquetes', label: 'Volquetes', icon: Container },
    { to: '/app/servicios/seguros', label: 'Seguros', icon: ShieldCheck },
  ] },
  { title: 'Recursos', items: [
    { to: '/app/recursos/epp', label: 'EPP / Ropa', icon: Shirt },
    { to: '/app/recursos/herramientas', label: 'Herramientas', icon: Wrench },
  ] },
];

const readCollapsed = () => { try { return localStorage.getItem('obrabase:sidebar') === '1'; } catch { return false; } };

function Sidebar({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    <nav className="thin-scroll flex-1 space-y-5 overflow-y-auto px-3 pb-6">
      {NAV.map((sec) => (
        <div key={sec.title}>
          {collapsed ? <div className="mx-auto mb-2 h-px w-6 bg-line" /> : (
            <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{t(sec.title)}</p>
          )}
          <div className="space-y-0.5">
            {sec.items.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} onClick={onNavigate} title={collapsed ? t(label) : undefined}
                className={({ isActive }) => `relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  collapsed ? 'justify-center' : ''} ${isActive ? 'text-ink' : 'text-slate-500 hover:bg-slate-100/70 hover:text-ink'}`}>
                {({ isActive }) => (
                  <>
                    {isActive && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-xl bg-white shadow-soft ring-1 ring-line" transition={{ type: 'spring', damping: 30, stiffness: 380 }} />}
                    <Icon size={18} className="relative shrink-0" strokeWidth={isActive ? 2.3 : 1.9} />
                    {!collapsed && <span className="relative truncate">{t(label)}</span>}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function ObraSelector() {
  const { obras, obraActiva, seleccionar } = useObra();
  return (
    <Select value={obraActiva?.id ?? ''} onChange={seleccionar} ariaLabel={t('Obra activa')} menuMinWidth={240}
      icon={<Building2 size={16} className="shrink-0 text-sage" />}
      className="min-w-0 flex-1 !py-2 font-semibold shadow-soft sm:!w-auto sm:max-w-xs sm:flex-none"
      options={obras.map((o) => ({ value: o.id, label: o.nombre, hint: o.direccion ?? undefined }))} />
  );
}

function PrimeraObra() {
  const { crearObra } = useObra();
  const toast = useToast();
  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await crearObra({ nombre, direccion: direccion || null, presupuesto_caja: 0 });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };
  return (
    <Card className="mx-auto mt-10 max-w-md p-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-sage-bg text-sage"><Building2 size={22} /></div>
      <h2 className="text-xl font-bold">{t("Creá tu primera obra")}</h2>
      <p className="mb-6 text-sm text-muted">{t("Todo lo que cargues (tareas, pedidos, caja chica…) queda organizado por obra.")}</p>
      <form onSubmit={submit} className="space-y-4">
        <Field label={t("Nombre de la obra *")}><input className="field" required autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder={t("Ej. Edificio Belgrano")} /></Field>
        <Field label={t("Dirección")}><input className="field" value={direccion} onChange={(e) => setDireccion(e.target.value)} /></Field>
        <Button type="submit" className="w-full">{t("Crear obra")}</Button>
      </form>
    </Card>
  );
}

export default function Layout() {
  const { user } = useAuth();
  const { obras, loading } = useObra();
  const location = useLocation();
  const outlet = useOutlet();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { try { localStorage.setItem('obrabase:sidebar', collapsed ? '1' : '0'); } catch { /* noop */ } }, [collapsed]);
  useEffect(() => setMobileOpen(false), [location.pathname]);

  const needsObra = !loading && obras.length === 0 && location.pathname !== '/app/obras';
  const trial = diasDePrueba(user?.created_at);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar desktop */}
      <motion.aside animate={{ width: collapsed ? 76 : 264 }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-bone lg:flex">
        <div className={`flex h-16 items-center px-5 ${collapsed ? 'justify-center px-0' : 'justify-between'}`}>
          <Link to="/app/obra/resumen"><Logo compact={collapsed} /></Link>
        </div>
        <Sidebar collapsed={collapsed} />
        <div className="border-t border-line p-3">
          <NavLink to="/app/planes" title={t("Planes")} className={({ isActive }) => `mb-1 flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium ${collapsed ? 'justify-center' : ''} ${isActive ? 'bg-white text-ink shadow-soft' : 'text-slate-500 hover:bg-slate-100/70'}`}>
            <Gem size={18} />{!collapsed && t('Planes')}
          </NavLink>
          <NavLink to="/app/obras" title={t("Mis obras")} className={({ isActive }) => `mb-1 flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium ${collapsed ? 'justify-center' : ''} ${isActive ? 'bg-white text-ink shadow-soft' : 'text-slate-500 hover:bg-slate-100/70'}`}>
            <Building2 size={18} />{!collapsed && t('Mis obras')}
          </NavLink>
          <button onClick={() => setCollapsed(!collapsed)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100/70 ${collapsed ? 'justify-center' : ''}`}>
            {collapsed ? <PanelLeftOpen size={18} /> : <><PanelLeftClose size={18} /> {t("Contraer menú")}</>}
          </button>
        </div>
      </motion.aside>

      {/* Sidebar mobile */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />
            <motion.aside className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-bone shadow-lift lg:hidden"
              initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}>
              <div className="flex h-16 items-center justify-between px-5">
                <Logo />
                <button aria-label={t("Cerrar menú")} onClick={() => setMobileOpen(false)} className="rounded-lg p-1.5 hover:bg-slate-100"><X size={20} /></button>
              </div>
              <Sidebar collapsed={false} onNavigate={() => setMobileOpen(false)} />
              <div className="border-t border-line p-3">
                <NavLink to="/app/planes" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-600"><Gem size={18} /> {t("Planes")}</NavLink>
                <NavLink to="/app/obras" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-600"><Building2 size={18} /> {t("Mis obras")}</NavLink>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line bg-bone/85 px-3 backdrop-blur-md sm:gap-3 sm:px-6">
          <button aria-label={t("Abrir menú")} onClick={() => setMobileOpen(true)} className="shrink-0 rounded-lg p-1.5 hover:bg-slate-100 lg:hidden"><Menu size={20} /></button>
          {obras.length > 0 && <ObraSelector />}
          <div className="hidden flex-1 sm:block" />
          {!hasSupabase && <span className="hidden whitespace-nowrap rounded-full bg-peach-bg px-3 py-1 text-xs font-semibold text-peach xl:inline">{t("Modo demo · datos locales")}</span>}
          <Link to="/app/planes" className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-lilac-bg px-3 py-1 text-xs font-semibold text-lilac transition hover:brightness-95 lg:inline-flex">
            <Gem size={13} /> {trial > 0 ? t(trial === 1 ? 'Prueba gratis · {n} día' : 'Prueba gratis · {n} días', { n: trial }) : t('Prueba finalizada')}
          </Link>
          <LangSwitcher />
          <div className="hidden sm:block"><ThemeToggle /></div>
          <UserMenu />
        </header>

        <main className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-4 pb-10 pt-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          {needsObra ? <PrimeraObra /> : (
            <AnimatePresence mode="wait">
              <motion.div key={location.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
                <Suspense fallback={<Card className="p-10 text-center text-sm text-muted">{t("Cargando…")}</Card>}>{outlet}</Suspense>
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>
    </div>
  );
}
