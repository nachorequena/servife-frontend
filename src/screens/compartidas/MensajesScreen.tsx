import { PantallaPendiente } from '../../components';

/** Bandeja de consultas y chats de solicitudes. No inicia conversaciones. La usan cliente y prestador. */
export function MensajesScreen() {
  return <PantallaPendiente titulo="Mensajes" respaldo="D04" endpoints={['E12']} />;
}
