import { ScrollView, StyleSheet } from 'react-native';

import { colores } from '../../theme';
import { MiCuenta } from './MiCuenta';

/** Pantalla provisoria "Mi cuenta" (D10) · CU03 · A4, A6, A7. La usan Cliente y Gestor. */
export function MiCuentaScreen() {
  return (
    <ScrollView contentContainerStyle={estilos.contenedor} keyboardShouldPersistTaps="handled">
      <MiCuenta />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flexGrow: 1, backgroundColor: colores.fondo },
});
