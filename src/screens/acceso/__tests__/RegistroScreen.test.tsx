import { render, screen, userEvent } from '@testing-library/react-native';

import { ApiError } from '../../../api/errores';
import { RegistroScreen } from '../RegistroScreen';

const mockRegistrar = jest.fn();
const mockListarTipos = jest.fn();
jest.mock('../../../api/identidad', () => ({ registrar: (...a: unknown[]) => mockRegistrar(...a) }));
jest.mock('../../../api/catalogo', () => ({ listarTiposServicio: () => mockListarTipos() }));

const navigation = { navigate: jest.fn(), popTo: jest.fn() } as any;

async function montar(rol?: 'CLIENTE' | 'PRESTADOR') {
  await render(
    <RegistroScreen navigation={navigation} route={{ key: 'r', name: 'Registro', params: rol ? { rol } : undefined } as any} />,
  );
}

async function completar(contrasenia = 'Clave123', repetir = 'Clave123') {
  const usuario = userEvent.setup();
  await usuario.type(screen.getByLabelText('Nombre y apellido'), 'Ana Pérez');
  await usuario.type(screen.getByLabelText('Correo'), 'ana@mail.com');
  await usuario.type(screen.getByLabelText('Contraseña'), contrasenia);
  await usuario.type(screen.getByLabelText('Repetir contraseña'), repetir);
  return usuario;
}

beforeEach(() => {
  mockRegistrar.mockReset();
  mockListarTipos.mockReset();
  navigation.navigate.mockReset();
  navigation.popTo.mockReset();
  mockListarTipos.mockResolvedValue([
    { uuid: 'u-gas', nombre: 'Gasista', icono: null, requiereMatricula: true },
    { uuid: 'u-elec', nombre: 'Electricista', icono: null, requiereMatricula: false },
  ]);
});

describe('RegistroScreen', () => {
  it('el cliente no ve la lista de servicios', async () => {
    await montar();
    expect(screen.queryByText('Servicio que ofrecés')).toBeNull();
    expect(screen.queryByText('Gasista')).toBeNull();
  });

  it('el prestador ve los tipos de servicio', async () => {
    await montar('PRESTADOR');
    expect(await screen.findByText('Gasista')).toBeTruthy();
    expect(screen.getByText('Electricista')).toBeTruthy();
    expect(screen.getByText('Servicio que ofrecés')).toBeTruthy();
  });

  it('muestra un mensaje si no se pueden cargar los servicios', async () => {
    mockListarTipos.mockRejectedValue(new Error('red'));
    await montar('PRESTADOR');
    expect(await screen.findByText('No pudimos cargar los servicios. Probá de nuevo.')).toBeTruthy();
  });

  it('contraseñas distintas no llaman a registrar', async () => {
    await montar();
    const usuario = await completar('Clave123', 'Otra1234');
    await usuario.press(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(await screen.findByText('No coinciden')).toBeTruthy();
    expect(mockRegistrar).not.toHaveBeenCalled();
  });

  it('contraseña débil no llama a registrar', async () => {
    await montar();
    const usuario = await completar('corta', 'corta');
    await usuario.press(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(await screen.findByText('mínimo 8 caracteres, con al menos una letra y un número')).toBeTruthy();
    expect(mockRegistrar).not.toHaveBeenCalled();
  });

  it('prestador sin tipo elegido no llama a registrar', async () => {
    await montar('PRESTADOR');
    await screen.findByText('Gasista');
    const usuario = await completar();
    await usuario.press(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(await screen.findByText('Elegí el servicio que ofrecés.')).toBeTruthy();
    expect(mockRegistrar).not.toHaveBeenCalled();
  });

  it('409 muestra el error bajo Correo', async () => {
    mockRegistrar.mockRejectedValue(
      new ApiError(409, 'EMAIL_YA_REGISTRADO', 'Ese correo ya tiene una cuenta.', [
        { campo: 'email', detalle: 'Ese correo ya tiene una cuenta.' },
      ]),
    );
    await montar();
    const usuario = await completar();
    await usuario.press(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(await screen.findByText('Ese correo ya tiene una cuenta.')).toBeTruthy();
  });

  it('éxito de cliente navega a Ingresar con el aviso y sin idTipoServicio', async () => {
    mockRegistrar.mockResolvedValue({});
    await montar();
    const usuario = await completar();
    await usuario.press(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(mockRegistrar).toHaveBeenCalledWith({
      rol: 'CLIENTE',
      nombreApellido: 'Ana Pérez',
      email: 'ana@mail.com',
      contrasenia: 'Clave123',
    });
    expect(navigation.popTo).toHaveBeenCalledWith('Ingresar', { aviso: 'Cuenta creada. Ingresá con tu correo.' });
  });

  it('éxito de prestador manda idTipoServicio y su aviso', async () => {
    mockRegistrar.mockResolvedValue({});
    await montar('PRESTADOR');
    await userEvent.setup().press(await screen.findByRole('button', { name: 'Electricista' }));
    const usuario = await completar();
    await usuario.press(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(mockRegistrar).toHaveBeenCalledWith(expect.objectContaining({ rol: 'PRESTADOR', idTipoServicio: 'u-elec' }));
    expect(navigation.popTo).toHaveBeenCalledWith('Ingresar', {
      aviso: 'Cuenta creada. Un gestor va a validar tu perfil.',
    });
  });
});
