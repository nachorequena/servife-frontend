import { PantallaPendiente } from '../../components';

/** Chat de una solicitud o de una consulta. Polling cada 8 s con la pantalla abierta (api/mensajeria.ts). */
export function ChatScreen() {
  return <PantallaPendiente titulo="Chat" respaldo="CU07 · D03, D08" endpoints={['E1', 'E2', 'D7']} />;
}
