import { pedir } from './cliente';
import type { ParametrosDePagina } from './paginacion';

/**
 * Módulo E — Gestión, validación y mensajería (Ignacio Requena).
 * Una función por endpoint de servife-ia/.ai/05-api-contract.md; los IDs son los del prototipo
 * (E12 a E15 son posteriores: salieron de D04 y D06).
 * Consulta previa (D03): endpoints sin definir, no se agregan hasta que el equipo los cierre.
 */

/** E12 · GET /conversaciones · D04. Bandeja Mensajes. */
export const listarConversaciones = () => pedir('/conversaciones');

/** E1 · GET /chats/{uuid}/mensajes?desde= · CU07. Polling cada 8 s (ver api/mensajeria.ts). */
export const listarMensajes = (uuidChat: string, desde?: string) =>
  pedir(`/chats/${uuidChat}/mensajes`, { consulta: { desde } });

/** E2 · POST /chats/{uuid}/mensajes · CU07. */
export const enviarMensaje = (uuidChat: string, cuerpo: unknown) =>
  pedir(`/chats/${uuidChat}/mensajes`, { metodo: 'POST', cuerpo });

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

/** E5 · GET /admin/validaciones · CU14 · Gestor. */
export const listarValidacionesPendientes = () => pedir('/admin/validaciones');

/** E6 · PATCH /admin/prestadores/{uuid}/validacion · CU14 · Gestor. */
export const validarPrestador = (uuidPrestador: string, cuerpo: unknown) =>
  pedir(`/admin/prestadores/${uuidPrestador}/validacion`, { metodo: 'PATCH', cuerpo });

/** E8 · GET /admin/prestadores/{uuid}/documentos · CU14 · Gestor. Nunca por URL pública. */
export const obtenerDocumentosDePrestador = (uuidPrestador: string) =>
  pedir(`/admin/prestadores/${uuidPrestador}/documentos`);

/** E7 · POST /prestadores/me/documentos · CU14 · Prestador. DNI y certificaciones (D01). */
export const subirDocumento = (formulario: FormData) =>
  pedir('/prestadores/me/documentos', { metodo: 'POST', cuerpo: formulario });

/** E9 · GET /admin/metricas · CU12 · Gestor. Servicios activos y validaciones pendientes. */
export const obtenerMetricas = () => pedir('/admin/metricas');

/** E10 · POST /dispositivos. Registra el expo_push_token al iniciar sesión. */
export const registrarDispositivo = (cuerpo: unknown) =>
  pedir('/dispositivos', { metodo: 'POST', cuerpo });

/** E11 · GET /notificaciones. */
export const listarNotificaciones = () => pedir('/notificaciones');
