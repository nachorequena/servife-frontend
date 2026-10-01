import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BienvenidaScreen } from '../BienvenidaScreen';
import { espaciado } from '../../../theme';

const metricas = { frame: { x: 0, y: 0, width: 400, height: 800 }, insets: { top: 30, left: 0, right: 0, bottom: 0 } };

test('la banda del logo empieza debajo de la barra de estado', async () => {
  const navigation = { navigate: jest.fn() } as any;
  await render(
    <SafeAreaProvider initialMetrics={metricas}>
      <BienvenidaScreen navigation={navigation} route={{ key: 'b', name: 'Bienvenida' } as any} />
    </SafeAreaProvider>,
  );
  expect(screen.getByTestId('barra-logo')).toHaveStyle({ paddingTop: 30 + espaciado.s });
});
