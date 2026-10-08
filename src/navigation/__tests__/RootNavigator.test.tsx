import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { iniciarSesion, obtenerSesion, type Usuario } from '../../api/identidad';
import { ProveedorDeSesion } from '../../store/sesion';
import { RootNavigator } from '../RootNavigator';

jest.mock('../../api/identidad');
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Como en App.tsx, la app corre dentro de SafeAreaProvider (los stacks usan los insets).
const metricas = { frame: { x: 0, y: 0, width: 400, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

function renderApp() {
  return render(
    <SafeAreaProvider initialMetrics={metricas}>
      <ProveedorDeSesion>
        <RootNavigator />
      </ProveedorDeSesion>
    </SafeAreaProvider>,
  );
}

async function entrarComo(rol: Usuario['rol']) {
  (iniciarSesion as jest.Mock).mockResolvedValue({ accessToken: 'a', refreshToken: 'r', rol });
  (obtenerSesion as jest.Mock).mockResolvedValue({
    uuid: 'u-1',
    rol,
    nombreApellido: 'Ana Pérez',
    email: 'ana@mail.com',
    telefono: null,
    direccion: null,
    fecNacimiento: null,
    estadoValidacion: null,
  });
  await renderApp();
  await fireEvent.press(await screen.findByRole('button', { name: 'Cliente' }));
  const usuario = userEvent.setup();
  await usuario.type(await screen.findByLabelText('Correo'), 'ana@mail.com');
  await usuario.type(screen.getByLabelText('Contraseña'), 'Clave123');
  await usuario.press(screen.getByRole('button', { name: 'Continuar' }));
}

/** Tabs por rol según D04 (servife-ia/.ai/09-ux-ui.md §Navegación). */
describe('navegación por rol', () => {
  it('sin sesión muestra la bienvenida', async () => {
    await renderApp();
    expect(await screen.findByText('Ingreso como administrador')).toBeTruthy();
  });

  it('el cliente ve Inicio, Mensajes, Historial y Perfil', async () => {
    await entrarComo('CLIENTE');
    for (const tab of ['Inicio', 'Mensajes', 'Historial', 'Perfil']) {
      expect(await screen.findByRole('button', { name: new RegExp(`^${tab}`) })).toBeTruthy();
    }
  });

  it('el prestador ve Solicitudes, Mensajes, Trabajos y Perfil', async () => {
    await entrarComo('PRESTADOR');
    for (const tab of ['Solicitudes', 'Mensajes', 'Trabajos', 'Perfil']) {
      expect(await screen.findByRole('button', { name: new RegExp(`^${tab}`) })).toBeTruthy();
    }
  });

  it('el gestor ve Dashboard, Validaciones y Perfil', async () => {
    await entrarComo('GESTOR');
    for (const tab of ['Dashboard', 'Validaciones', 'Perfil']) {
      expect(await screen.findByRole('button', { name: new RegExp(`^${tab}`) })).toBeTruthy();
    }
  });

  it('las pestañas no muestran el ícono faltante', async () => {
    await entrarComo('CLIENTE');
    expect(await screen.findByRole('button', { name: /^Inicio/ })).toBeTruthy();
    expect(screen.queryByText('⏷')).toBeNull();
  });
});
