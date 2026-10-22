import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ProveedorDeAvisosFlotantes } from './src/components';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ProveedorDeSesion } from './src/store/sesion';

export default function App() {
  return (
    <SafeAreaProvider>
      <ProveedorDeSesion>
        <ProveedorDeAvisosFlotantes>
          <RootNavigator />
        </ProveedorDeAvisosFlotantes>
        <StatusBar style="dark" />
      </ProveedorDeSesion>
    </SafeAreaProvider>
  );
}
