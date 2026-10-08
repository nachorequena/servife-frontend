import { pedir } from './cliente';
import type { TipoServicio } from './catalogo';
import type { Pagina, ParametrosDePagina } from './paginacion';

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

export type AccionSobreSolicitud = 'ACEPTAR' | 'RECHAZAR' | 'INICIAR' | 'FINALIZAR' | 'CANCELAR';

/** El teléfono solo viene en ACEPTADA, EN_CURSO, FINALIZADA y VALORADA. */
export interface Parte {
  uuid: string;
  nombreApellido: string;
  telefono: string | null;
}

export interface Solicitud {
  uuid: string;
  estado: EstadoSolicitud;
  cliente: Parte;
  prestador: Parte;
  tipoServicio: TipoServicio;
  /** Fecha sola 'AAAA-MM-DD'. */
  fechaDeseada: string;
  horaPreferida: string | null;
  direccion: string;
  descripcion: string;
  imagenIds: string[];
  /** Centavos. */
  precioAcordado: number | null;
  motivo: string | null;
  canceladaPor: 'CLIENTE' | 'PRESTADOR' | null;
  creadoEn: string;
  actualizadoEn: string;
  accionesDisponibles: AccionSobreSolicitud[];
}

export interface SolicitudEnLista {
  uuid: string;
  estado: EstadoSolicitud;
  contraparte: Parte;
  tipoServicio: TipoServicio;
  fechaDeseada: string;
  horaPreferida: string | null;
  /** Hasta 140 caracteres y "…". */
  descripcion: string;
  direccion: string;
  creadoEn: string;
}

/** Cuerpo de C1. */
export interface CrearSolicitud {
  uuidPrestador: string;
  fechaDeseada: string;
  horaPreferida?: string;
  direccion: string;
  descripcion: string;
  /** Máximo 5, ya subidas con D7. */
  imagenIds?: string[];
}

/** Cuerpo de C4. precioAcordado en centavos, solo con ACEPTAR. */
export interface CambioDeEstado {
  accion: AccionSobreSolicitud;
  motivo?: string;
  precioAcordado?: number;
}

export interface FiltrosDeSolicitudes extends ParametrosDePagina {
  /** Viaja repetido: estado=PENDIENTE&estado=ACEPTADA. */
  estados?: EstadoSolicitud[];
}

/** C1 · POST /solicitudes · CU06 · Cliente. Incluye imagenIds de imágenes ya subidas (D7). */
export const crearSolicitud = (cuerpo: CrearSolicitud) =>
  pedir<Solicitud>('/solicitudes', { metodo: 'POST', cuerpo });

/** C2 · GET /solicitudes · CU06, CU09. Las del usuario autenticado. */
export const listarMisSolicitudes = ({ estados, page, size }: FiltrosDeSolicitudes = {}) =>
  pedir<Pagina<SolicitudEnLista>>('/solicitudes', { consulta: { estado: estados, page, size } });

/** C3 · GET /solicitudes/{uuid} · CU06, CU09. */
export const obtenerSolicitud = (uuid: string) => pedir<Solicitud>(`/solicitudes/${uuid}`);

/** C4 · PATCH /solicitudes/{uuid}/estado · CU09. Única puerta de cambio de estado. */
export const cambiarEstadoDeSolicitud = (uuid: string, cuerpo: CambioDeEstado) =>
  pedir<Solicitud>(`/solicitudes/${uuid}/estado`, { metodo: 'PATCH', cuerpo });
