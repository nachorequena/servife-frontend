import { File } from 'expo-file-system';

import { carpetaDeImagenes } from './cacheImagenes';
import { pedir, renovarSesionParaRecursos, URL_BASE } from './cliente';
import { obtenerAccessToken } from './tokens';

/** Respuesta de D7. */
export interface ArchivoSubido {
  uuid: string;
  mime: string;
  bytes: number;
}

/** Una foto de 2-5 MB con mala señal no entra en los 10 s por defecto del cliente. */
const TIEMPO_MAXIMO_DE_SUBIDA_MS = 60_000;

const EXTENSIONES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/**
 * D7 · POST /archivos · CU03, CU06, CU10. Multipart con el campo `archivo`; solo JPEG/PNG/WEBP, máx. 5 MB
 * (413 ARCHIVO_DEMASIADO_GRANDE).
 *
 * Expo SDK 57 reemplaza fetch por expo/fetch, que no acepta la parte `{ uri, name, type }` de React Native:
 * solo strings, Blob u objetos con bytes(). Se manda un objeto con bytes() (lee el archivo local) más `name`
 * (filename de la parte, que Spring exige) y `type` explícitos; los de expo-file-system no son confiables
 * porque salen del uri (que a veces no tiene extensión).
 */
export function subirImagen(uri: string, mime: string, nombre?: string): Promise<ArchivoSubido> {
  const archivo = new File(uri);
  const parte = {
    name: nombre ?? `imagen.${EXTENSIONES[mime] ?? 'jpg'}`,
    type: mime,
    bytes: () => archivo.bytes(),
  };
  const formulario = new FormData();
  formulario.append('archivo', parte as unknown as Blob);
  return pedir<ArchivoSubido>('/archivos', { metodo: 'POST', cuerpo: formulario, tiempoMaximoMs: TIEMPO_MAXIMO_DE_SUBIDA_MS });
}

/** GET /archivos/{uuid}: devuelve los bytes; requiere Authorization (ver descargarImagen). */
export const urlDeArchivo = (uuid: string): string => `${URL_BASE}/archivos/${uuid}`;

const descargasEnCurso = new Map<string, Promise<string>>();

/**
 * Descarga GET /archivos/{uuid} (con Authorization) a la caché y devuelve el uri local para <Image>, que no
 * manda headers. Un uuid es inmutable, así que si ya está descargado se reutiliza. Ante un 401 renueva la
 * sesión una vez y reintenta una vez; cualquier otro fallo se lanza. Pedidos simultáneos comparten la descarga.
 */
export function descargarImagen(uuid: string): Promise<string> {
  const enCurso = descargasEnCurso.get(uuid);
  if (enCurso) {
    return enCurso;
  }
  const descarga = descargar(uuid).finally(() => descargasEnCurso.delete(uuid));
  descargasEnCurso.set(uuid, descarga);
  return descarga;
}

async function descargar(uuid: string): Promise<string> {
  const carpeta = carpetaDeImagenes();
  const definitivo = new File(carpeta, uuid);
  if (definitivo.exists) {
    return definitivo.uri;
  }
  carpeta.create({ idempotent: true, intermediates: true });
  // Se baja a un temporal y recién al terminar bien se renombra: un corte nunca deja un archivo que cuente como caché.
  const temporal = new File(carpeta, `${uuid}.tmp`);
  try {
    try {
      await bajar(uuid, temporal);
    } catch (error) {
      if (!esNoAutorizado(error) || !(await renovarSesionParaRecursos())) {
        throw error;
      }
      await bajar(uuid, temporal);
    }
    await temporal.move(definitivo);
    return definitivo.uri;
  } catch (error) {
    if (temporal.exists) {
      temporal.delete(); // en Android un corte puede dejar el archivo parcial
    }
    throw error;
  }
}

async function bajar(uuid: string, destino: File): Promise<void> {
  const token = obtenerAccessToken();
  if (!token) {
    throw new Error('No hay sesión para descargar la imagen');
  }
  await File.downloadFileAsync(urlDeArchivo(uuid), destino, {
    headers: { Authorization: `Bearer ${token}` },
    idempotent: true,
  });
}

/**
 * expo-file-system rechaza las respuestas no 2xx con un error cuyo mensaje incluye el código HTTP; no hay código
 * estructurado. Mensajes reales: Android (FileSystemDownload.kt) "Unable to download a file: response has status: 401"
 * e iOS (FileSystemDownload.swift) "response has status 401".
 */
const esNoAutorizado = (error: unknown): boolean => error instanceof Error && /\b401\b/.test(error.message);
