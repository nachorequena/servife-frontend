import { fireEvent, render, screen } from '@testing-library/react-native';

import { ProveedorDeSesion } from '../../store/sesion';
import { RootNavigator } from '../RootNavigator';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

function renderApp() {
  return render(
    <ProveedorDeSesion>
      <RootNavigator />
    </ProveedorDeSesion>,
  );
}

async function entrarComo(rol: string) {
  await renderApp();
  await fireEvent.press(await screen.findByRole('button', { name: 'Cliente' }));
  await fireEvent.press(await screen.findByRole('button', { name: `Entrar como ${rol}` }));
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
});
