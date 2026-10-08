import { NavigationContainer } from '@react-navigation/native';
import { StyleSheet, View } from 'react-native';

import { useSesion } from '../store/sesion';
import { colores } from '../theme';
import { AccesoNavigator } from './AccesoNavigator';
import { ClienteNavigator } from './ClienteNavigator';
import { GestorNavigator } from './GestorNavigator';
import { PrestadorNavigator } from './PrestadorNavigator';

/** Sin sesión, acceso; con sesión, la navegación del rol de la cuenta. Mientras restaura, solo el fondo. */
export function RootNavigator() {
  const { sesion, restaurando } = useSesion();
  if (restaurando) {
    return <View style={estilos.fondo} />;
  }
  return (
    <NavigationContainer>
      {sesion === null && <AccesoNavigator />}
      {sesion?.rol === 'CLIENTE' && <ClienteNavigator />}
      {sesion?.rol === 'PRESTADOR' && <PrestadorNavigator />}
      {sesion?.rol === 'GESTOR' && <GestorNavigator />}
    </NavigationContainer>
  );
}

const estilos = StyleSheet.create({ fondo: { flex: 1, backgroundColor: colores.fondo } });
