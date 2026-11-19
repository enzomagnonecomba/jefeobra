export const TAREA_ESTADOS = ['por_comenzar', 'en_curso', 'en_pausa', 'finalizada'] as const;
export type TareaEstado = (typeof TAREA_ESTADOS)[number];

export const ESTADO_LABEL: Record<TareaEstado, string> = {
  por_comenzar: 'Por comenzar',
  en_curso: 'En curso',
  en_pausa: 'En pausa',
  finalizada: 'Finalizada',
};

export type Prioridad = 'baja' | 'media' | 'alta' | 'critica';

export interface Obra {
  id: string;
  nombre: string;
  direccion: string | null;
  estado: 'activa' | 'pausada' | 'finalizada';
}

export interface Tarea {
  id: string;
  obra_id: string;
  titulo: string;
  descripcion: string | null;
  frente: string | null;
  prioridad: Prioridad;
  responsable: string | null;
  fecha_estimada: string | null;
  estado: TareaEstado;
  updated_at: string;
}

export type NuevaTarea = Omit<Tarea, 'id' | 'updated_at'>;
