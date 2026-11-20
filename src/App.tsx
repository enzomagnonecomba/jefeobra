import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import RequireAuth from './components/RequireAuth';
import Landing from './pages/Landing';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import { Logo } from './components/Logo';

// El dashboard se carga bajo demanda: la landing queda liviana.
const Layout = lazy(() => import('./components/Layout'));
const Seguimiento = lazy(() => import('./pages/app/Seguimiento'));
const Minutas = lazy(() => import('./pages/app/Minutas'));
const Resumen = lazy(() => import('./pages/app/Resumen'));
const Obras = lazy(() => import('./pages/app/Obras'));
const Planes = lazy(() => import('./pages/app/Planes'));
const NuevoPedido = lazy(() => import('./pages/app/Pedidos').then((m) => ({ default: m.NuevoPedido })));
const MisPedidos = lazy(() => import('./pages/app/Pedidos').then((m) => ({ default: m.MisPedidos })));
const Calculos = lazy(() => import('./pages/app/Pedidos').then((m) => ({ default: m.Calculos })));
const CrudPage = lazy(() => import('./pages/app/CrudPage'));

const Loading = () => <div className="grid min-h-[50vh] place-items-center"><div className="animate-pulse"><Logo compact /></div></div>;

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route path="/app" element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<Navigate to="obra/resumen" replace />} />
          <Route path="obras" element={<Obras />} />
          <Route path="planes" element={<Planes />} />
          <Route path="seguimiento" element={<Seguimiento />} />

          <Route path="pedidos/nuevo" element={<NuevoPedido />} />
          <Route path="pedidos/mis-pedidos" element={<MisPedidos />} />
          <Route path="pedidos/calculos" element={<Calculos />} />

          <Route path="obra/resumen" element={<Resumen />} />
          <Route path="obra/minutas" element={<Minutas />} />

          {/* Módulos CRUD configurables: caja-chica, jornales, adicionales, manifiesto,
              fletes, volquetes, seguros, epp, herramientas */}
          <Route path=":seccion/:modulo" element={<CrudPage />} />

          <Route path="*" element={<Navigate to="/app" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
