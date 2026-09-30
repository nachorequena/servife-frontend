import { pedir } from './cliente';

/**
 * Módulo A — Identidad y cuentas (Pedro Soria).
 * Una función por endpoint de servife-ia/.ai/05-api-contract.md; los IDs son los del prototipo.
 * Los tipos de cuerpo y respuesta (unknown) los define el dueño del módulo junto con los DTOs.
 */

/** A1 · POST /auth/registro · CU01. Solo CLIENTE o PRESTADOR; el prestador manda idTipoServicio. */
export const registrar = (cuerpo: unknown) =>
  pedir('/auth/registro', { metodo: 'POST', cuerpo, publico: true });

/** A2 · POST /auth/login · CU02. Único para los tres roles. */
export const iniciarSesion = (cuerpo: unknown) =>
  pedir('/auth/login', { metodo: 'POST', cuerpo, publico: true });

/** A4 · GET /auth/me · CU02. Se llama al abrir la app. */
export const obtenerSesion = () => pedir('/auth/me');

/** A8 · POST /auth/recuperar · CU02. */
export const recuperarContrasenia = (cuerpo: unknown) =>
  pedir('/auth/recuperar', { metodo: 'POST', cuerpo, publico: true });

/** A6 · PUT /usuarios/me · CU03. */
export const actualizarMiUsuario = (cuerpo: unknown) =>
  pedir('/usuarios/me', { metodo: 'PUT', cuerpo });

/** A7 · PATCH /usuarios/me/password · CU03. */
export const cambiarContrasenia = (cuerpo: unknown) =>
  pedir('/usuarios/me/password', { metodo: 'PATCH', cuerpo });

// A3 · POST /auth/refresh lo usa solo el cliente HTTP (api/cliente.ts).
