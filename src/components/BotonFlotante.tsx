import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet } from 'react-native';

import type { NombreDeIcono } from '../navigation/iconos';
import { colores, elevaciones, espaciado, opacidades, radios, tamanios } from '../theme';

interface Props {
  icono: NombreDeIcono;
  /** Obligatorio: el botón no tiene texto visible. */
  accessibilityLabel: string;
  onPress: () => void;
}

/** Botón redondo flotante abajo a la derecha, para la acción principal de una lista (por ejemplo, "Añadir gestor"). */
export function BotonFlotante({ icono, accessibilityLabel, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [estilos.boton, pressed && estilos.presionado]}
    >
      <Ionicons name={icono} size={tamanios.icono + espaciado.xs} color={colores.tinta} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  boton: {
    position: 'absolute',
    right: espaciado.l,
    bottom: espaciado.l,
    width: tamanios.botonFlotante,
    height: tamanios.botonFlotante,
    borderRadius: radios.pill,
    backgroundColor: colores.verde,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevaciones.flotante,
  },
  presionado: { opacity: opacidades.atenuado },
});
