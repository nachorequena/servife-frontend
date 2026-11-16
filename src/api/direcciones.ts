import { pedir } from './cliente';

/**
 * Módulo A — Direcciones guardadas del cliente (A10 a A14). La principal es la misma que devuelve A4 en
 * usuario.direccion: el backend la copia ahí cada vez que cambia.
 */

export interface DireccionGuardada {
  uuid: string;
  /** "Casa", "Trabajo"... hasta 40 caracteres. */
  alias: string;
  /** Texto libre, hasta 255 caracteres. */
  direccion: string;
  principal: boolean;
}

export interface DatosDeDireccion {
  alias: string;
  direccion: string;
  /** true la marca como principal; la primera que se carga lo es siempre. */
  principal?: boolean;
}

const RUTA = '/clientes/me/direcciones';

/** A10 · GET /clientes/me/direcciones · Cliente. La principal primero. */
export const listarMisDirecciones = () => pedir<DireccionGuardada[]>(RUTA);

/** A11 · POST /clientes/me/direcciones · Cliente. 400 VALIDACION en alias o direccion. */
export const crearDireccion = (cuerpo: DatosDeDireccion) =>
  pedir<DireccionGuardada>(RUTA, { metodo: 'POST', cuerpo });

/** A12 · PUT /clientes/me/direcciones/{uuid} · Cliente. 404 si no es suya. */
export const actualizarDireccion = (uuid: string, cuerpo: DatosDeDireccion) =>
  pedir<DireccionGuardada>(`${RUTA}/${uuid}`, { metodo: 'PUT', cuerpo });

/** A13 · DELETE /clientes/me/direcciones/{uuid} · Cliente. 204; si era la principal, pasa a serlo la más nueva. */
export const eliminarDireccion = (uuid: string) => pedir<void>(`${RUTA}/${uuid}`, { metodo: 'DELETE' });

/** A14 · PATCH /clientes/me/direcciones/{uuid}/principal · Cliente. */
export const marcarDireccionPrincipal = (uuid: string) =>
  pedir<DireccionGuardada>(`${RUTA}/${uuid}/principal`, { metodo: 'PATCH' });

/** La principal de una lista (la del perfil), o undefined si no hay direcciones. */
export const principalDe = (direcciones: DireccionGuardada[]) => direcciones.find((d) => d.principal);
