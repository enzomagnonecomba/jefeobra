import type { Obra, Tarea } from '../types';

export const MOCK_OBRAS: Obra[] = [
  { id: 'obra-1', nombre: 'Edificio Río 1820', direccion: 'Av. del Río 1820', estado: 'activa' },
  { id: 'obra-2', nombre: 'Casa Lago Norte', direccion: 'Ruta 9 km 14', estado: 'activa' },
];

export const MOCK_TAREAS: Tarea[] = [
  { id: 't1', obra_id: 'obra-1', titulo: 'Replanteo de muros PB', descripcion: null, frente: 'Albañilería', prioridad: 'alta', responsable: 'Juan P.', fecha_estimada: '2026-11-24', estado: 'en_curso', updated_at: '2026-11-19T10:00:00Z' },
  { id: 't2', obra_id: 'obra-1', titulo: 'Instalación eléctrica piso 1', descripcion: null, frente: 'Electricidad', prioridad: 'critica', responsable: 'Lucas R.', fecha_estimada: '2026-11-28', estado: 'por_comenzar', updated_at: '2026-11-18T09:00:00Z' },
  { id: 't3', obra_id: 'obra-1', titulo: 'Colado de losa', descripcion: null, frente: 'Estructura', prioridad: 'alta', responsable: 'Marta G.', fecha_estimada: '2026-12-02', estado: 'en_pausa', updated_at: '2026-11-17T15:30:00Z' },
  { id: 't4', obra_id: 'obra-2', titulo: 'Impermeabilización techo', descripcion: null, frente: 'Techos', prioridad: 'media', responsable: 'Ana F.', fecha_estimada: '2026-11-21', estado: 'finalizada', updated_at: '2026-11-19T08:00:00Z' },
];
