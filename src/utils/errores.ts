import { ApiError } from '../api/errores';

export const MENSAJE_DE_RED = 'No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.';

/** Mensaje para mostrar ante un fallo: el del backend si es un ApiError; si no, el de red. */
export function mensajeDe(error: unknown): string {
  return error instanceof ApiError ? error.message : MENSAJE_DE_RED;
}
