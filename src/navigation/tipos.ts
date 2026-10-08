import type { RolRegistrable } from '../api/identidad';

/**
 * Parámetros de cada ruta. Los IDs que viajan son siempre uuid (servife-ia/.ai/07-security.md).
 * Tabs por rol según D04 (servife-ia/.ai/09-ux-ui.md §Navegación).
 */

export type AccesoParams = {
  Bienvenida: undefined;
  Ingresar: { aviso?: string } | undefined;
  Registro: { rol?: RolRegistrable } | undefined;
  Recuperar: undefined;
  Restablecer: { email: string };
};

export type ClienteTabsParams = {
  Inicio: undefined;
  Mensajes: undefined;
  Historial: undefined;
  Perfil: undefined;
};

export type ClienteStackParams = {
  Tabs: undefined;
  Filtros: undefined;
  PerfilPrestador: { uuidPrestador: string };
  FormularioSolicitud: { uuidPrestador: string };
  DetalleSolicitud: { uuidSolicitud: string };
  Valoracion: { uuidSolicitud: string };
  TrabajosRealizados: { uuidPrestador: string };
  Chat: { uuidChat: string };
};

export type PrestadorTabsParams = {
  Solicitudes: undefined;
  Mensajes: undefined;
  Trabajos: undefined;
  Perfil: undefined;
};

export type PrestadorStackParams = {
  Tabs: undefined;
  NuevoTrabajo: undefined;
  DetalleTrabajo: { uuidPublicacion: string };
  Chat: { uuidChat: string };
};

/** D04 no enumera las tabs del gestor: estas son las del prototipo de Figma, pendientes de confirmar. */
export type GestorTabsParams = {
  Dashboard: undefined;
  Validaciones: undefined;
  Perfil: undefined;
};
