import { Pressable, StyleSheet, Text } from 'react-native';

import { bordes, colores, espaciado, radios, tipografia } from '../theme';

interface Props {
  etiqueta: string;
  seleccionado: boolean;
  onPress: () => void;
  /** Texto para lectores de pantalla cuando la etiqueta es abreviada (ej. "L" → "Lunes"). */
  descripcion?: string;
}

/** Opción seleccionable en forma de píldora (filtros). */
export function Chip({ etiqueta, seleccionado, onPress, descripcion }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={descripcion ?? etiqueta}
      accessibilityState={{ selected: seleccionado }}
      onPress={onPress}
      style={[estilos.base, seleccionado && estilos.seleccionado]}
    >
      <Text style={[estilos.texto, seleccionado && estilos.textoSeleccionado]}>{etiqueta}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    backgroundColor: colores.blanco,
    borderWidth: bordes.fino,
    borderColor: colores.tintaSecundaria,
    borderRadius: radios.pill,
    paddingVertical: espaciado.xs,
    paddingHorizontal: espaciado.m,
  },
  seleccionado: { backgroundColor: colores.verde, borderColor: colores.verde },
  texto: { ...tipografia.cuerpo, color: colores.tinta },
  textoSeleccionado: { color: colores.blanco, fontWeight: '700' },
});
