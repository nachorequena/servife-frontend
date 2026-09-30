import { PantallaPendiente } from '../../components';

/** Publica un trabajo; puede vincularlo a una solicitud finalizada. */
export function NuevoTrabajoScreen() {
  return <PantallaPendiente titulo="Nuevo trabajo" respaldo="CU10 · D07" endpoints={['D4', 'D7']} />;
}
