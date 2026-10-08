import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ChatScreen } from '../screens/compartidas/ChatScreen';
import { MensajesScreen } from '../screens/compartidas/MensajesScreen';
import { TrabajosRealizadosScreen } from '../screens/compartidas/TrabajosRealizadosScreen';
import { DetalleTrabajoScreen } from '../screens/prestador/DetalleTrabajoScreen';
import { NuevoTrabajoScreen } from '../screens/prestador/NuevoTrabajoScreen';
import { PerfilPropioScreen } from '../screens/prestador/PerfilPropioScreen';
import { SolicitudesScreen } from '../screens/prestador/SolicitudesScreen';
import { Campanita } from '../components/Campanita';
import { AvisosScreen } from '../screens/compartidas/AvisosScreen';
import { colores } from '../theme';
import { iconoDeTab } from './iconos';
import type { PrestadorStackParams, PrestadorTabsParams } from './tipos';

const Tab = createBottomTabNavigator<PrestadorTabsParams>();
const Stack = createNativeStackNavigator<PrestadorStackParams>();

/** Tabs del prestador (D04): Solicitudes, Mensajes, Trabajos, Perfil. */
function PrestadorTabs() {
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: colores.verde, headerRight: () => <Campanita /> }}>
      <Tab.Screen name="Solicitudes" component={SolicitudesScreen} options={{ tabBarIcon: iconoDeTab('clipboard') }} />
      <Tab.Screen name="Mensajes" component={MensajesScreen} options={{ tabBarIcon: iconoDeTab('chatbubbles') }} />
      <Tab.Screen name="Trabajos" options={{ tabBarIcon: iconoDeTab('briefcase') }}>
        {() => <TrabajosRealizadosScreen soloLectura={false} />}
      </Tab.Screen>
      <Tab.Screen name="Perfil" component={PerfilPropioScreen} options={{ tabBarIcon: iconoDeTab('person') }} />
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
        <Stack.Screen name="Avisos" component={AvisosScreen} options={{ title: 'Avisos' }} />
    </Stack.Navigator>
  );
}
