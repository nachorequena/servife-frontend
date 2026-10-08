import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

export interface Coordenadas {
  lat: number;
  lng: number;
}

/** Tiempo máximo para obtener la posición; pasado ese plazo se sigue sin ubicación. */
const TIMEOUT_MS = 8000;

export type EstadoUbicacion = 'pidiendo' | 'concedida' | 'denegada' | 'error';

/**
 * Pide una vez por montaje el permiso de ubicación y la posición actual.
 * Nunca lanza: sin permiso o ante un fallo devuelve ubicacion null y la lista funciona sin distancia.
 */
export function useUbicacion(): { ubicacion: Coordenadas | null; estado: EstadoUbicacion } {
  const [resultado, setResultado] = useState<{ ubicacion: Coordenadas | null; estado: EstadoUbicacion }>({
    ubicacion: null,
    estado: 'pidiendo',
  });

  useEffect(() => {
    let vigente = true;
    const terminar = (ubicacion: Coordenadas | null, estado: EstadoUbicacion) => {
      if (vigente) setResultado({ ubicacion, estado });
    };
    (async () => {
      try {
        const permiso = await Location.requestForegroundPermissionsAsync();
        if (permiso.status !== 'granted') return terminar(null, 'denegada');
        const ultima =
          typeof Location.getLastKnownPositionAsync === 'function'
            ? await Location.getLastKnownPositionAsync().catch(() => null)
            : null;
        const posicion = ultima ?? (await conPlazo(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })));
        terminar({ lat: posicion.coords.latitude, lng: posicion.coords.longitude }, 'concedida');
      } catch {
        terminar(null, 'error');
      }
    })();
    return () => {
      vigente = false;
    };
  }, []);

  return resultado;
}

function conPlazo<T>(promesa: Promise<T>): Promise<T> {
  return new Promise<T>((resolver, rechazar) => {
    const temporizador = setTimeout(() => rechazar(new Error('Tiempo de espera agotado')), TIMEOUT_MS);
    promesa.then(
      (valor) => {
        clearTimeout(temporizador);
        resolver(valor);
      },
      (error) => {
        clearTimeout(temporizador);
        rechazar(error);
      },
    );
  });
}
