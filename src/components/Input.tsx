import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { bordes, colores, espaciado, radios, tipografia } from '../theme';

interface Props extends Omit<TextInputProps, 'style'> {
  /** Label visible además del placeholder: el placeholder desaparece al escribir (09-ux-ui). */
  etiqueta: string;
  /** Mensaje de error del campo; con ApiError.errorDe(campo) sale del 400 del backend. */
  error?: string;
}

export function Input({ etiqueta, error, ...props }: Props) {
  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <TextInput
        accessibilityLabel={etiqueta}
        placeholderTextColor={colores.tintaSecundaria}
        style={[estilos.input, error !== undefined && estilos.inputConError]}
        {...props}
      />
      {error !== undefined && <Text style={estilos.error}>{error}</Text>}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { marginBottom: espaciado.m },
  etiqueta: { ...tipografia.cuerpo, color: colores.tinta, marginBottom: espaciado.xs },
  input: {
    ...tipografia.cuerpo,
    color: colores.tinta,
    backgroundColor: colores.blanco,
    borderWidth: bordes.fino,
    borderColor: colores.tinta,
    borderRadius: radios.input,
    paddingHorizontal: espaciado.m,
    paddingVertical: espaciado.s,
  },
  // TODO(D11): la maqueta no tiene color de error; hasta que se defina, el error se marca con texto.
  inputConError: { borderColor: colores.tinta },
  error: { ...tipografia.cuerpo, color: colores.tinta, marginTop: espaciado.xs },
});
