import { Directory, Paths } from 'expo-file-system';

/** Carpeta (dentro de la caché del sistema) donde se guardan las imágenes descargadas de GET /archivos/{uuid}. */
export const carpetaDeImagenes = (): Directory => new Directory(Paths.cache, 'archivos');

/**
 * Carpeta temporal de los documentos de validación que mira el gestor (E8b: DNI y certificaciones, Ley 25.326).
 * Se vacía al salir del expediente y al terminar la sesión.
 */
export const carpetaDeDocumentos = (): Directory => new Directory(Paths.cache, 'documentos');

/**
 * Borra las imágenes y los documentos descargados. Se llama al terminar la sesión (limpiarTokens): son datos
 * del usuario. Nunca lanza: un fallo al limpiar no puede impedir cerrar la sesión (el sistema igual puede
 * vaciar la caché).
 */
export function vaciarCacheDeImagenes(): void {
  vaciar(carpetaDeImagenes());
  vaciarDocumentosDescargados();
}

/** Borra los documentos de validación descargados (al salir del expediente). Nunca lanza. */
export function vaciarDocumentosDescargados(): void {
  vaciar(carpetaDeDocumentos());
}

function vaciar(carpeta: Directory): void {
  try {
    if (carpeta.exists) {
      carpeta.delete();
    }
  } catch {
    // se ignora a propósito: ver vaciarCacheDeImagenes
  }
}
