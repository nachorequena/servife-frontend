import { Directory, Paths } from 'expo-file-system';

/** Carpeta (dentro de la caché del sistema) donde se guardan las imágenes descargadas de GET /archivos/{uuid}. */
export const carpetaDeImagenes = (): Directory => new Directory(Paths.cache, 'archivos');

/**
 * Borra las imágenes descargadas. Se llama al terminar la sesión (limpiarTokens): son datos del usuario.
 * Nunca lanza: un fallo al limpiar no puede impedir cerrar la sesión (el sistema igual puede vaciar la caché).
 */
export function vaciarCacheDeImagenes(): void {
  try {
    const carpeta = carpetaDeImagenes();
    if (carpeta.exists) {
      carpeta.delete();
    }
  } catch {
    // se ignora a propósito: ver arriba
  }
}
