import { PantallaPendiente } from '../../components';

/** Solicitudes del cliente; desde acá se completa una valoración pospuesta (D07). */
export function HistorialScreen() {
  return <PantallaPendiente titulo="Historial" respaldo="CU06 · CU08" endpoints={['C2', 'C3']} />;
}
