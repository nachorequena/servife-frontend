import { useNavigation, useRoute } from '@react-navigation/native';
import { useEffect, useState } from 'react';

const DURACION_MS = 4000;

/**
 * Toma el `aviso` que llega como parámetro de la ruta, lo limpia del parámetro (los params de una tab
 * sobreviven) y lo devuelve para mostrarlo unos segundos o hasta salir de la pantalla.
 */
export function useAvisoDeRuta(): string | undefined {
  const navigation = useNavigation();
  const recibido = (useRoute().params as { aviso?: string } | undefined)?.aviso;
  const [aviso, setAviso] = useState<string | undefined>();

  useEffect(() => {
    if (recibido === undefined) return;
    setAviso(recibido);
    navigation.setParams({ aviso: undefined } as never);
  }, [recibido, navigation]);

  useEffect(() => {
    if (aviso === undefined) return;
    const temporizador = setTimeout(() => setAviso(undefined), DURACION_MS);
    return () => clearTimeout(temporizador);
  }, [aviso]);

  useEffect(() => navigation.addListener('blur', () => setAviso(undefined)), [navigation]);

  return aviso;
}
