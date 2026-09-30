import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colores, espaciado, radios } from '../theme';

interface Props {
  children: ReactNode;
  onPress?: () => void;
}

/** Tarjeta de listado (prestadores, solicitudes, validaciones). */
export function Card({ children, onPress }: Props) {
  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress} style={estilos.tarjeta}>
        {children}
      </Pressable>
    );
  }
  return <View style={estilos.tarjeta}>{children}</View>;
}

const estilos = StyleSheet.create({
  tarjeta: {
    backgroundColor: colores.tarjeta,
    borderRadius: radios.tarjeta,
    padding: espaciado.m,
    marginBottom: espaciado.s,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.m,
  },
});
