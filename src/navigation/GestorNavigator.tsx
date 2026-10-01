import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { DashboardScreen } from '../screens/gestor/DashboardScreen';
import { PerfilGestorScreen } from '../screens/gestor/PerfilGestorScreen';
import { ValidacionesScreen } from '../screens/gestor/ValidacionesScreen';
import { colores } from '../theme';
import { iconoDeTab } from './iconos';
import type { GestorTabsParams } from './tipos';

const Tab = createBottomTabNavigator<GestorTabsParams>();

/**
 * Panel del gestor dentro de la app, protegido por rol. La navegación del gestor es lila.
 * Tabs del prototipo de Figma (Dashboard, Validaciones, Perfil): D04 no las enumera, están
 * pendientes de confirmar (servife-ia/.ai/06-roadmap.md). Faltan las pantallas de gestión de
 * usuarios (CU12, CU15–17) y de tipos de servicio (CU13), que no tienen maqueta.
 */
export function GestorNavigator() {
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: colores.lila }}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarIcon: iconoDeTab('stats-chart') }} />
      <Tab.Screen name="Validaciones" component={ValidacionesScreen} options={{ tabBarIcon: iconoDeTab('shield-checkmark') }} />
      <Tab.Screen name="Perfil" component={PerfilGestorScreen} options={{ tabBarIcon: iconoDeTab('person') }} />
    </Tab.Navigator>
  );
}
