import { pedir } from './cliente';
import type { Pagina, ParametrosDePagina } from './paginacion';

/**
 * Avisos dentro de la app (E11). Una función por endpoint de servife-ia/.ai/05-api-contract.md.
 */

export interface Aviso {
  uuid: string;
  tipo: string;
  titulo: string;
  cuerpo: string;
  /** null en el Sprint 2: todavía no hay solicitudes que originen avisos. */
  uuidSolicitud: string | null;
  leida: boolean;
  creadoEn: string;
}

/** E11 · GET /notificaciones. Paginado. */
export const listarAvisos = (pagina: ParametrosDePagina = {}) =>
  pedir<Pagina<Aviso>>('/notificaciones', { consulta: { ...pagina } });

/** E11 · PATCH /notificaciones/{uuid}/leida. 204. */
export const marcarAvisoLeido = (uuid: string) =>
  pedir<void>(`/notificaciones/${uuid}/leida`, { metodo: 'PATCH' });

/** E11 · GET /notificaciones/no-leidas. Para el globo de la campana. */
export const contarAvisosNoLeidos = () => pedir<{ cantidad: number }>('/notificaciones/no-leidas');
