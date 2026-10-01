import { PantallaPendiente } from '../../components';

/** Fecha y hora propuestas, dirección, descripción e imágenes. Sin botón de chat (D03). */
export function FormularioSolicitudScreen() {
  return <PantallaPendiente titulo="Solicitar servicio" respaldo="CU06 · D03, D09" endpoints={['C1', 'D7']} />;
}
