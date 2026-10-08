import { render, screen, userEvent } from '@testing-library/react-native';
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

test('"Prestador" abre el inicio de sesión como prestador', async () => {
  const navigation = { navigate: jest.fn() } as any;
  await render(
    <SafeAreaProvider initialMetrics={metricas}>
      <BienvenidaScreen navigation={navigation} route={{ key: 'b', name: 'Bienvenida' } as any} />
    </SafeAreaProvider>,
  );
  await userEvent.setup().press(screen.getByRole('button', { name: 'Prestador' }));
  expect(navigation.navigate).toHaveBeenCalledWith('Ingresar', { rol: 'PRESTADOR' });
});

test('"Cliente" y "Ingreso como administrador" abren el inicio de sesión con su rol', async () => {
  const navigation = { navigate: jest.fn() } as any;
  await render(
    <SafeAreaProvider initialMetrics={metricas}>
      <BienvenidaScreen navigation={navigation} route={{ key: 'b', name: 'Bienvenida' } as any} />
    </SafeAreaProvider>,
  );
  const usuario = userEvent.setup();
  await usuario.press(screen.getByRole('button', { name: 'Cliente' }));
  expect(navigation.navigate).toHaveBeenCalledWith('Ingresar', { rol: 'CLIENTE' });
  await usuario.press(screen.getByRole('link', { name: 'Ingreso como administrador' }));
  expect(navigation.navigate).toHaveBeenCalledWith('Ingresar', { rol: 'GESTOR' });
});
