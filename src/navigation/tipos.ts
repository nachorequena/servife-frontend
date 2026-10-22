import type { NavigatorScreenParams } from '@react-navigation/native';

import type { UsuarioAdmin } from '../api/gestion';
import type { RolRegistrable } from '../api/identidad';
import type { Publicacion } from '../api/reputacion';
import type { AccionSobreSolicitud } from '../api/solicitudes';
import type { Rol } from '../store/sesion';

/**
 * Parámetros de cada ruta. Los IDs que viajan son siempre uuid (servife-ia/.ai/07-security.md).
 * Tabs por rol según D04 (servife-ia/.ai/09-ux-ui.md §Navegación).
 */

export type AccesoParams = {
  Bienvenida: undefined;
  Ingresar: { aviso?: string; rol?: Rol } | undefined;
  Registro: { rol?: RolRegistrable } | undefined;
  Recuperar: undefined;
  Restablecer: { email: string };
};

export type ClienteTabsParams = {
  Inicio: undefined;
  Mensajes: undefined;
  Historial: { aviso?: string } | undefined;
  Perfil: undefined;
};

export type ClienteStackParams = {
  Tabs: NavigatorScreenParams<ClienteTabsParams> | undefined;
  Filtros: undefined;
  PerfilPrestador: { uuidPrestador: string };
  FormularioSolicitud: { uuidPrestador: string };
  DetalleSolicitud: { uuidSolicitud: string };
  Valoracion: { uuidSolicitud: string };
  TrabajosRealizados: { uuidPrestador: string };
  /** El trabajo viaja entero: no hay un GET de una sola publicación. */
  DetalleTrabajo: { publicacion: Publicacion };
  Chat: { uuidChat: string };
  Avisos: undefined;
};

export type PrestadorTabsParams = {
  Solicitudes: undefined;
  Mensajes: undefined;
  Trabajos: undefined;
  Perfil: undefined;
};

export type PrestadorStackParams = {
  Tabs: undefined;
  /** Con publicacion, edita ese trabajo (D5); sin ella, publica uno nuevo (D4). */
  NuevoTrabajo: { publicacion?: Publicacion } | undefined;
  /** El trabajo viaja entero: no hay un GET de una sola publicación. */
  DetalleTrabajo: { publicacion: Publicacion };
  /** `accion`: deja abierta esa acción al cargar (ACEPTAR desde la tarjeta, con el campo de precio). */
  DetalleSolicitud: { uuidSolicitud: string; accion?: AccionSobreSolicitud };
  Chat: { uuidChat: string };
  Avisos: undefined;
};

/**
 * D04 no enumera las tabs del gestor: Dashboard, Validaciones y Perfil son las del prototipo de Figma;
 * Servicios (CU13) y Usuarios (CU12) se sumaron sin maqueta. Pendientes de confirmar.
 */
export type GestorTabsParams = {
  Dashboard: undefined;
  Validaciones: undefined;
  Usuarios: undefined;
  Servicios: undefined;
  Perfil: undefined;
};

export type GestorStackParams = {
  Tabs: undefined;
  FormularioTipoServicio: { uuid?: string };
  /** Sin usuario: alta de un gestor (E13). Con usuario: edición (E14) con sus datos actuales. */
  FormularioUsuario: { usuario?: UsuarioAdmin };
  Avisos: undefined;
};
