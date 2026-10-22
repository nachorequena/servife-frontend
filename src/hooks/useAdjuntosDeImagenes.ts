import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useRef, useState } from 'react';

import { subirImagen } from '../api/archivos';
import { ApiError } from '../api/errores';
import { MENSAJE_DE_RED } from '../utils/errores';

export const MAXIMO_DE_IMAGENES = 5;
const MAXIMO_DE_BYTES = 5 * 1024 * 1024;

export interface Adjunto {
  clave: number;
  /** Archivo local recién elegido; las ya subidas antes (al editar) no tienen uri y se muestran desde el servidor. */
  uri?: string;
  mime?: string;
  nombre?: string;
  estado: 'subiendo' | 'lista' | 'error';
  uuid?: string;
  /** Por qué falló la subida (estado 'error'). */
  mensaje?: string;
  /** Solo tiene sentido reintentar si falló la red o el servidor, no un 400/413. */
  reintentable?: boolean;
}

/**
 * Imágenes adjuntas a un formulario (D7): elegir de la galería, subir apenas se eligen, reintentar y quitar. Lo
 * usan FormularioSolicitud (CU06) y NuevoTrabajo (CU10); la vista es components/AdjuntosDeImagenes.
 *
 * @param alError recibe el mensaje que va bajo las imágenes (undefined lo limpia)
 * @param iniciales uuid de imágenes ya subidas (al editar), que arrancan listas
 */
export function useAdjuntosDeImagenes(alError: (mensaje: string | undefined) => void, iniciales: string[] = []) {
  const clave = useRef(0);
  const [adjuntos, setAdjuntos] = useState<Adjunto[]>(() =>
    iniciales.map((uuid) => ({ clave: ++clave.current, uuid, estado: 'lista' })),
  );
  const alErrorRef = useRef(alError);
  alErrorRef.current = alError;

  const cambiar = useCallback((k: number, cambios: Partial<Adjunto>) => {
    setAdjuntos((actuales) => actuales.map((a) => (a.clave === k ? { ...a, ...cambios } : a)));
  }, []);

  const subir = useCallback(
    async (adjunto: Adjunto) => {
      if (adjunto.uri === undefined) return;
      cambiar(adjunto.clave, { estado: 'subiendo', mensaje: undefined, reintentable: undefined });
      try {
        const archivo = await subirImagen(adjunto.uri, adjunto.mime ?? 'image/jpeg', adjunto.nombre);
        cambiar(adjunto.clave, { estado: 'lista', uuid: archivo.uuid });
      } catch (e) {
        cambiar(
          adjunto.clave,
          e instanceof ApiError
            ? { estado: 'error', mensaje: e.errorDe('archivo') ?? e.message, reintentable: e.status >= 500 }
            : { estado: 'error', mensaje: MENSAJE_DE_RED, reintentable: true },
        );
      }
    },
    [cambiar],
  );

  async function elegir() {
    if (adjuntos.length >= MAXIMO_DE_IMAGENES) {
      alErrorRef.current(`Podés adjuntar hasta ${MAXIMO_DE_IMAGENES} imágenes.`);
      return;
    }
    let resultado: ImagePicker.ImagePickerResult;
    try {
      resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.6,
        allowsMultipleSelection: false,
      });
    } catch {
      alErrorRef.current('No pudimos abrir tus fotos.');
      return;
    }
    const asset = resultado.canceled ? undefined : resultado.assets[0];
    if (!asset) return;
    // asset.fileSize es el de la foto original en Android; se sube la copia con quality 0.6, así que se mide esa.
    if (new File(asset.uri).size > MAXIMO_DE_BYTES) {
      alErrorRef.current('La imagen pesa más de 5 MB. Elegí otra.');
      return;
    }
    alErrorRef.current(undefined);
    const nuevo: Adjunto = {
      clave: ++clave.current,
      uri: asset.uri,
      mime: asset.mimeType ?? 'image/jpeg',
      nombre: asset.fileName ?? undefined,
      estado: 'subiendo',
    };
    setAdjuntos((actuales) => [...actuales, nuevo]);
    void subir(nuevo);
  }

  const quitar = (k: number) => {
    setAdjuntos((actuales) => actuales.filter((a) => a.clave !== k));
    alErrorRef.current(undefined);
  };

  return {
    adjuntos,
    elegir,
    reintentar: subir,
    quitar,
    subiendo: adjuntos.some((a) => a.estado === 'subiendo'),
    conError: adjuntos.some((a) => a.estado === 'error'),
    /** uuid de las imágenes ya subidas, en el orden en que se eligieron. */
    uuidsListos: adjuntos.flatMap((a) => (a.estado === 'lista' && a.uuid ? [a.uuid] : [])),
  };
}

export type AdjuntosDeImagenes = ReturnType<typeof useAdjuntosDeImagenes>;
