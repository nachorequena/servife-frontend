import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import {
  actualizarDireccion,
  crearDireccion,
  eliminarDireccion,
  listarMisDirecciones,
  marcarDireccionPrincipal,
} from '../../../api/direcciones';
import { ApiError } from '../../../api/errores';
import type { Usuario } from '../../../api/identidad';
import { renderPantalla } from '../../../testing/pantalla';
import { MisDirecciones } from '../MisDirecciones';

jest.mock('../../../api/direcciones', () => ({
  ...jest.requireActual('../../../api/direcciones'),
  listarMisDirecciones: jest.fn(),
  crearDireccion: jest.fn(),
  actualizarDireccion: jest.fn(),
  eliminarDireccion: jest.fn(),
  marcarDireccionPrincipal: jest.fn(),
}));

const usuario: Usuario = {
  uuid: 'u1',
  rol: 'CLIENTE',
  nombreApellido: 'Ana Pérez',
  email: 'ana@mail.com',
  telefono: null,
  direccion: 'San Martín 123',
  fecNacimiento: null,
  estadoValidacion: null,
};
const mockActualizarUsuario = jest.fn();
jest.mock('../../../store/sesion', () => ({
  useSesion: () => ({ sesion: { rol: 'CLIENTE', usuario }, actualizarUsuario: mockActualizarUsuario }),
}));

const mockListar = listarMisDirecciones as jest.Mock;
const mockCrear = crearDireccion as jest.Mock;
const mockActualizar = actualizarDireccion as jest.Mock;
const mockEliminar = eliminarDireccion as jest.Mock;
const mockPrincipal = marcarDireccionPrincipal as jest.Mock;

const casa = { uuid: 'd1', alias: 'Casa', direccion: 'San Martín 123', principal: true };
const trabajo = { uuid: 'd2', alias: 'Trabajo', direccion: 'Rivadavia 500', principal: false };

beforeEach(() => {
  [mockListar, mockCrear, mockActualizar, mockEliminar, mockPrincipal, mockActualizarUsuario].forEach((m) => m.mockReset());
});

describe('MisDirecciones', () => {
  it('lista las direcciones con la principal marcada', async () => {
    mockListar.mockResolvedValue([casa, trabajo]);
    await renderPantalla(<MisDirecciones />);
    expect(await screen.findByLabelText('Casa: San Martín 123, principal')).toBeOnTheScreen();
    expect(screen.getByLabelText('Trabajo: Rivadavia 500')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Hacer principal Casa' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Hacer principal Trabajo' })).toBeOnTheScreen();
  });

  it('sin direcciones lo dice y la primera se propone como "Casa"', async () => {
    mockListar.mockResolvedValueOnce([]).mockResolvedValueOnce([casa]);
    mockCrear.mockResolvedValue(casa);
    await renderPantalla(<MisDirecciones />);
    expect(await screen.findByText('Todavía no guardaste direcciones.')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Agregar dirección' }));
    expect(screen.getByLabelText('Nombre').props.value).toBe('Casa');
    await fireEvent.changeText(screen.getByLabelText('Dirección'), ' San Martín 123 ');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar dirección' }));

    await waitFor(() => expect(mockCrear).toHaveBeenCalledWith({ alias: 'Casa', direccion: 'San Martín 123' }));
    expect(await screen.findByLabelText('Casa: San Martín 123, principal')).toBeOnTheScreen();
  });

  it('valida los campos antes de mandar y muestra los errores del backend', async () => {
    mockListar.mockResolvedValue([casa]);
    mockCrear.mockRejectedValue(
      new ApiError(400, 'VALIDACION', 'Datos inválidos', [{ campo: 'direccion', detalle: 'es demasiado larga' }]),
    );
    await renderPantalla(<MisDirecciones />);
    await screen.findByLabelText('Casa: San Martín 123, principal');
    await fireEvent.press(screen.getByRole('button', { name: 'Agregar dirección' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar dirección' }));
    expect(screen.getByText('Es obligatorio.')).toBeOnTheScreen();
    expect(screen.getByText('Es obligatoria.')).toBeOnTheScreen();
    expect(mockCrear).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText('Nombre'), 'Trabajo');
    await fireEvent.changeText(screen.getByLabelText('Dirección'), 'x');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar dirección' }));
    expect(await screen.findByText('es demasiado larga')).toBeOnTheScreen();
  });

  it('hacer principal actualiza la lista y la dirección de la sesión', async () => {
    mockListar
      .mockResolvedValueOnce([casa, trabajo])
      .mockResolvedValueOnce([{ ...trabajo, principal: true }, { ...casa, principal: false }]);
    mockPrincipal.mockResolvedValue({ ...trabajo, principal: true });
    await renderPantalla(<MisDirecciones />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Hacer principal Trabajo' }));

    expect(mockPrincipal).toHaveBeenCalledWith('d2');
    expect(await screen.findByLabelText('Trabajo: Rivadavia 500, principal')).toBeOnTheScreen();
    expect(mockActualizarUsuario).toHaveBeenCalledWith({ ...usuario, direccion: 'Rivadavia 500' });
  });

  it('editar manda los datos nuevos', async () => {
    mockListar.mockResolvedValue([casa]);
    mockActualizar.mockResolvedValue(casa);
    await renderPantalla(<MisDirecciones />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Editar Casa' }));
    expect(screen.getByLabelText('Dirección').props.value).toBe('San Martín 123');
    await fireEvent.changeText(screen.getByLabelText('Dirección'), 'San Martín 999');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar dirección' }));
    await waitFor(() => expect(mockActualizar).toHaveBeenCalledWith('d1', { alias: 'Casa', direccion: 'San Martín 999' }));
  });

  it('borrar pide confirmación y avisa si era la principal', async () => {
    mockListar.mockResolvedValueOnce([casa, trabajo]).mockResolvedValueOnce([{ ...trabajo, principal: true }]);
    mockEliminar.mockResolvedValue(undefined);
    await renderPantalla(<MisDirecciones />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Borrar Casa' }));
    expect(screen.getByText('Es tu principal: pasará a serlo otra de las que guardaste.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Borrar' }));

    expect(mockEliminar).toHaveBeenCalledWith('d1');
    expect(await screen.findByLabelText('Trabajo: Rivadavia 500, principal')).toBeOnTheScreen();
    expect(mockActualizarUsuario).toHaveBeenCalledWith({ ...usuario, direccion: 'Rivadavia 500' });
  });
});
