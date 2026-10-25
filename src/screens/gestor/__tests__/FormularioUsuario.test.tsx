import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ApiError } from '../../../api/errores';
import { actualizarUsuario, crearGestor, type UsuarioAdmin } from '../../../api/gestion';
import { renderPantalla } from '../../../testing/pantalla';
import { FormularioUsuario } from '../FormularioUsuario';

jest.mock('../../../api/gestion', () => ({ crearGestor: jest.fn(), actualizarUsuario: jest.fn() }));

const mockGoBack = jest.fn();
let mockParams: { usuario?: UsuarioAdmin };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({ params: mockParams }),
}));

const mockCrear = crearGestor as jest.Mock;
const mockActualizar = actualizarUsuario as jest.Mock;

const ana: UsuarioAdmin = {
  uuid: 'c1',
  rol: 'CLIENTE',
  nombreApellido: 'Ana Gómez',
  email: 'ana@mail.com',
  telefono: '342555',
  estadoCuenta: 'ACTIVA',
  estadoValidacion: null,
  tipoServicio: null,
  creadoEn: '2026-10-01T10:00:00Z',
};

beforeEach(() => {
  mockParams = {};
  mockGoBack.mockReset();
  mockCrear.mockReset();
  mockActualizar.mockReset();
});

describe('FormularioUsuario', () => {
  it('da de alta un gestor, avisa y vuelve', async () => {
    mockCrear.mockResolvedValue({ ...ana, rol: 'GESTOR' });
    await renderPantalla(<FormularioUsuario />);
    expect(screen.queryByLabelText('Teléfono (opcional)')).toBeNull();
    await fireEvent.changeText(screen.getByLabelText('Nombre y apellido'), ' Nueva Gestora ');
    await fireEvent.changeText(screen.getByLabelText('Email'), ' g@mail.com ');
    await fireEvent.changeText(screen.getByLabelText('Contraseña'), 'clave1234');
    await fireEvent.press(screen.getByRole('button', { name: 'Crear gestor' }));
    await waitFor(() =>
      expect(mockCrear).toHaveBeenCalledWith({ nombreApellido: 'Nueva Gestora', email: 'g@mail.com', contrasenia: 'clave1234' }),
    );
    expect(await screen.findByText('Nueva Gestora ya puede ingresar como gestor.')).toBeOnTheScreen();
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('muestra las reglas de la contraseña mientras se escribe y el ojo la deja ver', async () => {
    await renderPantalla(<FormularioUsuario />);
    expect(screen.getAllByTestId('icono-ellipse-outline')).toHaveLength(3);
    await fireEvent.changeText(screen.getByLabelText('Contraseña'), 'abc1');
    expect(screen.getAllByTestId('icono-checkmark-circle')).toHaveLength(2); // letra y número, todavía no 8
    await fireEvent.changeText(screen.getByLabelText('Contraseña'), 'abcd1234');
    expect(screen.getAllByTestId('icono-checkmark-circle')).toHaveLength(3);
    await fireEvent.press(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(screen.getByLabelText('Contraseña').props.secureTextEntry).toBe(false);
  });

  it('valida los obligatorios antes de llamar al backend', async () => {
    await renderPantalla(<FormularioUsuario />);
    await fireEvent.press(screen.getByRole('button', { name: 'Crear gestor' }));
    expect(screen.getByText('Ingresá el nombre')).toBeOnTheScreen();
    expect(screen.getByText('Ingresá el email')).toBeOnTheScreen();
    expect(screen.getByText('Ingresá una contraseña')).toBeOnTheScreen();
    expect(mockCrear).not.toHaveBeenCalled();
  });

  it('los campos tienen los límites del backend', async () => {
    await renderPantalla(<FormularioUsuario />);
    expect(screen.getByLabelText('Nombre y apellido').props.maxLength).toBe(120);
    expect(screen.getByLabelText('Email').props.maxLength).toBe(254);
    expect(screen.getByLabelText('Contraseña').props.maxLength).toBe(72);
  });

  it('muestra el error de email repetido en el campo', async () => {
    mockCrear.mockRejectedValue(
      new ApiError(409, 'EMAIL_YA_REGISTRADO', 'Ese correo ya tiene una cuenta.', [{ campo: 'email', detalle: 'ya existe' }]),
    );
    await renderPantalla(<FormularioUsuario />);
    await fireEvent.changeText(screen.getByLabelText('Nombre y apellido'), 'G');
    await fireEvent.changeText(screen.getByLabelText('Email'), 'g@mail.com');
    await fireEvent.changeText(screen.getByLabelText('Contraseña'), 'clave1234');
    await fireEvent.press(screen.getByRole('button', { name: 'Crear gestor' }));
    expect(await screen.findByText('ya existe')).toBeOnTheScreen();
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('edita nombre, email y teléfono de un cliente y avisa', async () => {
    mockParams = { usuario: ana };
    mockActualizar.mockResolvedValue(ana);
    await renderPantalla(<FormularioUsuario />);
    expect(screen.queryByLabelText('Contraseña')).toBeNull();
    expect(screen.getByLabelText('Teléfono (opcional)').props.maxLength).toBe(30);
    await fireEvent.changeText(screen.getByLabelText('Nombre y apellido'), 'Ana María Gómez');
    await fireEvent.changeText(screen.getByLabelText('Teléfono (opcional)'), ' 342 999 ');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() =>
      expect(mockActualizar).toHaveBeenCalledWith('c1', { nombreApellido: 'Ana María Gómez', email: 'ana@mail.com', telefono: '342 999' }),
    );
    expect(await screen.findByText('Cambios guardados.')).toBeOnTheScreen();
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('borrar el teléfono lo omite', async () => {
    mockParams = { usuario: ana };
    mockActualizar.mockResolvedValue(ana);
    await renderPantalla(<FormularioUsuario />);
    await fireEvent.changeText(screen.getByLabelText('Teléfono (opcional)'), '  ');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(mockActualizar).toHaveBeenCalledWith('c1', { nombreApellido: 'Ana Gómez', email: 'ana@mail.com' }));
  });

  it('un gestor se edita sin teléfono', async () => {
    mockParams = { usuario: { ...ana, rol: 'GESTOR', telefono: null } };
    await renderPantalla(<FormularioUsuario />);
    expect(screen.queryByLabelText('Teléfono (opcional)')).toBeNull();
  });

  it('un error de red se muestra', async () => {
    mockParams = { usuario: ana };
    mockActualizar.mockRejectedValue(new TypeError('red'));
    await renderPantalla(<FormularioUsuario />);
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByText(/No pudimos conectarnos/)).toBeOnTheScreen();
  });
});
