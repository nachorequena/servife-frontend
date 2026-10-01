/**
 * Transporte del chat detrás de una interfaz (D08): las pantallas solo conocen suscribir y
 * enviar, así cambiar polling por otra cosa no toca ninguna pantalla.
 * La implementación por polling (listarMensajes cada 8 s, solo con la pantalla abierta) es del
 * módulo E. WebSockets no, sin pedido explícito.
 */

export const INTERVALO_DE_POLLING_MS = 8000;

export interface CanalDeMensajes {
  /** Empieza a recibir mensajes nuevos del chat. Devuelve la función para dejar de escuchar. */
  suscribir(uuidChat: string, alRecibir: (mensajes: unknown[]) => void): () => void;
  enviar(uuidChat: string, cuerpo: unknown): Promise<unknown>;
}
