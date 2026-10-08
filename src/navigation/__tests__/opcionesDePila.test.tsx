import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colores } from '../../theme';
import { useOpcionesDePila } from '../opcionesDePila';

const metricas = { frame: { x: 0, y: 0, width: 400, height: 800 }, insets: { top: 30, left: 0, right: 0, bottom: 48 } };

async function opciones() {
  let resultado: ReturnType<typeof useOpcionesDePila> | undefined;
  function Sonda() {
    resultado = useOpcionesDePila();
    return null;
  }
  await render(
    <SafeAreaProvider initialMetrics={metricas}>
      <Sonda />
    </SafeAreaProvider>,
  );
  return resultado!;
}

test('las pantallas del stack dejan lugar para los botones del sistema', async () => {
  const deRuta = await opciones();
  expect(deRuta({ route: { name: 'Registro' } })).toEqual({
    contentStyle: { paddingBottom: 48, backgroundColor: colores.fondo },
  });
});

test('las pestañas no suman espacio: la barra de pestañas ya lo deja', async () => {
  const deRuta = await opciones();
  expect(deRuta({ route: { name: 'Tabs' } })).toEqual({});
});
