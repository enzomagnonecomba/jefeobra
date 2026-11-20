import { Navigate, useParams } from 'react-router-dom';
import CrudModule from '../../components/CrudModule';
import {
  adicionalesConfig, cajaConfig, eppConfig, fletesConfig, herramientasConfig, jornalesConfig, manifiestoConfig, segurosConfig, volquetesConfig,
} from './modules';

const CONFIGS = {
  'obra/caja-chica': cajaConfig,
  'obra/jornales': jornalesConfig,
  'obra/adicionales': adicionalesConfig,
  'obra/manifiesto': manifiestoConfig,
  'servicios/fletes': fletesConfig,
  'servicios/volquetes': volquetesConfig,
  'servicios/seguros': segurosConfig,
  'recursos/epp': eppConfig,
  'recursos/herramientas': herramientasConfig,
} as const;

export default function CrudPage() {
  const { seccion, modulo } = useParams();
  const config = CONFIGS[`${seccion}/${modulo}` as keyof typeof CONFIGS];
  if (!config) return <Navigate to="/app" replace />;
  return <CrudModule key={config.table} config={config} />;
}
