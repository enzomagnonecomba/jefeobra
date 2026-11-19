import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import RequireAuth from './components/RequireAuth';
import EnDesarrollo from './components/EnDesarrollo';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Resumen from './pages/Resumen';
import Tareas from './pages/Tareas';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Resumen />} />
        <Route path="tareas" element={<Tareas />} />
        <Route path="pedidos" element={<EnDesarrollo titulo="Pedidos" detalle="Próxima iteración: formulario de nuevo pedido y listado con estados. Tabla: pedidos." />} />
        <Route path="obra" element={<EnDesarrollo titulo="Obra" detalle="Próxima iteración: caja chica, jornales, adicionales, manifiestos y minutas. Tablas listas en schema.sql." />} />
        <Route path="servicios" element={<EnDesarrollo titulo="Servicios" detalle="Próxima iteración: fletes, volquetes y seguros con alertas de vencimiento." />} />
        <Route path="recursos" element={<EnDesarrollo titulo="Recursos" detalle="Próxima iteración: EPP por operario e inventario de herramientas." />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
