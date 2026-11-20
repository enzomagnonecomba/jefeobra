// Datos de ejemplo SOLO para el modo demo (sin Supabase configurado).
const d = (offsetDays: number) => {
  const t = new Date();
  t.setDate(t.getDate() + offsetDays);
  return t.toISOString().slice(0, 10);
};
const ts = (offsetDays: number) => `${d(offsetDays)}T12:00:00.000Z`;
const O = 'demo-obra-1';
const base = (i: number, days = -i) => ({ id: `demo-${i}-${Math.abs(days)}`, user_id: 'demo-user', obra_id: O, created_at: ts(days) });

export const demoSeed: Record<string, unknown[]> = {
  obras: [
    { id: O, user_id: 'demo-user', nombre: 'Edificio Río 1820', direccion: 'Av. del Río 1820', estado: 'activa', presupuesto_caja: 500000, created_at: ts(-30) },
    { id: 'demo-obra-2', user_id: 'demo-user', nombre: 'Casa Lago Norte', direccion: 'Ruta 9 km 14', estado: 'activa', presupuesto_caja: 200000, created_at: ts(-20) },
  ],
  tareas: [
    { ...base(1), titulo: 'Replanteo de muros PB', descripcion: null, prioridad: 'alta', fecha_limite: d(3), etiquetas: ['Albañilería'], estado: 'en_curso', orden: 1 },
    { ...base(2), titulo: 'Instalación eléctrica piso 1', descripcion: null, prioridad: 'critica', fecha_limite: d(7), etiquetas: ['Electricidad'], estado: 'por_comenzar', orden: 1 },
    { ...base(3), titulo: 'Hormigonado losa nivel +3.00', descripcion: 'Esperando aprobación de armaduras', prioridad: 'alta', fecha_limite: d(10), etiquetas: ['Estructura'], estado: 'en_pausa', orden: 1 },
    { ...base(4), titulo: 'Impermeabilización terraza', descripcion: null, prioridad: 'media', fecha_limite: d(-2), etiquetas: ['Techos'], estado: 'terminada', orden: 1 },
    { ...base(5), titulo: 'Pedir cotización de aberturas', descripcion: null, prioridad: 'baja', fecha_limite: d(14), etiquetas: ['Carpintería'], estado: 'por_comenzar', orden: 2 },
  ],
  pedidos: [
    { ...base(6), titulo: 'Materiales mampostería PB', proveedor: 'Corralón Norte', prioridad: 'alta', fecha_requerida: d(2), notas: null, estado: 'aprobado',
      items: [{ descripcion: 'Ladrillo hueco 12x18x33', cantidad: 1200, unidad: 'u' }, { descripcion: 'Cemento portland', cantidad: 40, unidad: 'bolsa' }] },
    { ...base(7), titulo: 'Caños termofusión', proveedor: null, prioridad: 'media', fecha_requerida: d(5), notas: 'Diámetros 20 y 25', estado: 'pendiente',
      items: [{ descripcion: 'Caño termofusión 20mm', cantidad: 30, unidad: 'barra' }] },
    { ...base(8), titulo: 'Arena y piedra', proveedor: 'Áridos del Sur', prioridad: 'media', fecha_requerida: d(-1), notas: null, estado: 'entregado',
      items: [{ descripcion: 'Arena gruesa', cantidad: 6, unidad: 'm³' }, { descripcion: 'Piedra partida 6/20', cantidad: 4, unidad: 'm³' }] },
  ],
  caja_movimientos: [
    { ...base(9), fecha: d(-5), tipo: 'ingreso', categoria: 'reposicion', concepto: 'Reposición de caja chica', monto: 150000 },
    { ...base(10), fecha: d(-3), tipo: 'egreso', categoria: 'ferreteria', concepto: 'Tornillos y tarugos', monto: 18500 },
    { ...base(11), fecha: d(-1), tipo: 'egreso', categoria: 'viaticos', concepto: 'Combustible camioneta', monto: 32000 },
  ],
  jornales: [
    { ...base(12), fecha: d(-1), trabajador: 'Juan Pérez', categoria: 'oficial', asistencia: 'presente', horas: 8, tarifa_hora: 4500, observacion: null },
    { ...base(13), fecha: d(-1), trabajador: 'Luis Gómez', categoria: 'ayudante', asistencia: 'media_jornada', horas: 4, tarifa_hora: 3200, observacion: 'Turno médico' },
  ],
  adicionales: [
    { ...base(14), fecha: d(-4), descripcion: 'Refuerzo de viga V12', motivo: 'Cambio de cargas por pedido del comitente', costo_estimado: 380000, estado: 'propuesto' },
  ],
  manifiestos: [
    { ...base(15), fecha: d(-2), movimiento: 'entrada', tipo: 'plano', descripcion: 'Plano estructura rev. C aprobado', referencia: 'EST-04-C', responsable: 'Arq. Silva' },
  ],
  minutas: [
    { ...base(16), fecha: d(-6), titulo: 'Reunión semanal de coordinación', asistentes: ['Arq. Silva', 'Ing. Rossi', 'Capataz Juan'], temas: 'Avance de estructura y entrega de aberturas.',
      acuerdos: [{ texto: 'Enviar plano de aberturas actualizado', responsable: 'Arq. Silva', fecha: d(1) }] },
  ],
  fletes: [
    { ...base(17), fecha: d(2), origen: 'Corralón Norte', destino: 'Obra Río 1820', carga: 'Ladrillos y cemento', transportista: 'Fletes Rápidos', costo: 45000, estado: 'programado' },
  ],
  volquetes: [
    { ...base(18), empresa: 'Volquetes Oeste', numero: 'V-221', fecha_entrega: d(-3), fecha_retiro: d(2), costo: 38000, estado: 'en_obra' },
  ],
  seguros: [
    { ...base(19), tipo: 'art', aseguradora: 'Prevención ART', poliza: 'ART-55120', vigencia_desde: d(-340), vigencia_hasta: d(12), suma_asegurada: 0 },
    { ...base(20), tipo: 'responsabilidad_civil', aseguradora: 'La Segunda', poliza: 'RC-8812', vigencia_desde: d(-60), vigencia_hasta: d(300), suma_asegurada: 50000000 },
  ],
  epp_entregas: [
    { ...base(21), fecha: d(-10), operario: 'Juan Pérez', elemento: 'Casco', talle: null, cantidad: 1, proximo_recambio: d(355) },
  ],
  herramientas: [
    { ...base(22), nombre: 'Amoladora 230mm', categoria: 'Eléctricas', cantidad: 2, asignado_a: 'Juan Pérez', estado: 'operativa' },
  ],
};
