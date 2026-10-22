import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { IngresarScreen } from '../screens/acceso/IngresarScreen';
import { RecuperarScreen } from '../screens/acceso/RecuperarScreen';
import { RegistroScreen } from '../screens/acceso/RegistroScreen';
import { RestablecerScreen } from '../screens/acceso/RestablecerScreen';
import { useOpcionesDePila } from './opcionesDePila';
import type { AccesoParams } from './tipos';

const Stack = createNativeStackNavigator<AccesoParams>();

/** Sin sesión: login único para los tres roles (la primera pantalla), registro y recuperación. */
export function AccesoNavigator() {
  const opcionesDePila = useOpcionesDePila();
  return (
    <Stack.Navigator screenOptions={opcionesDePila}>
      <Stack.Screen name="Ingresar" component={IngresarScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Registro" component={RegistroScreen} options={{ title: 'Registro' }} />
      <Stack.Screen name="Recuperar" component={RecuperarScreen} options={{ title: 'Recuperar contraseña' }} />
      <Stack.Screen name="Restablecer" component={RestablecerScreen} options={{ title: 'Nueva contraseña' }} />
    </Stack.Navigator>
  );
}
