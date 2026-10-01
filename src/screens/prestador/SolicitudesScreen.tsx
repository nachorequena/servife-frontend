import { PantallaPendiente } from '../../components';

/** Solicitudes recibidas: aceptar, rechazar, finalizar. */
export function SolicitudesScreen() {
  return <PantallaPendiente titulo="Solicitudes" respaldo="CU09" endpoints={['C2', 'C4']} />;
}
