import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ProveedorDeAvisosFlotantes } from '../components/AvisoFlotante';

const metricas = { frame: { x: 0, y: 0, width: 400, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

/**
 * Renderiza una pantalla como en App.tsx: dentro del área segura y con el proveedor de avisos flotantes, así
 * los tests pueden ver los avisos (findByText) y las hojas inferiores, que usan los insets.
 */
export function renderPantalla(pantalla: ReactElement) {
  return render(
    <SafeAreaProvider initialMetrics={metricas}>
      <ProveedorDeAvisosFlotantes>{pantalla}</ProveedorDeAvisosFlotantes>
    </SafeAreaProvider>,
  );
}
