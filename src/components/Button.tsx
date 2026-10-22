import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text } from 'react-native';

import type { NombreDeIcono } from '../navigation/iconos';
import { bordes, colores, espaciado, opacidades, radios, tamanios, tipografia } from '../theme';

type Variante = 'primario' | 'secundario' | 'terciario' | 'peligro' | 'contorno' | 'texto';

interface Props {
  etiqueta: string;
  onPress: () => void;
  /**
   * primario: verde, ancho completo. secundario: negro, ajustado al contenido.
   * terciario: blanco con borde verde. (D11 propone otro criterio; no está decidido.)
   * Bloque A de diseño: peligro (rojo, acciones destructivas), contorno (blanco con borde gris) y texto
   * (sin fondo, verde oscuro), pensadas para acciones dentro de tarjetas y listas.
   */
  variante?: Variante;
  deshabilitado?: boolean;
  /** chico: ~36 px de alto, para acciones dentro de tarjetas. Por defecto, el tamaño de siempre. */
  tamanio?: 'normal' | 'chico';
  /** Ícono de Ionicons a la izquierda de la etiqueta. */
  icono?: NombreDeIcono;
  /** Pisa el ancho de la variante: completo (todo el ancho) o contenido (lo que ocupa el texto). */
  ancho?: 'completo' | 'contenido';
}

const COLOR_DE_TEXTO: Record<Variante, string> = {
  primario: colores.tinta,
  secundario: colores.blanco,
  terciario: colores.tinta,
  peligro: colores.blanco,
  contorno: colores.tinta,
  texto: colores.verdeTexto,
};

export function Button({
  etiqueta,
  onPress,
  variante = 'primario',
  deshabilitado = false,
  tamanio = 'normal',
  icono,
  ancho,
}: Props) {
  const chico = tamanio === 'chico';
  const color = COLOR_DE_TEXTO[variante];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled: deshabilitado }}
      disabled={deshabilitado}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.base,
        chico && estilos.chico,
        estilos[variante],
        ancho === 'completo' && estilos.completo,
        ancho === 'contenido' && estilos.contenido,
        (pressed || deshabilitado) && estilos.atenuado,
      ]}
    >
      {icono !== undefined && (
        <Ionicons name={icono} size={chico ? tamanios.iconoChico : tamanios.icono} color={color} />
      )}
      <Text style={[chico ? tipografia.botonChico : tipografia.boton, { color }]}>{etiqueta}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    borderRadius: radios.boton,
    paddingVertical: espaciado.m,
    paddingHorizontal: espaciado.l,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: espaciado.s,
  },
  chico: { paddingVertical: espaciado.s, paddingHorizontal: espaciado.m, gap: espaciado.xs },
  primario: { backgroundColor: colores.verde, alignSelf: 'stretch' },
  secundario: { backgroundColor: colores.tinta, alignSelf: 'center' },
  terciario: {
    backgroundColor: colores.blanco,
    borderWidth: bordes.fino,
    borderColor: colores.verde,
    alignSelf: 'stretch',
  },
  peligro: { backgroundColor: colores.rojo, alignSelf: 'stretch' },
  contorno: {
    backgroundColor: colores.blanco,
    borderWidth: bordes.fino,
    borderColor: colores.borde,
    alignSelf: 'stretch',
  },
  // Sin fondo ni borde, el relleno horizontal solo correría el texto: queda alineado con el contenido.
  texto: { backgroundColor: 'transparent', alignSelf: 'center', paddingHorizontal: 0 },
  completo: { alignSelf: 'stretch' },
  contenido: { alignSelf: 'flex-start' },
  atenuado: { opacity: opacidades.atenuado },
});
