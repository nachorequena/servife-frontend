import { PantallaPendiente } from '../../components';

/** Filtros de búsqueda: cercanía, tipo de servicio, valoración y disponibilidad. Sin rango de precio (D02). */
export function FiltrosScreen() {
  return <PantallaPendiente titulo="Filtros" respaldo="CU04" endpoints={['B1', 'B5']} />;
}
