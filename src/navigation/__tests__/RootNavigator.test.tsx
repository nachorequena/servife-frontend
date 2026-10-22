import { render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ApiError } from '../../api/errores';
import { iniciarSesion, obtenerSesion, type Usuario } from '../../api/identidad';
import { ProveedorDeSesion } from '../../store/sesion';
import { RootNavigator } from '../RootNavigator';

jest.mock('../../api/identidad');
jest.mock('expo-secure-store', () => ({
  canUseBiometricAuthentication: jest.fn(() => false),
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
  const usuario = userEvent.setup();
  await usuario.type(await screen.findByLabelText('Correo'), 'ana@mail.com');
  await usuario.type(screen.getByLabelText('Contraseña'), 'Clave123');
  await usuario.press(screen.getByRole('button', { name: 'Continuar' }));
}

/** Tabs por rol según D04 (servife-ia/.ai/09-ux-ui.md §Navegación). */
describe('navegación por rol', () => {
  it('sin sesión abre directo en el inicio de sesión, sin selector de rol', async () => {
    await renderApp();
    expect(await screen.findByText('Inicio de sesión')).toBeTruthy();
    expect(screen.queryByText('Ingreso como administrador')).toBeNull();
    expect(screen.queryByText('¿Cómo querés acceder hoy?')).toBeNull();
  });

  it('con cuenta de cliente y de prestador pregunta y entra con la elegida (D43)', async () => {
    (iniciarSesion as jest.Mock)
      .mockRejectedValueOnce(new ApiError(409, 'ELEGIR_ROL', 'Elegí con cuál ingresar.'))
      .mockResolvedValueOnce({ accessToken: 'a', refreshToken: 'r', rol: 'PRESTADOR' });
    (obtenerSesion as jest.Mock).mockResolvedValue({
      uuid: 'u-1', rol: 'PRESTADOR', nombreApellido: 'Ana Pérez', email: 'ana@mail.com',
      telefono: null, direccion: null, fecNacimiento: null, estadoValidacion: 'PENDIENTE',
    });
    await renderApp();
    const usuario = userEvent.setup();
    await usuario.type(await screen.findByLabelText('Correo'), 'ana@mail.com');
    await usuario.type(screen.getByLabelText('Contraseña'), 'Clave123');
    await usuario.press(screen.getByRole('button', { name: 'Continuar' }));
    await usuario.press(await screen.findByRole('button', { name: 'Prestador' }));

    expect(iniciarSesion).toHaveBeenLastCalledWith({ email: 'ana@mail.com', contrasenia: 'Clave123', rol: 'PRESTADOR' });
    expect(await screen.findByRole('button', { name: /^Solicitudes/ })).toBeTruthy();
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

  it('el gestor ve Dashboard, Validaciones, Usuarios, Servicios y Perfil', async () => {
    await entrarComo('GESTOR');
    for (const tab of ['Dashboard', 'Validaciones', 'Usuarios', 'Servicios', 'Perfil']) {
      expect(await screen.findByRole('button', { name: new RegExp(`^${tab}`) })).toBeTruthy();
    }
  });

  it('las pestañas no muestran el ícono faltante', async () => {
    await entrarComo('CLIENTE');
    expect(await screen.findByRole('button', { name: /^Inicio/ })).toBeTruthy();
    expect(screen.queryByText('⏷')).toBeNull();
  });
});
