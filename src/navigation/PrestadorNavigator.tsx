import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ChatScreen } from '../screens/compartidas/ChatScreen';
import { MensajesScreen } from '../screens/compartidas/MensajesScreen';
import { TrabajosRealizadosScreen } from '../screens/compartidas/TrabajosRealizadosScreen';
import { DetalleTrabajoScreen } from '../screens/prestador/DetalleTrabajoScreen';
import { NuevoTrabajoScreen } from '../screens/prestador/NuevoTrabajoScreen';
import { PerfilPropioScreen } from '../screens/prestador/PerfilPropioScreen';
import { SolicitudesScreen } from '../screens/prestador/SolicitudesScreen';
import { colores } from '../theme';
import type { PrestadorStackParams, PrestadorTabsParams } from './tipos';

const Tab = createBottomTabNavigator<PrestadorTabsParams>();
const Stack = createNativeStackNavigator<PrestadorStackParams>();

/** Tabs del prestador (D04): Solicitudes, Mensajes, Trabajos, Perfil. */
function PrestadorTabs() {
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: colores.verde }}>
      <Tab.Screen name="Solicitudes" component={SolicitudesScreen} />
      <Tab.Screen name="Mensajes" component={MensajesScreen} />
      <Tab.Screen name="Trabajos">{() => <TrabajosRealizadosScreen soloLectura={false} />}</Tab.Screen>
      <Tab.Screen name="Perfil" component={PerfilPropioScreen} />
    </Tab.Navigator>
  );
}

export function PrestadorNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={PrestadorTabs} options={{ headerShown: false }} />
      <Stack.Screen name="NuevoTrabajo" component={NuevoTrabajoScreen} options={{ title: 'Nuevo trabajo' }} />
      <Stack.Screen name="DetalleTrabajo" component={DetalleTrabajoScreen} options={{ title: 'Trabajo' }} />
      <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  );
}
