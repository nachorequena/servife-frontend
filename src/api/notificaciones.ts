import { pedir } from './cliente';
import type { Pagina, ParametrosDePagina } from './paginacion';

/**
 * Avisos dentro de la app (E11) y registro del dispositivo para la push (E10). Una función por endpoint de
 * servife-ia/.ai/05-api-contract.md.
 */

/**
 * Tipos de aviso del contrato (TipoDeAviso en el backend). GENERAL es el valor por defecto de la columna
 * (migración V4): el backend no lo genera, pero una fila vieja podría tenerlo.
 */
export type TipoDeAviso =
  | 'PERFIL_APROBADO'
  | 'PERFIL_RECHAZADO'
  | 'SOLICITUD_NUEVA'
  | 'SOLICITUD_ACEPTADA'
  | 'SOLICITUD_RECHAZADA'
  | 'SOLICITUD_EN_CURSO'
  | 'SOLICITUD_FINALIZADA'
  | 'SOLICITUD_CANCELADA'
  | 'GENERAL';

export interface Aviso {
  uuid: string;
  tipo: TipoDeAviso;
  titulo: string;
  cuerpo: string | null;
  /** El de la solicitud que originó el aviso (los SOLICITUD_*); null en los avisos de perfil. */
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

/** E10 · POST /dispositivos. Registra el expo_push_token al iniciar sesión. Diferida hasta el build con EAS. */
export const registrarDispositivo = (cuerpo: unknown) =>
  pedir('/dispositivos', { metodo: 'POST', cuerpo });
