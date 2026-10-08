import { pedir } from './cliente';

/**
 * Disponibilidad semanal del prestador (D09): días de la semana, 1 = lunes … 7 = domingo.
 * Una función por endpoint de servife-ia/.ai/05-api-contract.md; los IDs son los del prototipo.
 */

export interface Disponibilidad {
  dias: number[];
}

/** C5 · GET /prestadores/{uuid}/disponibilidad · CU05, CU06. */
export const obtenerDisponibilidad = (uuidPrestador: string) =>
  pedir<Disponibilidad>(`/prestadores/${uuidPrestador}/disponibilidad`);

/** B8 · PUT /prestadores/me/disponibilidad · D09 · Prestador. Reemplaza el set de días. */
export const reemplazarMiDisponibilidad = (dias: number[]) =>
  pedir<Disponibilidad>('/prestadores/me/disponibilidad', { metodo: 'PUT', cuerpo: { dias } });
