import type { EstadoValidacion, TipoServicio } from './catalogo';
import { pedir } from './cliente';
import type { Pagina, ParametrosDePagina } from './paginacion';

/**
 * Módulo E — Gestión y validación (porción 5: Ignacio Requena).
 * Una función por endpoint de servife-ia/.ai/05-api-contract.md; los IDs son los del prototipo
 * (E13 a E15 son posteriores: salieron de D06). La mensajería (E1, E2, E12) está en api/mensajeria.ts y los
 * avisos y el dispositivo (E10, E11) en api/notificaciones.ts.
 */

export type RolDeUsuario = 'CLIENTE' | 'PRESTADOR' | 'GESTOR';
export type EstadoDeCuenta = 'ACTIVA' | 'SUSPENDIDA';

/**
 * Un usuario visto por el gestor (E3, E4, E13, E14). telefono es null en los gestores;
 * estadoValidacion y tipoServicio (nombre del rubro) solo vienen en los prestadores.
 */
export interface UsuarioAdmin {
  uuid: string;
  rol: RolDeUsuario;
  nombreApellido: string;
  email: string;
  telefono: string | null;
  estadoCuenta: EstadoDeCuenta;
  estadoValidacion: EstadoValidacion | null;
  tipoServicio: string | null;
  creadoEn: string;
}

export interface FiltrosDeUsuarios extends ParametrosDePagina {
  rol?: RolDeUsuario;
  estado?: EstadoDeCuenta;
  /** Nombre, email o uuid. Máximo 120. */
  texto?: string;
}

/** Cuerpo de E13: solo da de alta gestores (D06). */
export interface NuevoGestor {
  nombreApellido: string;
  email: string;
  contrasenia: string;
}

/** Cuerpo de E14: lo que el gestor puede editar de cualquier usuario. telefono omitido o vacío se borra. */
export interface DatosDeUsuario {
  nombreApellido: string;
  email: string;
  telefono?: string;
}

/** Cuerpo de E4: motivo obligatorio al suspender (hasta 255), opcional al reactivar. */
export interface CambioDeEstadoDeCuenta {
  estado: EstadoDeCuenta;
  motivo?: string;
}

/** E3 · GET /admin/usuarios · CU12 · Gestor. Filtros rol, estado y texto; paginado, más nuevos primero. */
export const listarUsuarios = (filtros: FiltrosDeUsuarios = {}) =>
  pedir<Pagina<UsuarioAdmin>>('/admin/usuarios', { consulta: { ...filtros } });

/** E13 · POST /admin/usuarios · CU15 · Gestor. Única vía para crear un gestor (D06). 409 EMAIL_YA_REGISTRADO. */
export const crearGestor = (cuerpo: NuevoGestor) =>
  pedir<UsuarioAdmin>('/admin/usuarios', { metodo: 'POST', cuerpo });

/** E14 · PUT /admin/usuarios/{uuid} · CU17 · Gestor. 409 EMAIL_YA_REGISTRADO. */
export const actualizarUsuario = (uuid: string, cuerpo: DatosDeUsuario) =>
  pedir<UsuarioAdmin>(`/admin/usuarios/${uuid}`, { metodo: 'PUT', cuerpo });

/** E4 · PATCH /admin/usuarios/{uuid}/estado · CU12 · Gestor. 409 ESTADO_SIN_CAMBIOS o NO_SOBRE_LA_PROPIA_CUENTA. */
export const cambiarEstadoDeUsuario = (uuid: string, cuerpo: CambioDeEstadoDeCuenta) =>
  pedir<UsuarioAdmin>(`/admin/usuarios/${uuid}/estado`, { metodo: 'PATCH', cuerpo });

/** E15 · DELETE /admin/usuarios/{uuid} · CU16 · Gestor. Baja lógica; 409 NO_SOBRE_LA_PROPIA_CUENTA. */
export const eliminarUsuario = (uuid: string) =>
  pedir<void>(`/admin/usuarios/${uuid}`, { metodo: 'DELETE' });

/** Fila de E5. postuladoEn: alta o último cambio de rubro (la cola se ordena por ahí). */
export interface PrestadorPendiente {
  uuid: string;
  nombreApellido: string;
  email: string;
  tipoServicio: TipoServicio;
  postuladoEn: string;
}

/** Cuerpo de E6. El motivo se guarda siempre; al prestador solo le llega el de un rechazo. Máximo 255. */
export interface DecisionDeValidacion {
  decision: 'APROBAR' | 'RECHAZAR';
  motivo?: string;
}

/** E5 · GET /admin/validaciones · CU14 · Gestor. Paginado. */
export const listarValidacionesPendientes = (pagina: ParametrosDePagina = {}) =>
  pedir<Pagina<PrestadorPendiente>>('/admin/validaciones', { consulta: { ...pagina } });

/** E6 · PATCH /admin/prestadores/{uuid}/validacion · CU14 · Gestor. 409 VALIDACION_YA_RESUELTA. */
export const validarPrestador = (uuidPrestador: string, cuerpo: DecisionDeValidacion) =>
  pedir<{ uuid: string; estadoValidacion: EstadoValidacion }>(
    `/admin/prestadores/${uuidPrestador}/validacion`,
    { metodo: 'PATCH', cuerpo },
  );

/** E8 · GET /admin/prestadores/{uuid}/documentos · CU14 · Gestor. Nunca por URL pública. */
export const obtenerDocumentosDePrestador = (uuidPrestador: string) =>
  pedir(`/admin/prestadores/${uuidPrestador}/documentos`);

/** E7 · POST /prestadores/me/documentos · CU14 · Prestador. DNI y certificaciones (D01). */
export const subirDocumento = (formulario: FormData) =>
  pedir('/prestadores/me/documentos', { metodo: 'POST', cuerpo: formulario });

/** Respuesta de E9: serviciosActivos son las solicitudes ACEPTADA o EN_CURSO; solicitudesPendientes, las que esperan respuesta. */
export interface Metricas {
  serviciosActivos: number;
  solicitudesPendientes: number;
  validacionesPendientes: number;
}

/** E9 · GET /admin/metricas · CU12 · Gestor. Contadores del dashboard, sin incidencias (D05). */
export const obtenerMetricas = () => pedir<Metricas>('/admin/metricas');
