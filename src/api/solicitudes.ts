import { pedir } from './cliente';
import type { ParametrosDePagina } from './paginacion';

/**
 * Módulo C — Solicitudes (Tomás Ferreyra).
 * Una función por endpoint de servife-ia/.ai/05-api-contract.md; los IDs son los del prototipo.
 */

/** Estados de la máquina de estados (servife-ia/.ai/02-context.md). */
export type EstadoSolicitud =
  | 'PENDIENTE'
  | 'ACEPTADA'
  | 'RECHAZADA'
  | 'CANCELADA'
  | 'EN_CURSO'
  | 'FINALIZADA'
  | 'VALORADA';

/** C1 · POST /solicitudes · CU06 · Cliente. Incluye imagenIds de imágenes ya subidas (D7). */
export const crearSolicitud = (cuerpo: unknown) =>
  pedir('/solicitudes', { metodo: 'POST', cuerpo });

/** C2 · GET /solicitudes · CU06, CU09. Las del usuario autenticado. */
export const listarMisSolicitudes = (filtros: ParametrosDePagina & { estado?: EstadoSolicitud } = {}) =>
  pedir('/solicitudes', { consulta: { ...filtros } });

/** C3 · GET /solicitudes/{uuid} · CU06, CU09. */
export const obtenerSolicitud = (uuid: string) => pedir(`/solicitudes/${uuid}`);

/** C4 · PATCH /solicitudes/{uuid}/estado · CU09. Única puerta de cambio de estado. */
export const cambiarEstadoDeSolicitud = (uuid: string, cuerpo: unknown) =>
  pedir(`/solicitudes/${uuid}/estado`, { metodo: 'PATCH', cuerpo });

/** C5 · GET /prestadores/{uuid}/disponibilidad · CU05, CU06. */
export const obtenerDisponibilidad = (uuidPrestador: string) =>
  pedir(`/prestadores/${uuidPrestador}/disponibilidad`);
