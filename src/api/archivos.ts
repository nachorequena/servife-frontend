import { pedir, URL_BASE } from './cliente';

/** Respuesta de D7. */
export interface ArchivoSubido {
  uuid: string;
  mime: string;
  bytes: number;
}

const EXTENSIONES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/**
 * D7 · POST /archivos · CU03, CU06, CU10. Multipart con el campo `archivo`; solo JPEG/PNG/WEBP, máx. 5 MB
 * (413 ARCHIVO_DEMASIADO_GRANDE). En React Native el archivo se manda como { uri, name, type }.
 */
export function subirImagen(uri: string, mime: string, nombre?: string): Promise<ArchivoSubido> {
  const formulario = new FormData();
  formulario.append('archivo', { uri, name: nombre ?? `imagen.${EXTENSIONES[mime] ?? 'jpg'}`, type: mime } as unknown as Blob);
  return pedir<ArchivoSubido>('/archivos', { metodo: 'POST', cuerpo: formulario });
}

/** GET /archivos/{uuid}: devuelve los bytes; requiere Authorization, por eso se usa con ImagenProtegida. */
export const urlDeArchivo = (uuid: string): string => `${URL_BASE}/archivos/${uuid}`;
