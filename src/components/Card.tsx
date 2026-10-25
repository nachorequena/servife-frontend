import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { bordes, colores, elevaciones, espaciado, radios } from '../theme';

interface Props {
  children: ReactNode;
  onPress?: () => void;
  /** gris: la de la maqueta (por defecto). blanca: fondo blanco con borde suave y sombra leve, con mejor contraste para texto secundario. */
  variante?: 'gris' | 'blanca';
  /** Nombre para lectores de pantalla cuando la tarjeta entera se toca. */
  accessibilityLabel?: string;
}

/** Tarjeta de listado (prestadores, solicitudes, validaciones). */
export function Card({ children, onPress, variante = 'gris', accessibilityLabel }: Props) {
  const estilo = [estilos.tarjeta, variante === 'blanca' && estilos.blanca];
  if (onPress) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={estilo}>
        {children}
      </Pressable>
    );
  }
  return <View style={estilo}>{children}</View>;
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
  blanca: {
    backgroundColor: colores.blanco,
    borderWidth: bordes.fino,
    borderColor: colores.bordeSuave,
    ...elevaciones.tarjeta,
  },
});
