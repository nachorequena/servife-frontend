import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { bordes, colores, espaciado, radios, tamanios, tipografia } from '../theme';

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
        style={[estilos.campo, error !== undefined && estilos.campoConError]}
      >
        <Text style={valor ? estilos.valor : estilos.placeholder}>{valor || placeholder}</Text>
      </Pressable>
      {error !== undefined && (
        <View style={estilos.filaError}>
          <Ionicons name="alert-circle" size={tamanios.iconoChico} color={colores.rojo} />
          <Text style={estilos.error}>{error}</Text>
        </View>
      )}
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
  // Igual que Input (bloque A de diseño): el error se marca en rojo, con ícono y texto.
  campoConError: { borderColor: colores.rojo },
  filaError: { flexDirection: 'row', alignItems: 'center', gap: espaciado.xs, marginTop: espaciado.xs },
  error: { ...tipografia.cuerpo, color: colores.rojo, flex: 1 },
});
