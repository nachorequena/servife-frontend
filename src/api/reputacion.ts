import { pedir } from './cliente';
import type { ParametrosDePagina } from './paginacion';

/**
 * Módulo D — Reputación y trabajos (Facundo Bustamante).
 * Una función por endpoint de servife-ia/.ai/05-api-contract.md; los IDs son los del prototipo.
 */

/** D1 · POST /solicitudes/{uuid}/valoracion · CU08 · Cliente. Solo FINALIZADA y una vez (409). */
export const valorarSolicitud = (uuidSolicitud: string, cuerpo: unknown) =>
  pedir(`/solicitudes/${uuidSolicitud}/valoracion`, { metodo: 'POST', cuerpo });

/** D2 · GET /prestadores/{uuid}/valoraciones · CU05, CU08. Paginado. */
export const listarValoracionesDePrestador = (uuidPrestador: string, pagina: ParametrosDePagina = {}) =>
  pedir(`/prestadores/${uuidPrestador}/valoraciones`, { consulta: { ...pagina } });

/** D3 · GET /prestadores/{uuid}/publicaciones · CU11. Lo consume el cliente (solo lectura). */
export const listarPublicacionesDePrestador = (uuidPrestador: string) =>
  pedir(`/prestadores/${uuidPrestador}/publicaciones`);

/** D8 · GET /prestadores/me/publicaciones · CU10 · Prestador. */
export const listarMisPublicaciones = () => pedir('/prestadores/me/publicaciones');

/** D4 · POST /publicaciones · CU10 · Prestador. Puede vincular una solicitud FINALIZADA (D07). */
export const crearPublicacion = (cuerpo: unknown) =>
  pedir('/publicaciones', { metodo: 'POST', cuerpo });

/** D5 · PUT /publicaciones/{uuid} · CU10 · Prestador. */
export const actualizarPublicacion = (uuid: string, cuerpo: unknown) =>
  pedir(`/publicaciones/${uuid}`, { metodo: 'PUT', cuerpo });

/** D6 · DELETE /publicaciones/{uuid} · CU10 · Prestador. */
export const eliminarPublicacion = (uuid: string) =>
  pedir(`/publicaciones/${uuid}`, { metodo: 'DELETE' });
