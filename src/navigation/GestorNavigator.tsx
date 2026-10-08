import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { Campanita } from '../components/Campanita';
import { AvisosScreen } from '../screens/compartidas/AvisosScreen';
import { DashboardScreen } from '../screens/gestor/DashboardScreen';
import { FormularioTipoServicio } from '../screens/gestor/FormularioTipoServicio';
import { PerfilGestorScreen } from '../screens/gestor/PerfilGestorScreen';
import { ServiciosScreen } from '../screens/gestor/ServiciosScreen';
import { ValidacionesScreen } from '../screens/gestor/ValidacionesScreen';
import { colores } from '../theme';
import { iconoDeTab } from './iconos';
import type { GestorStackParams, GestorTabsParams } from './tipos';

const Tab = createBottomTabNavigator<GestorTabsParams>();
const Stack = createNativeStackNavigator<GestorStackParams>();

/**
 * Tabs del gestor. Las del prototipo de Figma son Dashboard, Validaciones y Perfil: D04 no las
 * enumera, están pendientes de confirmar (servife-ia/.ai/06-roadmap.md). "Servicios" (CU13) es
 * provisoria: no tiene maqueta. Faltan las pantallas de gestión de usuarios (CU12, CU15–17).
 */
function GestorTabs() {
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: colores.lila, headerRight: () => <Campanita /> }}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarIcon: iconoDeTab('stats-chart') }} />
      <Tab.Screen name="Validaciones" component={ValidacionesScreen} options={{ tabBarIcon: iconoDeTab('shield-checkmark') }} />
      <Tab.Screen name="Servicios" component={ServiciosScreen} options={{ tabBarIcon: iconoDeTab('construct') }} />
      <Tab.Screen name="Perfil" component={PerfilGestorScreen} options={{ tabBarIcon: iconoDeTab('person') }} />
    </Tab.Navigator>
  );
}

/** Panel del gestor dentro de la app, protegido por rol. La navegación del gestor es lila. */
export function GestorNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={GestorTabs} options={{ headerShown: false }} />
      <Stack.Screen name="FormularioTipoServicio" component={FormularioTipoServicio} options={{ title: 'Tipo de servicio' }} />
      <Stack.Screen name="Avisos" component={AvisosScreen} options={{ title: 'Avisos' }} />
    </Stack.Navigator>
  );
}
