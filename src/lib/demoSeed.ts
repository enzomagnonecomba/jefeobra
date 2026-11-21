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

// ---------- Panel del estudio (demo) ----------
// Obra de otro jefe de obra compartida con el usuario demo como administrativo.
const J = 'jefe-demo';
const O3 = 'demo-obra-3';
const sh = (i: number, days = -i) => ({ id: `demo-sh-${i}`, user_id: J, obra_id: O3, created_at: ts(days) });
const push = (table: string, ...rows: unknown[]) => { (demoSeed[table] ??= []).push(...rows); };

push('obras', { id: O3, user_id: J, nombre: 'Torre Palermo', direccion: 'Gorriti 4520', estado: 'activa', presupuesto_caja: 800000, created_at: ts(-40) });
push('profiles', { id: J, nombre: 'Martín Ruiz', estudio: 'Ruiz & Asociados' });
push('obra_accesos', {
  id: 'demo-acc-1', owner_id: J, obra_id: null, member_id: 'demo-user', rol: 'compras', nombre: 'Demo', email: 'demo@obra.local',
  token: 'demo-token-compartido', estado: 'activo', created_at: ts(-3), accepted_at: ts(-3),
});
push('pedidos',
  { ...sh(1), titulo: 'Hierro para losa nivel 4', proveedor: 'Acindar', prioridad: 'critica', fecha_requerida: d(1), notas: 'Descargar por Gorriti', estado: 'pendiente',
    items: [{ descripcion: 'Hierro ADN 420 Ø12', cantidad: 180, unidad: 'barra' }, { descripcion: 'Alambre de atar', cantidad: 20, unidad: 'kg' }] },
  { ...sh(2), titulo: 'Cerámicos baños piso 2', proveedor: 'Cerámica San Lorenzo', prioridad: 'media', fecha_requerida: d(6), notas: null, estado: 'pendiente',
    items: [{ descripcion: 'Porcellanato 60x60 gris', cantidad: 96, unidad: 'm²' }] },
  { ...sh(3), titulo: 'Bolsas de cemento', proveedor: 'Corralón Palermo', prioridad: 'alta', fecha_requerida: d(-1), notas: null, estado: 'en_camino',
    items: [{ descripcion: 'Cemento portland', cantidad: 60, unidad: 'bolsa' }] },
);
push('tareas',
  { ...sh(4), titulo: 'Encofrado losa nivel 4', descripcion: null, prioridad: 'alta', fecha_limite: d(2), etiquetas: ['Estructura'], estado: 'en_curso', orden: 1 },
  { ...sh(5), titulo: 'Mampostería piso 3', descripcion: null, prioridad: 'media', fecha_limite: d(9), etiquetas: ['Albañilería'], estado: 'terminada', orden: 1 },
  { ...sh(6), titulo: 'Cañerías pluviales', descripcion: null, prioridad: 'media', fecha_limite: d(12), etiquetas: ['Sanitaria'], estado: 'por_comenzar', orden: 1 },
);
push('caja_movimientos',
  { ...sh(7), fecha: d(-6), tipo: 'egreso', categoria: 'ferreteria', concepto: 'Discos y mechas', monto: 42000 },
  { ...sh(8), fecha: d(-2), tipo: 'egreso', categoria: 'viaticos', concepto: 'Combustible', monto: 28000 },
);
push('fletes',
  { ...sh(10), fecha: d(2), origen: 'Acindar Villa Constitución', destino: 'Torre Palermo', carga: 'Hierro ADN 420', transportista: 'Transportes Sur', costo: 120000, estado: 'programado' },
  { ...sh(11), fecha: d(-3), origen: 'Corralón Palermo', destino: 'Torre Palermo', carga: 'Cemento y cal', transportista: 'Fletes Rápidos', costo: 38000, estado: 'realizado' },
);
push('volquetes', { ...sh(12), empresa: 'Volquetes Norte', numero: 'VN-88', fecha_entrega: d(-4), fecha_retiro: d(1), costo: 42000, estado: 'en_obra' });
push('seguros', { ...sh(9), tipo: 'art', aseguradora: 'Galeno ART', poliza: 'GA-90210', vigencia_desde: d(-355), vigencia_hasta: d(8), suma_asegurada: 0 });
