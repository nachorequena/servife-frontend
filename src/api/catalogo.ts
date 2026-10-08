import { pedir } from './cliente';
import type { Pagina, ParametrosDePagina } from './paginacion';

/**
 * Módulo B — Catálogo y búsqueda (Juan Pablo Saravia).
 * Una función por endpoint de servife-ia/.ai/05-api-contract.md; los IDs son los del prototipo.
 */

/** Filtros de B5. Sin rango de precio (D02). */
export interface FiltrosDePrestadores extends ParametrosDePagina {
  /** Búsqueda libre por nombre, rubro o zona. */
  q?: string;
  tipoServicioId?: string;
  lat?: number;
  lng?: number;
  radioKm?: number;
  puntajeMin?: number;
  /** 1 = lunes … 7 = domingo; viaja como `dias=1&dias=3`. */
  dias?: number[];
  orden?: 'cercania' | 'valoracion';
}

export interface TipoServicio {
  uuid: string;
  nombre: string;
  /** Nombre de un ícono de Ionicons permitido, o null. */
  icono: string | null;
  requiereMatricula: boolean;
}

/** Cuerpo de B2 y B3. Íconos permitidos: water, flash, sparkles, flame, hammer, leaf, construct, brush, car, home, paw, laptop. */
export interface TipoServicioRequest {
  nombre: string;
  icono: string;
  requiereMatricula: boolean;
}

/** Fila de B5. */
export interface PrestadorEnLista {
  uuid: string;
  nombreApellido: string;
  tipoServicio: TipoServicio;
  zona: string | null;
  valoracionPromedio: number | null;
  distanciaKm: number | null;
  verificado: boolean;
}

/** Respuesta de B6. */
export interface PrestadorDetalle {
  uuid: string;
  nombreApellido: string;
  tipoServicio: TipoServicio;
  zona: string | null;
  descripcion: string | null;
  /** 1 = lunes … 7 = domingo. */
  dias: number[];
  valoracionPromedio: number | null;
  serviciosRealizados: number;
  verificado: boolean;
}

export type EstadoValidacion = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';

/** Perfil de servicio propio (GET y PUT /prestadores/me/perfil). */
export interface PerfilDeServicio {
  idTipoServicio: string;
  tipoServicio: TipoServicio;
  zona: string | null;
  lat: number | null;
  lng: number | null;
  radioKm: number | null;
  descripcion: string | null;
  estadoValidacion: EstadoValidacion;
}

/** Cuerpo de B7. lat y lng van juntos; radioKm entre 1 y 100. Cambiar de rubro vuelve a PENDIENTE. */
export interface ActualizarPerfilDeServicio {
  idTipoServicio: string;
  zona?: string;
  lat?: number;
  lng?: number;
  radioKm?: number;
  descripcion?: string;
}

/** B1 · GET /tipos-servicio · CU04, CU13. Público: el registro lo usa antes de tener sesión. */
export const listarTiposServicio = () => pedir<TipoServicio[]>('/tipos-servicio', { publico: true });

/** B2 · POST /tipos-servicio · CU13 · Gestor. Incluye requiereMatricula (D01). 409 si el nombre está repetido. */
export const crearTipoServicio = (cuerpo: TipoServicioRequest) =>
  pedir<TipoServicio>('/tipos-servicio', { metodo: 'POST', cuerpo });

/** B3 · PUT /tipos-servicio/{uuid} · CU13 · Gestor. */
export const actualizarTipoServicio = (uuid: string, cuerpo: TipoServicioRequest) =>
  pedir<TipoServicio>(`/tipos-servicio/${uuid}`, { metodo: 'PUT', cuerpo });

/** B4 · DELETE /tipos-servicio/{uuid} · CU13 · Gestor. 409 TIPO_SERVICIO_EN_USO si tiene prestadores activos. */
export const eliminarTipoServicio = (uuid: string) =>
  pedir<void>(`/tipos-servicio/${uuid}`, { metodo: 'DELETE' });

/** B5 · GET /prestadores · CU04. Solo APROBADOS. Paginado (size 1 a 50). */
export const buscarPrestadores = ({ dias, ...resto }: FiltrosDePrestadores = {}) =>
  pedir<Pagina<PrestadorEnLista>>('/prestadores', { consulta: { ...resto, dias } });

/** B6 · GET /prestadores/{uuid} · CU05. 404 si el prestador no está visible. */
export const obtenerPrestador = (uuid: string) => pedir<PrestadorDetalle>(`/prestadores/${uuid}`);

/** GET /prestadores/me/perfil · CU03 · Prestador. Perfil de servicio propio. */
export const obtenerMiPerfilDeServicio = () => pedir<PerfilDeServicio>('/prestadores/me/perfil');

/** B7 · PUT /prestadores/me/perfil · CU03 · Prestador. Sin tarifa (D02). */
export const actualizarMiPerfilDePrestador = (cuerpo: ActualizarPerfilDeServicio) =>
  pedir<PerfilDeServicio>('/prestadores/me/perfil', { metodo: 'PUT', cuerpo });
