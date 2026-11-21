import type { User } from '@supabase/supabase-js';
import { HardHat, ClipboardCheck, ShoppingCart, type LucideIcon } from 'lucide-react';
import { t } from '../i18n';
import type { Tone } from '../components/ui';

/**
 * Roles de usuario (se eligen al registrarse):
 * - jefe_obra: usa toda la app con sus obras.
 * - compras: invitado por un jefe; aprueba/rechaza pedidos y gestiona el estado de fletes y volquetes.
 * - direccion_obra: invitado por un jefe; solo ve el resumen de tareas.
 * Los permisos reales los aplica RLS (supabase/migrations/003_roles.sql).
 */
export type Rol = 'jefe_obra' | 'direccion_obra' | 'compras';

export const ROLES: { id: Rol; icon: LucideIcon; tone: Tone; readonly label: string; readonly descripcion: string }[] = [
  { id: 'jefe_obra', icon: HardHat, tone: 'sky',
    get label() { return t('Jefe de obra'); },
    get descripcion() { return t('Gestiono la obra: tareas, pedidos, caja chica y servicios.'); } },
  { id: 'direccion_obra', icon: ClipboardCheck, tone: 'lilac',
    get label() { return t('Dirección de obra'); },
    get descripcion() { return t('Sigo el avance de las tareas de las obras del estudio.'); } },
  { id: 'compras', icon: ShoppingCart, tone: 'peach',
    get label() { return t('Compras'); },
    get descripcion() { return t('Apruebo o rechazo pedidos y gestiono fletes y volquetes.'); } },
];

export const rolLabel = (r: Rol) => ROLES.find((x) => x.id === r)?.label ?? r;

export const rolDe = (user: User | null | undefined): Rol => {
  const r = user?.user_metadata?.rol;
  return r === 'compras' || r === 'direccion_obra' ? r : 'jefe_obra';
};

export type PlanId = 'inicial' | 'profesional' | 'estudio';
export const planDe = (user: User | null | undefined): PlanId => {
  const p = user?.user_metadata?.plan;
  return p === 'inicial' || p === 'estudio' ? p : 'profesional';
};
