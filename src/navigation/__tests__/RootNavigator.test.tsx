import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';

import { iniciarSesion, obtenerSesion, type Usuario } from '../../api/identidad';
import { ProveedorDeSesion } from '../../store/sesion';
import { RootNavigator } from '../RootNavigator';

jest.mock('../../api/identidad');
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
