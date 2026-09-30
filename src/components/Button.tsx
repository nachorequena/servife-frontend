import { Pressable, StyleSheet, Text } from 'react-native';

import { bordes, colores, espaciado, opacidades, radios, tipografia } from '../theme';

type Variante = 'primario' | 'secundario' | 'terciario';

interface Props {
  etiqueta: string;
  onPress: () => void;
  /**
   * primario: verde, ancho completo. secundario: negro, ajustado al contenido.
   * terciario: blanco con borde verde. (D11 propone otro criterio; no está decidido.)
   */
  variante?: Variante;
  deshabilitado?: boolean;
}

export function Button({ etiqueta, onPress, variante = 'primario', deshabilitado = false }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: deshabilitado }}
      disabled={deshabilitado}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.base,
        estilos[variante],
        (pressed || deshabilitado) && estilos.atenuado,
      ]}
    >
      <Text style={[estilos.texto, variante === 'secundario' && estilos.textoClaro]}>{etiqueta}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    borderRadius: radios.boton,
    paddingVertical: espaciado.m,
    paddingHorizontal: espaciado.l,
    alignItems: 'center',
  },
  primario: { backgroundColor: colores.verde, alignSelf: 'stretch' },
  secundario: { backgroundColor: colores.tinta, alignSelf: 'center' },
  terciario: {
    backgroundColor: colores.blanco,
    borderWidth: bordes.fino,
    borderColor: colores.verde,
    alignSelf: 'stretch',
  },
  atenuado: { opacity: opacidades.atenuado },
  texto: { ...tipografia.boton, color: colores.tinta },
  textoClaro: { color: colores.blanco },
});
