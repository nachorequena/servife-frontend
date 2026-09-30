import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { BienvenidaScreen } from '../screens/acceso/BienvenidaScreen';
import { IngresarScreen } from '../screens/acceso/IngresarScreen';
import { RegistroScreen } from '../screens/acceso/RegistroScreen';
import type { AccesoParams } from './tipos';

const Stack = createNativeStackNavigator<AccesoParams>();

/** Sin sesión: bienvenida, login único para los tres roles y registro. */
export function AccesoNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Bienvenida" component={BienvenidaScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Ingresar" component={IngresarScreen} options={{ title: 'Ingresar' }} />
      <Stack.Screen name="Registro" component={RegistroScreen} options={{ title: 'Registro' }} />
    </Stack.Navigator>
  );
}
