import { PantallaPendiente } from '../../components';

/** Editar o eliminar un trabajo propio. */
export function DetalleTrabajoScreen() {
  return <PantallaPendiente titulo="Detalle del trabajo" respaldo="CU10" endpoints={['D8', 'D5', 'D6']} />;
}
