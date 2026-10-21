import type { EstadoValidacion, TipoServicio } from './catalogo';
import { pedir } from './cliente';
import type { Pagina, ParametrosDePagina } from './paginacion';

/**
 * Módulo E — Gestión y validación (porción 5: Ignacio Requena).
 * Una función por endpoint de servife-ia/.ai/05-api-contract.md; los IDs son los del prototipo
 * (E13 a E15 son posteriores: salieron de D06). La mensajería (E1, E2, E12) está en api/mensajeria.ts y los
 * avisos y el dispositivo (E10, E11) en api/notificaciones.ts.
 */

/** E3 · GET /admin/usuarios · CU12 · Gestor. Filtros rol, estado, texto. */
export const listarUsuarios = (
  filtros: ParametrosDePagina & { rol?: string; estado?: string; texto?: string } = {},
) => pedir('/admin/usuarios', { consulta: { ...filtros } });

/** E13 · POST /admin/usuarios · CU15 · Gestor. Única vía para crear un gestor (D06). */
export const crearUsuario = (cuerpo: unknown) =>
  pedir('/admin/usuarios', { metodo: 'POST', cuerpo });

/** E14 · PUT /admin/usuarios/{uuid} · CU17 · Gestor. */
export const actualizarUsuario = (uuid: string, cuerpo: unknown) =>
  pedir(`/admin/usuarios/${uuid}`, { metodo: 'PUT', cuerpo });

/** E4 · PATCH /admin/usuarios/{uuid}/estado · CU12 · Gestor. Exige motivo. */
export const cambiarEstadoDeUsuario = (uuid: string, cuerpo: unknown) =>
  pedir(`/admin/usuarios/${uuid}/estado`, { metodo: 'PATCH', cuerpo });

/** E15 · DELETE /admin/usuarios/{uuid} · CU16 · Gestor. Baja lógica. */
export const eliminarUsuario = (uuid: string) =>
  pedir(`/admin/usuarios/${uuid}`, { metodo: 'DELETE' });

/** Fila de E5. */
export interface PrestadorPendiente {
  uuid: string;
  nombreApellido: string;
  email: string;
  tipoServicio: TipoServicio;
  creadoEn: string;
}

/** Cuerpo de E6. */
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

/** E9 · GET /admin/metricas · CU12 · Gestor. Servicios activos y validaciones pendientes. */
export const obtenerMetricas = () => pedir('/admin/metricas');
