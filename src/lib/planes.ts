import type { Tone } from '../components/ui';

/**
 * Planes comerciales (todavía NO se cobran ni limitan funciones).
 * La prueba gratuita se calcula desde la fecha de alta del usuario.
 */
export const TRIAL_DAYS = 7;

export interface Plan {
  id: 'inicial' | 'profesional' | 'estudio';
  nombre: string;
  descripcion: string;
  mensual: number; // USD por mes
  tone: Tone;
  destacado?: boolean;
  features: string[];
}

export const PLANES: Plan[] = [
  {
    id: 'inicial', nombre: 'Inicial', tone: 'sky', mensual: 12,
    descripcion: 'Para un jefe de obra con una obra en marcha.',
    features: ['1 obra activa', 'Tablero de tareas y pedidos', 'Caja chica y jornales', 'Cálculos de obra', 'Soporte por email'],
  },
  {
    id: 'profesional', nombre: 'Profesional', tone: 'lilac', mensual: 29, destacado: true,
    descripcion: 'Para quien lleva varias obras a la vez.',
    features: ['Hasta 5 obras activas', 'Todo lo del plan Inicial', 'Adicionales, minutas y manifiesto', 'Fletes, volquetes y seguros con alertas', 'Exportar e imprimir actas'],
  },
  {
    id: 'estudio', nombre: 'Estudio', tone: 'sage', mensual: 59,
    descripcion: 'Para estudios con varios jefes de obra.',
    features: ['Obras ilimitadas', 'Todo lo del plan Profesional', 'EPP y herramientas', 'Reportes para dirección de obra', 'Soporte prioritario'],
  },
];

/** 2 meses gratis pagando anual. */
export const ANUAL_DESCUENTO = 2 / 12;
export const precio = (p: Plan, anual: boolean) => (anual ? Math.round(p.mensual * (1 - ANUAL_DESCUENTO)) : p.mensual);

/** Días restantes de prueba a partir de la fecha de alta (ISO). */
export function diasDePrueba(createdAt?: string | null) {
  if (!createdAt) return TRIAL_DAYS;
  const fin = new Date(createdAt).getTime() + TRIAL_DAYS * 86400000;
  return Math.max(0, Math.ceil((fin - Date.now()) / 86400000));
}
