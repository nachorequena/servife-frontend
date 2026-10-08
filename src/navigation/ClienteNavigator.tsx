import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { Campanita } from '../components/Campanita';
import { DetalleSolicitudScreen } from '../screens/cliente/DetalleSolicitudScreen';
import { FiltrosScreen } from '../screens/cliente/FiltrosScreen';
import { FormularioSolicitudScreen } from '../screens/cliente/FormularioSolicitudScreen';
import { HistorialScreen } from '../screens/cliente/HistorialScreen';
import { InicioScreen } from '../screens/cliente/InicioScreen';
import { PerfilClienteScreen } from '../screens/cliente/PerfilClienteScreen';
import { PerfilPrestadorScreen } from '../screens/cliente/PerfilPrestadorScreen';
import { ValoracionScreen } from '../screens/cliente/ValoracionScreen';
import { AvisosScreen } from '../screens/compartidas/AvisosScreen';
import { ChatScreen } from '../screens/compartidas/ChatScreen';
import { MensajesScreen } from '../screens/compartidas/MensajesScreen';
import { TrabajosRealizadosScreen } from '../screens/compartidas/TrabajosRealizadosScreen';
import { FiltrosProvider } from '../store/filtros';
import { colores } from '../theme';
import { iconoDeTab } from './iconos';
import type { ClienteStackParams, ClienteTabsParams } from './tipos';

const Tab = createBottomTabNavigator<ClienteTabsParams>();
const Stack = createNativeStackNavigator<ClienteStackParams>();

/** Tabs del cliente (D04): Inicio, Mensajes, Historial, Perfil. */
function ClienteTabs() {
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: colores.verde, headerRight: () => <Campanita /> }}>
      <Tab.Screen name="Inicio" component={InicioScreen} options={{ tabBarIcon: iconoDeTab('home') }} />
      <Tab.Screen name="Mensajes" component={MensajesScreen} options={{ tabBarIcon: iconoDeTab('chatbubbles') }} />
      <Tab.Screen name="Historial" component={HistorialScreen} options={{ tabBarIcon: iconoDeTab('time') }} />
      <Tab.Screen name="Perfil" component={PerfilClienteScreen} options={{ tabBarIcon: iconoDeTab('person') }} />
    </Tab.Navigator>
  );
}

/** Las pantallas de detalle se apilan sobre las tabs. */
export function ClienteNavigator() {
  return (
    <FiltrosProvider>
      <Stack.Navigator>
        <Stack.Screen name="Tabs" component={ClienteTabs} options={{ headerShown: false }} />
        <Stack.Screen name="Filtros" component={FiltrosScreen} />
        <Stack.Screen name="PerfilPrestador" component={PerfilPrestadorScreen} options={{ title: 'Prestador' }} />
        <Stack.Screen name="FormularioSolicitud" component={FormularioSolicitudScreen} options={{ title: 'Solicitar servicio' }} />
        <Stack.Screen name="DetalleSolicitud" component={DetalleSolicitudScreen} options={{ title: 'Solicitud' }} />
        <Stack.Screen name="Valoracion" component={ValoracionScreen} options={{ title: 'Valorar' }} />
        <Stack.Screen name="TrabajosRealizados" options={{ title: 'Trabajos realizados' }}>
          {({ route }) => <TrabajosRealizadosScreen soloLectura uuidPrestador={route.params.uuidPrestador} />}
        </Stack.Screen>
        <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="Avisos" component={AvisosScreen} options={{ title: 'Avisos' }} />
      </Stack.Navigator>
    </FiltrosProvider>
  );
}
