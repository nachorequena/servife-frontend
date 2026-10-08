import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

export interface Coordenadas {
  lat: number;
  lng: number;
}

/** Tiempo máximo para obtener la posición; pasado ese plazo se sigue sin ubicación. */
const TIMEOUT_MS = 8000;

export type EstadoUbicacion = 'pidiendo' | 'concedida' | 'denegada' | 'error';

interface ResultadoDeUbicacion {
  ubicacion: Coordenadas | null;
  estado: EstadoUbicacion;
}

/**
 * Pide una vez por montaje el permiso de ubicación y la posición actual.
 * Nunca lanza: sin permiso o ante un fallo devuelve ubicacion null y la lista funciona sin distancia.
 */
export function useUbicacion(): ResultadoDeUbicacion {
  const [resultado, setResultado] = useState<ResultadoDeUbicacion>({ ubicacion: null, estado: 'pidiendo' });

  useEffect(() => {
    let vigente = true;
    resolverUbicacion().then((r) => {
      if (vigente) setResultado(r);
    });
    return () => {
      vigente = false;
    };
  }, []);

  return resultado;
}

/** Pedido puntual (a demanda, p. ej. al tocar un botón): la posición actual, o null sin permiso o ante un fallo. */
export async function obtenerUbicacionActual(): Promise<Coordenadas | null> {
  return (await resolverUbicacion()).ubicacion;
}

/** Pide el permiso y la posición. Nunca rechaza: el estado dice por qué no hay ubicación. */
async function resolverUbicacion(): Promise<ResultadoDeUbicacion> {
  try {
    const permiso = await Location.requestForegroundPermissionsAsync();
    if (permiso.status !== 'granted') return { ubicacion: null, estado: 'denegada' };
    const ultima =
      typeof Location.getLastKnownPositionAsync === 'function'
        ? await Location.getLastKnownPositionAsync().catch(() => null)
        : null;
    const posicion = ultima ?? (await conPlazo(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })));
    return { ubicacion: { lat: posicion.coords.latitude, lng: posicion.coords.longitude }, estado: 'concedida' };
  } catch {
    return { ubicacion: null, estado: 'error' };
  }
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
