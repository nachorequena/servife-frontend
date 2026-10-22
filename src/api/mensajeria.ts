import { AppState } from 'react-native';

import { pedir } from './cliente';
import type { Pagina, ParametrosDePagina } from './paginacion';
import type { EstadoSolicitud } from './solicitudes';

/**
 * Mensajería (porción 4): chat de la solicitud y bandeja Mensajes (CU07, D33). Una función por endpoint de
 * servife-ia/.ai/05-api-contract.md. Sin consulta previa: cada solicitud tiene su chat (su uuid viene en C3
 * como uuidChat). Se escribe con la solicitud en PENDIENTE, ACEPTADA o EN_CURSO; después, solo lectura.
 *
 * Transporte del chat detrás de una interfaz (D08): las pantallas solo conocen suscribir y enviar, así
 * cambiar polling por otra cosa no toca ninguna pantalla. WebSockets no, sin pedido explícito.
 */

export const INTERVALO_DE_POLLING_MS = 8000;
export const LARGO_MAXIMO_MENSAJE = 1000;

export interface Contraparte {
  uuid: string;
  nombreApellido: string;
}

export interface Mensaje {
  uuid: string;
  texto: string;
  /** true si lo escribió el usuario de la sesión. */
  propio: boolean;
  creadoEn: string;
}

/** Respuesta de E1: el chat con todos los mensajes, o solo los posteriores a `desde`. */
export interface Chat {
  uuidChat: string;
  uuidSolicitud: string;
  estadoSolicitud: EstadoSolicitud;
  sePuedeEscribir: boolean;
  contraparte: Contraparte;
  mensajes: Mensaje[];
}

/** Fila de E12. */
export interface Conversacion {
  uuidChat: string;
  uuidSolicitud: string;
  estadoSolicitud: EstadoSolicitud;
  tipoServicio: string;
  contraparte: Contraparte;
  ultimoMensaje: { texto: string; creadoEn: string; propio: boolean } | null;
  noLeidos: number;
}

/** E12 · GET /conversaciones · D04. Bandeja Mensajes, la actividad más reciente primero. Paginado. */
export const listarConversaciones = (pagina: ParametrosDePagina = {}) =>
  pedir<Pagina<Conversacion>>('/conversaciones', { consulta: { ...pagina } });

/** E1 · GET /chats/{uuid}/mensajes?desde= · CU07. Marca como leídos los mensajes de la otra parte. */
export const listarMensajes = (uuidChat: string, desde?: string) =>
  pedir<Chat>(`/chats/${uuidChat}/mensajes`, { consulta: { desde } });

/** E2 · POST /chats/{uuid}/mensajes · CU07. 409 CHAT_CERRADO si la solicitud ya no está abierta. */
export const enviarMensaje = (uuidChat: string, texto: string) =>
  pedir<Mensaje>(`/chats/${uuidChat}/mensajes`, { metodo: 'POST', cuerpo: { texto } });

export interface CanalDeMensajes {
  /**
   * Empieza a recibir el chat: primero completo y después solo lo nuevo. Devuelve la función para dejar de
   * escuchar. Un fallo no corta la suscripción: se reintenta en el próximo ciclo.
   */
  suscribir(uuidChat: string, alRecibir: (chat: Chat) => void, alFallar?: (error: unknown) => void): () => void;
  enviar(uuidChat: string, texto: string): Promise<Mensaje>;
}

/**
 * Canal por polling (D08): consulta E1 cada 8 s mientras haya una suscripción y la app esté en primer plano
 * (como la campanita). Pide solo lo posterior al último mensaje recibido y descarta respuestas viejas.
 */
export const canalPorPolling: CanalDeMensajes = {
  suscribir(uuidChat, alRecibir, alFallar) {
    let activa = true;
    let ultimo: string | undefined;
    let pedido = 0;
    let intervalo: ReturnType<typeof setInterval> | null = null;

    const consultar = () => {
      const id = ++pedido;
      listarMensajes(uuidChat, ultimo).then(
        (chat) => {
          if (!activa || id !== pedido) return;
          if (chat.mensajes.length > 0) ultimo = chat.mensajes[chat.mensajes.length - 1].uuid;
          alRecibir(chat);
        },
        (error: unknown) => {
          if (activa && id === pedido) alFallar?.(error);
        },
      );
    };
    const arrancar = () => {
      if (intervalo !== null) return;
      consultar();
      intervalo = setInterval(consultar, INTERVALO_DE_POLLING_MS);
    };
    const parar = () => {
      if (intervalo !== null) clearInterval(intervalo);
      intervalo = null;
    };

    if (AppState.currentState !== 'background') arrancar();
    const suscripcion = AppState.addEventListener('change', (estado) => (estado === 'active' ? arrancar() : parar()));
    return () => {
      activa = false;
      parar();
      suscripcion.remove();
    };
  },
  enviar: enviarMensaje,
};

/**
 * Suma mensajes nuevos a los que ya hay, sin repetir (un enviado vuelve en el próximo ciclo) y en orden de
 * creación (uno de la otra parte puede llegar después de uno propio que se escribió más tarde).
 */
export function agregarMensajes(actuales: Mensaje[], nuevos: Mensaje[]): Mensaje[] {
  const vistos = new Set(actuales.map((m) => m.uuid));
  const sinRepetir = nuevos.filter((m) => !vistos.has(m.uuid));
  if (sinRepetir.length === 0) return actuales;
  return [...actuales, ...sinRepetir].sort((a, b) => Date.parse(a.creadoEn) - Date.parse(b.creadoEn));
}
