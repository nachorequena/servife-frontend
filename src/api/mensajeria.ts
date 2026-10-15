import { pedir } from './cliente';

/**
 * Mensajería (porción 4): bandeja y chat. Una función por endpoint de servife-ia/.ai/05-api-contract.md;
 * los tres responden 501 hasta que se implementen (bloqueados por D03). Consulta previa (D03): endpoints sin
 * definir, no se agregan hasta que el equipo los cierre.
 *
 * Transporte del chat detrás de una interfaz (D08): las pantallas solo conocen suscribir y
 * enviar, así cambiar polling por otra cosa no toca ninguna pantalla.
 * La implementación por polling (listarMensajes cada 8 s, solo con la pantalla abierta) va acá.
 * WebSockets no, sin pedido explícito.
 */

/** E12 · GET /conversaciones · D04. Bandeja Mensajes. */
export const listarConversaciones = () => pedir('/conversaciones');

/** E1 · GET /chats/{uuid}/mensajes?desde= · CU07. Polling cada 8 s. */
export const listarMensajes = (uuidChat: string, desde?: string) =>
  pedir(`/chats/${uuidChat}/mensajes`, { consulta: { desde } });

/** E2 · POST /chats/{uuid}/mensajes · CU07. */
export const enviarMensaje = (uuidChat: string, cuerpo: unknown) =>
  pedir(`/chats/${uuidChat}/mensajes`, { metodo: 'POST', cuerpo });

export const INTERVALO_DE_POLLING_MS = 8000;

export interface CanalDeMensajes {
  /** Empieza a recibir mensajes nuevos del chat. Devuelve la función para dejar de escuchar. */
  suscribir(uuidChat: string, alRecibir: (mensajes: unknown[]) => void): () => void;
  enviar(uuidChat: string, cuerpo: unknown): Promise<unknown>;
}
