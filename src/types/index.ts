// ---------- Base ----------
export interface Row {
  id: string;
  user_id?: string;
  obra_id: string;
  created_at?: string;
  updated_at?: string;
}

export type Prioridad = 'baja' | 'media' | 'alta' | 'critica';
export const PRIORIDADES: Prioridad[] = ['critica', 'alta', 'media', 'baja'];

export interface Obra {
  id: string;
  user_id?: string;
  nombre: string;
  direccion: string | null;
  estado: 'activa' | 'pausada' | 'finalizada';
  presupuesto_caja: number;
  created_at?: string;
}

// ---------- Seguimiento ----------
export const TAREA_ESTADOS = ['por_comenzar', 'en_curso', 'en_pausa', 'terminada'] as const;
export type TareaEstado = (typeof TAREA_ESTADOS)[number];

export interface Tarea extends Row {
  titulo: string;
  descripcion: string | null;
  prioridad: Prioridad;
  fecha_limite: string | null;
  etiquetas: string[];
  estado: TareaEstado;
  orden: number;
}

// ---------- Pedidos ----------
export const PEDIDO_ESTADOS = ['pendiente', 'aprobado', 'en_camino', 'entregado'] as const;
export type PedidoEstado = (typeof PEDIDO_ESTADOS)[number];

export interface PedidoItem {
  descripcion: string;
  cantidad: number;
  unidad: string;
}

export interface Pedido extends Row {
  titulo: string;
  proveedor: string | null;
  prioridad: Prioridad;
  fecha_requerida: string | null;
  notas: string | null;
  items: PedidoItem[];
  estado: PedidoEstado;
}

// ---------- Obra ----------
export interface CajaMovimiento extends Row {
  fecha: string;
  tipo: 'ingreso' | 'egreso';
  categoria: string;
  concepto: string;
  monto: number;
}

export interface Acuerdo {
  texto: string;
  responsable: string;
  fecha: string;
}

export interface Minuta extends Row {
  fecha: string;
  titulo: string;
  asistentes: string[];
  temas: string | null;
  acuerdos: Acuerdo[];
}

/** Tablas que dependen de una obra. Debe coincidir con supabase/schema.sql */
export type TableName =
  | 'tareas'
  | 'pedidos'
  | 'caja_movimientos'
  | 'jornales'
  | 'adicionales'
  | 'manifiestos'
  | 'minutas'
  | 'fletes'
  | 'volquetes'
  | 'seguros'
  | 'epp_entregas'
  | 'herramientas';
