import { act, render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import { iniciarSesion, obtenerSesion, type Usuario } from '../../api/identidad';
import { ApiError } from '../../api/errores';
import { guardarTokens, limpiarTokens, obtenerRefreshToken } from '../../api/tokens';
import { ProveedorDeSesion, useSesion } from '../sesion';

jest.mock('../../api/identidad');
jest.mock('../../api/tokens');

const usuario: Usuario = {
  uuid: 'u-1',
  rol: 'PRESTADOR',
  nombreApellido: 'Ana Pérez',
  email: 'ana@mail.com',
  telefono: null,
  direccion: null,
  fecNacimiento: null,
  estadoValidacion: 'PENDIENTE',
};

let valor: ReturnType<typeof useSesion>;
function Sonda() {
  valor = useSesion();
  return <Text>{valor.restaurando ? 'restaurando' : (valor.sesion?.rol ?? 'sin sesión')}</Text>;
}

async function montar() {
  await render(
    <ProveedorDeSesion>
      <Sonda />
    </ProveedorDeSesion>,
  );
}

beforeEach(() => {
  jest.resetAllMocks();
  (limpiarTokens as jest.Mock).mockResolvedValue(undefined);
  (guardarTokens as jest.Mock).mockResolvedValue(undefined);
});

describe('restauración al abrir', () => {
  it('sin refresh guardado queda sin sesión y no llama a A4', async () => {
    (obtenerRefreshToken as jest.Mock).mockResolvedValue(null);
    await montar();
    expect(await screen.findByText('sin sesión')).toBeTruthy();
    expect(obtenerSesion).not.toHaveBeenCalled();
  });

  it('con refresh guardado y A4 ok abre la sesión del rol', async () => {
    (obtenerRefreshToken as jest.Mock).mockResolvedValue('r1');
    (obtenerSesion as jest.Mock).mockResolvedValue(usuario);
    await montar();
    expect(await screen.findByText('PRESTADOR')).toBeTruthy();
    expect(valor.sesion?.usuario).toEqual(usuario);
  });

  it.each([401, 403])('A4 con %s deja sin sesión y limpia los tokens', async (status) => {
    (obtenerRefreshToken as jest.Mock).mockResolvedValue('r1');
    (obtenerSesion as jest.Mock).mockRejectedValue(new ApiError(status, 'REFRESH_INVALIDO', 'x'));
    await montar();
    expect(await screen.findByText('sin sesión')).toBeTruthy();
    expect(limpiarTokens).toHaveBeenCalled();
  });

  it('un error de red deja sin sesión pero conserva el refresh', async () => {
    (obtenerRefreshToken as jest.Mock).mockResolvedValue('r1');
    (obtenerSesion as jest.Mock).mockRejectedValue(new TypeError('Network request failed'));
    await montar();
    expect(await screen.findByText('sin sesión')).toBeTruthy();
    expect(limpiarTokens).not.toHaveBeenCalled();
  });

  it('un 500 tampoco borra el refresh', async () => {
    (obtenerRefreshToken as jest.Mock).mockResolvedValue('r1');
    (obtenerSesion as jest.Mock).mockRejectedValue(new ApiError(500, 'ERROR_INTERNO', 'x'));
    await montar();
    expect(await screen.findByText('sin sesión')).toBeTruthy();
    expect(limpiarTokens).not.toHaveBeenCalled();
  });
});

describe('ingresar y cerrar', () => {
  beforeEach(() => (obtenerRefreshToken as jest.Mock).mockResolvedValue(null));

  it('ingresar guarda los tokens, carga el usuario y abre la sesión', async () => {
    (iniciarSesion as jest.Mock).mockResolvedValue({ accessToken: 'a', refreshToken: 'r', rol: 'PRESTADOR' });
    (obtenerSesion as jest.Mock).mockResolvedValue(usuario);
    await montar();
    await screen.findByText('sin sesión');
    await act(() => valor.ingresar('ana@mail.com', 'Clave123'));
    expect(iniciarSesion).toHaveBeenCalledWith({ email: 'ana@mail.com', contrasenia: 'Clave123' });
    expect(guardarTokens).toHaveBeenCalledWith({ accessToken: 'a', refreshToken: 'r' });
    expect(valor.sesion).toEqual({ rol: 'PRESTADOR', usuario });
  });

  it('si A4 falla tras el login, limpia los tokens y relanza', async () => {
    (iniciarSesion as jest.Mock).mockResolvedValue({ accessToken: 'a', refreshToken: 'r', rol: 'PRESTADOR' });
    const fallo = new TypeError('red');
    (obtenerSesion as jest.Mock).mockRejectedValue(fallo);
    await montar();
    await screen.findByText('sin sesión');
    let lanzado: unknown;
    await act(async () => {
      await valor.ingresar('a@b.com', 'x').catch((e) => (lanzado = e));
    });
    expect(lanzado).toBe(fallo);
    expect(limpiarTokens).toHaveBeenCalled();
    expect(valor.sesion).toBeNull();
  });

  it('cerrar limpia tokens y sesión; actualizarUsuario reemplaza el usuario', async () => {
    (iniciarSesion as jest.Mock).mockResolvedValue({ accessToken: 'a', refreshToken: 'r', rol: 'PRESTADOR' });
    (obtenerSesion as jest.Mock).mockResolvedValue(usuario);
    await montar();
    await screen.findByText('sin sesión');
    await act(() => valor.ingresar('a@b.com', 'x'));
    await act(async () => valor.actualizarUsuario({ ...usuario, nombreApellido: 'Ana M.' }));
    expect(valor.sesion?.usuario.nombreApellido).toBe('Ana M.');
    await act(() => valor.cerrar());
    await waitFor(() => expect(valor.sesion).toBeNull());
    expect(limpiarTokens).toHaveBeenCalled();
  });
});
