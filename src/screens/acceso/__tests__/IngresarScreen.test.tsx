import { render, screen, userEvent } from '@testing-library/react-native';

import { ApiError } from '../../../api/errores';
import { IngresarScreen } from '../IngresarScreen';

const mockIngresar = jest.fn();
jest.mock('../../../store/sesion', () => ({ useSesion: () => ({ ingresar: mockIngresar }) }));

const navigation = { navigate: jest.fn() } as any;

async function montar(params?: { aviso?: string; rol?: 'CLIENTE' | 'PRESTADOR' }) {
  await render(<IngresarScreen navigation={navigation} route={{ key: 'i', name: 'Ingresar', params } as any} />);
}

async function completar(correo: string, contrasenia: string) {
  const usuario = userEvent.setup();
  await usuario.type(screen.getByLabelText('Correo'), correo);
  await usuario.type(screen.getByLabelText('Contraseña'), contrasenia);
  await usuario.press(screen.getByRole('button', { name: 'Continuar' }));
}

beforeEach(() => {
  mockIngresar.mockReset();
  navigation.navigate.mockReset();
});

describe('IngresarScreen', () => {
  it('ya no ofrece atajos "Entrar como"', async () => {
    await montar();
    expect(screen.queryByText(/Entrar como/)).toBeNull();
  });

  it('muestra el aviso que llega por parámetro', async () => {
    await montar({ aviso: 'Contraseña actualizada.' });
    expect(screen.getByText('Contraseña actualizada.')).toBeTruthy();
  });

  it('envía correo y contraseña a mockIngresar', async () => {
    mockIngresar.mockResolvedValue(undefined);
    await montar();
    await completar('ana@mail.com', 'Clave123');
    expect(mockIngresar).toHaveBeenCalledWith('ana@mail.com', 'Clave123');
  });

  it('credenciales inválidas muestran el mensaje del backend', async () => {
    mockIngresar.mockRejectedValue(
      new ApiError(401, 'CREDENCIALES_INVALIDAS', 'El correo o la contraseña no son correctos.'),
    );
    await montar();
    await completar('ana@mail.com', 'mala');
    expect(await screen.findByText('El correo o la contraseña no son correctos.')).toBeTruthy();
  });

  it('cuenta suspendida muestra el mensaje del backend', async () => {
    mockIngresar.mockRejectedValue(new ApiError(403, 'CUENTA_SUSPENDIDA', 'Tu cuenta está suspendida.'));
    await montar();
    await completar('ana@mail.com', 'Clave123');
    expect(await screen.findByText('Tu cuenta está suspendida.')).toBeTruthy();
  });

  it('los errores de validación van debajo de cada campo', async () => {
    mockIngresar.mockRejectedValue(
      new ApiError(400, 'VALIDACION', 'Datos inválidos.', [{ campo: 'email', detalle: 'Correo inválido.' }]),
    );
    await montar();
    await completar('x', 'Clave123');
    expect(await screen.findByText('Correo inválido.')).toBeTruthy();
  });

  it('un error de red muestra un mensaje genérico', async () => {
    mockIngresar.mockRejectedValue(new TypeError('Network request failed'));
    await montar();
    await completar('ana@mail.com', 'Clave123');
    expect(await screen.findByText('No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.')).toBeTruthy();
  });

  it('los enlaces llevan a Recuperar y a Registro como cliente', async () => {
    await montar();
    const usuario = userEvent.setup();
    await usuario.press(screen.getByRole('link', { name: '¿Olvidaste tu contraseña?' }));
    expect(navigation.navigate).toHaveBeenCalledWith('Recuperar');
    await usuario.press(screen.getByRole('link', { name: '¿No tenés cuenta? Registrate' }));
    expect(navigation.navigate).toHaveBeenCalledWith('Registro', { rol: 'CLIENTE' });
  });

  it('si viene de "Prestador", el registro abre con el rol de prestador', async () => {
    await montar({ rol: 'PRESTADOR' });
    await userEvent.setup().press(screen.getByRole('link', { name: '¿No tenés cuenta? Registrate' }));
    expect(navigation.navigate).toHaveBeenCalledWith('Registro', { rol: 'PRESTADOR' });
  });
});
