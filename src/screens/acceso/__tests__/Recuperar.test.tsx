import { render, screen, userEvent } from '@testing-library/react-native';

import { ApiError } from '../../../api/errores';
import { confirmarRecuperacion, recuperarContrasenia } from '../../../api/identidad';
import { RecuperarScreen } from '../RecuperarScreen';
import { RestablecerScreen } from '../RestablecerScreen';

jest.mock('../../../api/identidad', () => ({
  recuperarContrasenia: jest.fn(),
  confirmarRecuperacion: jest.fn(),
}));

const mockRecuperar = recuperarContrasenia as jest.Mock;
const mockConfirmar = confirmarRecuperacion as jest.Mock;
const navigation = { navigate: jest.fn() } as any;
const AVISO = 'Te mandamos un código de 6 dígitos a tu correo. Vence en 15 minutos.';

beforeEach(() => {
  mockRecuperar.mockReset();
  mockConfirmar.mockReset();
  navigation.navigate.mockReset();
});

describe('RecuperarScreen', () => {
  it('llama a A8 con el correo y navega a Restablecer', async () => {
    mockRecuperar.mockResolvedValue(undefined);
    await render(<RecuperarScreen navigation={navigation} route={{ key: 'r', name: 'Recuperar' } as any} />);
    expect(screen.getByText(AVISO)).toBeTruthy();
    const usuario = userEvent.setup();
    await usuario.type(screen.getByLabelText('Correo'), 'ana@mail.com');
    await usuario.press(screen.getByRole('button', { name: 'Enviar código' }));
    expect(mockRecuperar).toHaveBeenCalledWith({ email: 'ana@mail.com' });
    expect(navigation.navigate).toHaveBeenCalledWith('Restablecer', { email: 'ana@mail.com' });
  });

  it('un error de red no avanza y avisa', async () => {
    mockRecuperar.mockRejectedValue(new TypeError('Network request failed'));
    await render(<RecuperarScreen navigation={navigation} route={{ key: 'r', name: 'Recuperar' } as any} />);
    const usuario = userEvent.setup();
    await usuario.type(screen.getByLabelText('Correo'), 'ana@mail.com');
    await usuario.press(screen.getByRole('button', { name: 'Enviar código' }));
    expect(await screen.findByText('No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.')).toBeTruthy();
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('un error de validación va bajo el correo', async () => {
    mockRecuperar.mockRejectedValue(
      new ApiError(400, 'VALIDACION', 'Datos inválidos.', [{ campo: 'email', detalle: 'Correo inválido.' }]),
    );
    await render(<RecuperarScreen navigation={navigation} route={{ key: 'r', name: 'Recuperar' } as any} />);
    const usuario = userEvent.setup();
    await usuario.type(screen.getByLabelText('Correo'), 'x');
    await usuario.press(screen.getByRole('button', { name: 'Enviar código' }));
    expect(await screen.findByText('Correo inválido.')).toBeTruthy();
    expect(navigation.navigate).not.toHaveBeenCalled();
  });
});

describe('RestablecerScreen', () => {
  async function montar() {
    await render(
      <RestablecerScreen
        navigation={navigation}
        route={{ key: 's', name: 'Restablecer', params: { email: 'ana@mail.com' } } as any}
      />,
    );
  }

  async function completar(codigo: string, clave: string, repetir: string) {
    const usuario = userEvent.setup();
    await usuario.type(screen.getByLabelText('Código'), codigo);
    await usuario.type(screen.getByLabelText('Contraseña nueva'), clave);
    await usuario.type(screen.getByLabelText('Repetir contraseña'), repetir);
    await usuario.press(screen.getByRole('button', { name: 'Cambiar contraseña' }));
  }

  it('muestra el correo y el aviso', async () => {
    await montar();
    expect(screen.getByText('ana@mail.com')).toBeTruthy();
    expect(screen.getByText(AVISO)).toBeTruthy();
  });

  it('éxito: llama a A9 y navega a Ingresar con aviso', async () => {
    mockConfirmar.mockResolvedValue(undefined);
    await montar();
    await completar('123456', 'Clave123', 'Clave123');
    expect(mockConfirmar).toHaveBeenCalledWith({
      email: 'ana@mail.com',
      codigo: '123456',
      contraseniaNueva: 'Clave123',
    });
    expect(navigation.navigate).toHaveBeenCalledWith('Ingresar', {
      aviso: 'Contraseña actualizada. Ingresá de nuevo.',
    });
  });

  it('CODIGO_INVALIDO se muestra bajo "Código"', async () => {
    mockConfirmar.mockRejectedValue(
      new ApiError(400, 'CODIGO_INVALIDO', 'El código no es válido o venció. Pedí uno nuevo.'),
    );
    await montar();
    await completar('123456', 'Clave123', 'Clave123');
    expect(await screen.findByText('El código no es válido o venció. Pedí uno nuevo.')).toBeTruthy();
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('validación local: código corto, contraseña débil y no coinciden no llaman a A9', async () => {
    await montar();
    await completar('123', 'corta', 'otra');
    expect(await screen.findByText('El código tiene 6 dígitos.')).toBeTruthy();
    expect(screen.getByText('mínimo 8 caracteres, con al menos una letra y un número')).toBeTruthy();
    expect(screen.getByText('No coinciden')).toBeTruthy();
    expect(mockConfirmar).not.toHaveBeenCalled();
  });

  it('un error de red muestra el mensaje genérico', async () => {
    mockConfirmar.mockRejectedValue(new TypeError('Network request failed'));
    await montar();
    await completar('123456', 'Clave123', 'Clave123');
    expect(await screen.findByText('No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.')).toBeTruthy();
  });

  it('"Reenviar código" vuelve a llamar a A8 y confirma', async () => {
    mockRecuperar.mockResolvedValue(undefined);
    await montar();
    const usuario = userEvent.setup();
    await usuario.press(screen.getByRole('button', { name: 'Reenviar código' }));
    expect(mockRecuperar).toHaveBeenCalledWith({ email: 'ana@mail.com' });
    expect(await screen.findByText('Te mandamos un código nuevo.')).toBeTruthy();
  });
});
