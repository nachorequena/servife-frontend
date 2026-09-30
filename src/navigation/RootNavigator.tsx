import { NavigationContainer } from '@react-navigation/native';

import { useSesion } from '../store/sesion';
import { AccesoNavigator } from './AccesoNavigator';
import { ClienteNavigator } from './ClienteNavigator';
import { GestorNavigator } from './GestorNavigator';
import { PrestadorNavigator } from './PrestadorNavigator';

/** Sin sesión, acceso; con sesión, la navegación del rol que viaja en el token. */
export function RootNavigator() {
  const { sesion } = useSesion();
  return (
    <NavigationContainer>
      {sesion === null && <AccesoNavigator />}
      {sesion?.rol === 'CLIENTE' && <ClienteNavigator />}
      {sesion?.rol === 'PRESTADOR' && <PrestadorNavigator />}
      {sesion?.rol === 'GESTOR' && <GestorNavigator />}
    </NavigationContainer>
  );
}
