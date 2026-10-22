import { pedir } from './cliente';
import type { Pagina, ParametrosDePagina } from './paginacion';

/**
 * Módulo D — Reputación y trabajos (Facundo Bustamante).
 * Una función por endpoint de servife-ia/.ai/05-api-contract.md; los IDs son los del prototipo.
 */

/** Reseña del perfil del prestador (D2). */
export interface Resena {
  uuid: string;
  /** 1 a 5. */
  puntaje: number;
  comentario: string | null;
  nombreCliente: string;
  creadoEn: string;
}

/** Trabajo realizado (D3, D4, D5, D8). */
export interface Publicacion {
  uuid: string;
  titulo: string;
  descripcion: string | null;
  /** "AAAA-MM-DD" o null. */
  fechaTrabajo: string | null;
  /** En el orden en que se subieron; se muestran con ImagenProtegida. */
  imagenIds: string[];
  /** Valoración de la solicitud vinculada; null sin solicitud o sin valorar: entonces no hay estrellas (D07). */
  puntaje: number | null;
  /** Solo viaja al dueño (D4, D5, D8); en D3 es null. */
  uuidSolicitud: string | null;
  creadoEn: string;
}

/** Cuerpo de D4 y D5. D5 reemplaza todo: lo que no viene queda vacío. */
export interface DatosDePublicacion {
  /** Hasta 120. */
  titulo: string;
  /** Hasta 2000. */
  descripcion?: string;
  fechaTrabajo?: string;
  /** Una solicitud propia FINALIZADA o VALORADA que no esté en otra publicación. */
  uuidSolicitud?: string;
  /** Máximo 5, ya subidas con D7. */
  imagenIds?: string[];
}

/** D1 · POST /solicitudes/{uuid}/valoracion · CU08 · Cliente. Solo FINALIZADA y una vez (409). Todavía 501. */
export const valorarSolicitud = (uuidSolicitud: string, cuerpo: unknown) =>
  pedir(`/solicitudes/${uuidSolicitud}/valoracion`, { metodo: 'POST', cuerpo });

/** D2 · GET /prestadores/{uuid}/valoraciones · CU05, CU08. Paginado, más recientes primero. */
export const listarValoracionesDePrestador = (uuidPrestador: string, pagina: ParametrosDePagina = {}) =>
  pedir<Pagina<Resena>>(`/prestadores/${uuidPrestador}/valoraciones`, { consulta: { ...pagina } });

/** D3 · GET /prestadores/{uuid}/publicaciones · CU11. Lo consume el cliente (solo lectura). Paginado. */
export const listarPublicacionesDePrestador = (uuidPrestador: string, pagina: ParametrosDePagina = {}) =>
  pedir<Pagina<Publicacion>>(`/prestadores/${uuidPrestador}/publicaciones`, { consulta: { ...pagina } });

/** D8 · GET /prestadores/me/publicaciones · CU10 · Prestador. Paginado. */
export const listarMisPublicaciones = (pagina: ParametrosDePagina = {}) =>
  pedir<Pagina<Publicacion>>('/prestadores/me/publicaciones', { consulta: { ...pagina } });

/** D4 · POST /publicaciones · CU10 · Prestador. Puede vincular una solicitud FINALIZADA o VALORADA (D07). */
export const crearPublicacion = (cuerpo: DatosDePublicacion) =>
  pedir<Publicacion>('/publicaciones', { metodo: 'POST', cuerpo });

/** D5 · PUT /publicaciones/{uuid} · CU10 · Prestador. */
export const actualizarPublicacion = (uuid: string, cuerpo: DatosDePublicacion) =>
  pedir<Publicacion>(`/publicaciones/${uuid}`, { metodo: 'PUT', cuerpo });

/** D6 · DELETE /publicaciones/{uuid} · CU10 · Prestador. Baja lógica (204). */
export const eliminarPublicacion = (uuid: string) =>
  pedir<void>(`/publicaciones/${uuid}`, { metodo: 'DELETE' });
