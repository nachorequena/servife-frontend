import { PantallaPendiente } from '../../components';

/** Estado, fecha y dirección de una solicitud. */
export function DetalleSolicitudScreen() {
  return <PantallaPendiente titulo="Detalle de la solicitud" respaldo="D10" endpoints={['C3']} sinDisenio />;
}
