import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colores, espaciado, radios, tipografia } from '../theme';

interface Props {
  visible: boolean;
  alCerrar: () => void;
  titulo?: string;
  children: ReactNode;
}

/**
 * Hoja que sube desde abajo sobre un velo oscuro (filtros, menú de acciones, un motivo). Tocar el velo o el
 * botón Atrás de Android la cierra. Sube con el teclado.
 */
export function HojaInferior({ visible, alCerrar, titulo, children }: Props) {
  const { bottom } = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={alCerrar} statusBarTranslucent>
      <KeyboardAvoidingView style={estilos.velo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={estilos.areaParaCerrar} accessibilityLabel="Cerrar" onPress={alCerrar} testID="hoja-velo" />
        <View style={[estilos.hoja, { paddingBottom: bottom + espaciado.l }]} testID="hoja-inferior">
          <View style={estilos.manija} />
          {titulo !== undefined && (
            <Text style={estilos.titulo} accessibilityRole="header">
              {titulo}
            </Text>
          )}
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  velo: { flex: 1, backgroundColor: colores.velo, justifyContent: 'flex-end' },
  areaParaCerrar: { flex: 1 },
  hoja: {
    backgroundColor: colores.blanco,
    borderTopLeftRadius: radios.hoja,
    borderTopRightRadius: radios.hoja,
    paddingHorizontal: espaciado.l,
    paddingTop: espaciado.s,
    gap: espaciado.m,
  },
  manija: {
    alignSelf: 'center',
    width: espaciado.xl + espaciado.s,
    height: espaciado.xs,
    borderRadius: radios.pill,
    backgroundColor: colores.bordeSuave,
    marginBottom: espaciado.s,
  },
  titulo: { ...tipografia.seccion, color: colores.tinta },
});
