import { Pressable, StyleSheet, Text, View } from 'react-native';

import { bordes, colores, espaciado, radios, tipografia } from '../theme';

interface Props {
  etiqueta: string;
  /** Texto elegido; sin valor se muestra el placeholder. */
  valor?: string;
  placeholder: string;
  onPress: () => void;
  error?: string;
}

/** Campo de solo lectura con el aspecto de Input que abre un selector nativo (fecha u hora). */
export function CampoDeSeleccion({ etiqueta, valor, placeholder, onPress, error }: Props) {
  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={etiqueta}
        onPress={onPress}
        style={estilos.campo}
      >
        <Text style={valor ? estilos.valor : estilos.placeholder}>{valor || placeholder}</Text>
      </Pressable>
      {error !== undefined && <Text style={estilos.error}>{error}</Text>}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { marginBottom: espaciado.m },
  etiqueta: { ...tipografia.cuerpo, color: colores.tinta, marginBottom: espaciado.xs },
  campo: {
    backgroundColor: colores.blanco,
    borderWidth: bordes.fino,
    borderColor: colores.tinta,
    borderRadius: radios.input,
    paddingHorizontal: espaciado.m,
    paddingVertical: espaciado.s,
  },
  valor: { ...tipografia.cuerpo, color: colores.tinta },
  placeholder: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
  // TODO(D11): la maqueta no tiene color de error; hasta que se defina, el error se marca con texto.
  error: { ...tipografia.cuerpo, color: colores.tinta, marginTop: espaciado.xs },
});
