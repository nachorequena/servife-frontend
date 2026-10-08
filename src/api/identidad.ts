import type { Rol } from '../store/sesion';
import { pedir } from './cliente';
import type { ParDeTokens } from './tokens';

/**
 * Módulo A — Identidad y cuentas (Pedro Soria).
 * Una función por endpoint de servife-ia/.ai/05-api-contract.md; los IDs son los del prototipo.
 */

export type RolRegistrable = 'CLIENTE' | 'PRESTADOR';
export type EstadoValidacion = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';

/** Respuesta de A1, A4 y A6. Solo uuid hacia la app; fecNacimiento en AAAA-MM-DD. */
export interface Usuario {
  uuid: string;
  rol: Rol;
  nombreApellido: string;
  email: string;
  telefono: string | null;
  direccion: string | null;
  fecNacimiento: string | null;
  estadoValidacion: EstadoValidacion | null;
}

/** Respuesta de A2 y A3: el par de tokens más el rol de la cuenta. */
export interface TokensDeSesion extends ParDeTokens {
  rol: Rol;
}

/** A1 · POST /auth/registro · CU01. Solo CLIENTE o PRESTADOR; el prestador manda idTipoServicio (uuid). */
export const registrar = (cuerpo: {
  rol: RolRegistrable;
  nombreApellido: string;
  email: string;
  contrasenia: string;
  idTipoServicio?: string;
}) => pedir<Usuario>('/auth/registro', { metodo: 'POST', cuerpo, publico: true });

/** A2 · POST /auth/login · CU02. Único para los tres roles. */
export const iniciarSesion = (cuerpo: { email: string; contrasenia: string }) =>
  pedir<TokensDeSesion>('/auth/login', { metodo: 'POST', cuerpo, publico: true });

/** A4 · GET /auth/me · CU02. Se llama al abrir la app. */
export const obtenerSesion = () => pedir<Usuario>('/auth/me');

/** A8 · POST /auth/recuperar · CU02. Manda el código de 6 dígitos por correo. */
export const recuperarContrasenia = (cuerpo: { email: string }) =>
  pedir<void>('/auth/recuperar', { metodo: 'POST', cuerpo, publico: true });

/** A9 · POST /auth/recuperar/confirmar · CU02. Valida el código y fija la contraseña nueva. */
export const confirmarRecuperacion = (cuerpo: { email: string; codigo: string; contraseniaNueva: string }) =>
  pedir<void>('/auth/recuperar/confirmar', { metodo: 'POST', cuerpo, publico: true });

/** A6 · PUT /usuarios/me · CU03. */
export const actualizarMiUsuario = (cuerpo: {
  nombreApellido: string;
  telefono?: string | null;
  direccion?: string | null;
  fecNacimiento?: string | null;
}) => pedir<Usuario>('/usuarios/me', { metodo: 'PUT', cuerpo });

/** A7 · PATCH /usuarios/me/password · CU03. */
export const cambiarContrasenia = (cuerpo: { contraseniaActual: string; contraseniaNueva: string }) =>
  pedir<void>('/usuarios/me/password', { metodo: 'PATCH', cuerpo });

// A3 · POST /auth/refresh lo usa solo el cliente HTTP (api/cliente.ts).
