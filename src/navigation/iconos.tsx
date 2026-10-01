import Ionicons from '@expo/vector-icons/Ionicons';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import type { ComponentProps } from 'react';

export type NombreDeIcono = ComponentProps<typeof Ionicons>['name'];

/** Ícono de pestaña: relleno si está activa, contorno si no. Tabla en servife-ia/.ai/09-ux-ui.md. */
export function iconoDeTab(nombre: NombreDeIcono): BottomTabNavigationOptions['tabBarIcon'] {
  return ({ color, size, focused }) => (
    <Ionicons name={(focused ? nombre : `${nombre}-outline`) as NombreDeIcono} color={color} size={size} />
  );
}
