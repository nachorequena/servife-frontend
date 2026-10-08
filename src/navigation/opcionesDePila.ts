import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colores } from '../theme';

/**
 * screenOptions de los stacks. Con Expo SDK 57 Android dibuja la app de borde a borde: los botones del
 * sistema (o la barra de gestos) quedan encima del contenido. Cada pantalla del stack deja ese espacio
 * abajo; la ruta "Tabs" no, porque la barra de pestañas ya lo deja.
 */
export function useOpcionesDePila() {
  const { bottom } = useSafeAreaInsets();
  return ({ route }: { route: { name: string } }): NativeStackNavigationOptions =>
    route.name === 'Tabs' ? {} : { contentStyle: { paddingBottom: bottom, backgroundColor: colores.fondo } };
}
