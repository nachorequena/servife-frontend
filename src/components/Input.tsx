import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import type { NombreDeIcono } from '../navigation/iconos';
import { bordes, colores, espaciado, radios, tamanios, tipografia } from '../theme';

interface Props extends Omit<TextInputProps, 'style'> {
  /** Label visible además del placeholder: el placeholder desaparece al escribir (09-ux-ui). */
  etiqueta: string;
  /** Mensaje de error del campo; con ApiError.errorDe(campo) sale del 400 del backend. */
  error?: string;
  /** Ícono de Ionicons dentro del campo, a la izquierda (por ejemplo, mail-outline). */
  icono?: NombreDeIcono;
  /** Con secureTextEntry, muestra un ojo para ver u ocultar lo que se escribe (contraseñas). */
  mostrarOcultar?: boolean;
}

export function Input({ etiqueta, error, icono, mostrarOcultar = false, secureTextEntry, ...props }: Props) {
  const [visible, setVisible] = useState(false);
  const conError = error !== undefined;
  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <View style={[estilos.caja, conError && estilos.cajaConError]}>
        {icono !== undefined && (
          <Ionicons name={icono} size={tamanios.iconoChico} color={conError ? colores.rojo : colores.tintaSecundaria} />
        )}
        <TextInput
          accessibilityLabel={etiqueta}
          placeholderTextColor={colores.tintaSecundaria}
          style={estilos.input}
          secureTextEntry={secureTextEntry && !visible}
          {...props}
        />
        {secureTextEntry && mostrarOcultar && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            hitSlop={espaciado.s}
            onPress={() => setVisible((v) => !v)}
          >
            <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={tamanios.icono} color={colores.tintaSecundaria} />
          </Pressable>
        )}
      </View>
      {conError && (
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
  caja: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.s,
    backgroundColor: colores.blanco,
    borderWidth: bordes.fino,
    borderColor: colores.tinta,
    borderRadius: radios.input,
    paddingHorizontal: espaciado.m,
  },
  // Bloque A de diseño: el error se marca en rojo, con ícono y texto (antes solo con texto, esperando D11).
  cajaConError: { borderColor: colores.rojo },
  input: { ...tipografia.cuerpo, color: colores.tinta, flex: 1, paddingVertical: espaciado.s },
  filaError: { flexDirection: 'row', alignItems: 'center', gap: espaciado.xs, marginTop: espaciado.xs },
  error: { ...tipografia.cuerpo, color: colores.rojo, flex: 1 },
});
