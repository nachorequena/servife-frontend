import { pedir } from './cliente';
import type { ParametrosDePagina } from './paginacion';

/**
 * Módulo B — Catálogo y búsqueda (Juan Pablo Saravia).
 * Una función por endpoint de servife-ia/.ai/05-api-contract.md; los IDs son los del prototipo.
 */

/** Filtros de B5. Sin rango de precio (D02). */
export interface FiltrosDePrestadores extends ParametrosDePagina {
  tipoServicioId?: string;
  lat?: number;
  lng?: number;
  radioKm?: number;
  puntajeMin?: number;
  dias?: number[];
  orden?: string;
}

/** B1 · GET /tipos-servicio · CU04, CU13. */
export const listarTiposServicio = () => pedir('/tipos-servicio');

/** B2 · POST /tipos-servicio · CU13 · Gestor. Incluye requiereMatricula (D01). */
export const crearTipoServicio = (cuerpo: unknown) =>
  pedir('/tipos-servicio', { metodo: 'POST', cuerpo });

/** B3 · PUT /tipos-servicio/{uuid} · CU13 · Gestor. */
export const actualizarTipoServicio = (uuid: string, cuerpo: unknown) =>
  pedir(`/tipos-servicio/${uuid}`, { metodo: 'PUT', cuerpo });

/** B4 · DELETE /tipos-servicio/{uuid} · CU13 · Gestor. 409 si tiene prestadores activos. */
export const eliminarTipoServicio = (uuid: string) =>
  pedir(`/tipos-servicio/${uuid}`, { metodo: 'DELETE' });

/** B5 · GET /prestadores · CU04. Solo APROBADOS. Paginado. */
export const buscarPrestadores = ({ dias, ...resto }: FiltrosDePrestadores = {}) =>
  pedir('/prestadores', { consulta: { ...resto, dias } });

/** B6 · GET /prestadores/{uuid} · CU05. */
export const obtenerPrestador = (uuid: string) => pedir(`/prestadores/${uuid}`);

/** B7 · PUT /prestadores/me/perfil · CU03 · Prestador. Sin tarifa (D02). */
export const actualizarMiPerfilDePrestador = (cuerpo: unknown) =>
  pedir('/prestadores/me/perfil', { metodo: 'PUT', cuerpo });

/** B8 · PUT /prestadores/me/disponibilidad · D09 · Prestador. Reemplaza el set de días. */
export const reemplazarMiDisponibilidad = (cuerpo: unknown) =>
  pedir('/prestadores/me/disponibilidad', { metodo: 'PUT', cuerpo });
