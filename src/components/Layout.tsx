import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useObra } from '../context/ObraContext';

const NAV = [
  ['/', 'Resumen'],
  ['/tareas', 'Tareas'],
  ['/pedidos', 'Pedidos'],
  ['/obra', 'Obra'],
  ['/servicios', 'Servicios'],
  ['/recursos', 'Recursos'],
] as const;

export default function Layout() {
  const { signOut } = useAuth();
  const { obras, obraActiva, seleccionar } = useObra();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 bg-slate-900 px-4 py-3">
        <span className="text-lg font-bold text-amber-400">Jefe de Obra</span>
        <select
          aria-label="Obra activa"
          value={obraActiva?.id ?? ''}
          onChange={(e) => seleccionar(e.target.value)}
          className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-base"
        >
          {obras.map((o) => (
            <option key={o.id} value={o.id}>{o.nombre}</option>
          ))}
        </select>
        <button onClick={signOut} className="rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-800">
          Salir
        </button>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-slate-800 bg-slate-900/60 px-2">
        {NAV.map(([to, label]) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium ${
                isActive ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-300 hover:text-white'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      <main className="mx-auto max-w-6xl p-4">
        <Outlet />
      </main>
    </div>
  );
}
