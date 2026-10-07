import { render, screen, userEvent } from '@testing-library/react-native';

import { ApiError } from '../../../api/errores';
import { actualizarMiUsuario, cambiarContrasenia, type Usuario } from '../../../api/identidad';
import { PerfilClienteScreen } from '../../cliente/PerfilClienteScreen';
import { PerfilGestorScreen } from '../../gestor/PerfilGestorScreen';
import { PerfilPropioScreen } from '../../prestador/PerfilPropioScreen';
import { MiCuenta } from '../MiCuenta';

jest.mock('../../../api/identidad', () => ({
  actualizarMiUsuario: jest.fn(),
  cambiarContrasenia: jest.fn(),
}));

const mockActualizarUsuario = jest.fn();
let mockUsuario: Usuario;
jest.mock('../../../store/sesion', () => ({
  useSesion: () => ({
    sesion: { rol: mockUsuario.rol, usuario: mockUsuario },
    actualizarUsuario: mockActualizarUsuario,
    cerrar: jest.fn(),
  }),
}));

const mockA6 = actualizarMiUsuario as jest.Mock;
const mockA7 = cambiarContrasenia as jest.Mock;

const cliente: Usuario = {
  uuid: 'u1',
  rol: 'CLIENTE',
  nombreApellido: 'Ana Pérez',
  email: 'ana@mail.com',
  telefono: '3425551234',
  direccion: 'Calle 1',
  fecNacimiento: '1990-05-17',
  estadoValidacion: null,
};

beforeEach(() => {
  mockA6.mockReset();
  mockA7.mockReset();
  mockActualizarUsuario.mockReset();
  mockUsuario = cliente;
});

describe('MiCuenta', () => {
  it('carga los datos del usuario de la sesión y avisa que es provisoria', async () => {
    await render(<MiCuenta />);
    expect(screen.getByText('Pantalla provisoria: sin diseño en la maqueta (D10).')).toBeTruthy();
    expect(screen.getByLabelText('Nombre y apellido').props.value).toBe('Ana Pérez');
    expect(screen.getByLabelText('Teléfono').props.value).toBe('3425551234');
    expect(screen.getByLabelText('Dirección').props.value).toBe('Calle 1');
    expect(screen.getByLabelText('Fecha de nacimiento').props.value).toBe('1990-05-17');
    expect(screen.queryByText(/Estado de validación/)).toBeNull();
  });

  it('guardar llama A6, actualiza la sesión y confirma; los vacíos van como null', async () => {
    const guardado = { ...cliente, nombreApellido: 'Ana M', telefono: null };
    mockA6.mockResolvedValue(guardado);
    await render(<MiCuenta />);
    const usuario = userEvent.setup();
    await usuario.clear(screen.getByLabelText('Nombre y apellido'));
    await usuario.type(screen.getByLabelText('Nombre y apellido'), 'Ana M');
    await usuario.clear(screen.getByLabelText('Teléfono'));
    await usuario.press(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(mockA6).toHaveBeenCalledWith({
      nombreApellido: 'Ana M',
      telefono: null,
      direccion: 'Calle 1',
      fecNacimiento: '1990-05-17',
    });
    expect(mockActualizarUsuario).toHaveBeenCalledWith(guardado);
    expect(await screen.findByText('Datos guardados.')).toBeTruthy();
  });

  it('rechaza una fecha con formato inválido sin llamar a A6', async () => {
    await render(<MiCuenta />);
    const usuario = userEvent.setup();
    await usuario.clear(screen.getByLabelText('Fecha de nacimiento'));
    await usuario.type(screen.getByLabelText('Fecha de nacimiento'), '17/05/1990');
    await usuario.press(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(screen.getByText('Usá el formato AAAA-MM-DD')).toBeTruthy();
    expect(mockA6).not.toHaveBeenCalled();
  });

  it('un error de red al guardar avisa y no toca la sesión', async () => {
    mockA6.mockRejectedValue(new TypeError('Network request failed'));
    await render(<MiCuenta />);
    const usuario = userEvent.setup();
    await usuario.press(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByText('No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.')).toBeTruthy();
    expect(mockActualizarUsuario).not.toHaveBeenCalled();
  });

  it('el gestor no ve teléfono, dirección ni fecha, y manda solo el nombre', async () => {
    mockUsuario = { ...cliente, rol: 'GESTOR', telefono: null, direccion: null, fecNacimiento: null };
    mockA6.mockResolvedValue(mockUsuario);
    await render(<MiCuenta />);
    expect(screen.queryByLabelText('Teléfono')).toBeNull();
    expect(screen.queryByLabelText('Dirección')).toBeNull();
    expect(screen.queryByLabelText('Fecha de nacimiento')).toBeNull();
    const usuario = userEvent.setup();
    await usuario.press(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(mockA6).toHaveBeenCalledWith({ nombreApellido: 'Ana Pérez' });
  });

  it('el prestador ve su estado de validación', async () => {
    mockUsuario = { ...cliente, rol: 'PRESTADOR', estadoValidacion: 'PENDIENTE' };
    await render(<MiCuenta />);
    expect(screen.getByText('Estado de validación: Pendiente')).toBeTruthy();
  });

  describe('cambiar contraseña', () => {
    async function completar(actual: string, nueva: string, repetir: string) {
      const usuario = userEvent.setup();
      await usuario.type(screen.getByLabelText('Contraseña actual'), actual);
      await usuario.type(screen.getByLabelText('Contraseña nueva'), nueva);
      await usuario.type(screen.getByLabelText('Repetir contraseña'), repetir);
      await usuario.press(screen.getByRole('button', { name: 'Cambiar contraseña' }));
    }

    it('llama A7, confirma y limpia los campos', async () => {
      mockA7.mockResolvedValue(undefined);
      await render(<MiCuenta />);
      await completar('vieja1234', 'nueva1234', 'nueva1234');
      expect(mockA7).toHaveBeenCalledWith({ contraseniaActual: 'vieja1234', contraseniaNueva: 'nueva1234' });
      expect(await screen.findByText('Contraseña actualizada.')).toBeTruthy();
      expect(screen.getByLabelText('Contraseña actual').props.value).toBe('');
      expect(screen.getByLabelText('Contraseña nueva').props.value).toBe('');
      expect(screen.getByLabelText('Repetir contraseña').props.value).toBe('');
    });

    it('valida la regla y que coincidan antes de llamar', async () => {
      await render(<MiCuenta />);
      await completar('vieja1234', 'corta', 'otra');
      expect(screen.getByText('mínimo 8 caracteres, con al menos una letra y un número')).toBeTruthy();
      expect(screen.getByText('No coinciden')).toBeTruthy();
      expect(mockA7).not.toHaveBeenCalled();
    });

    it('contraseniaActual mala muestra "no coincide" bajo Contraseña actual', async () => {
      mockA7.mockRejectedValue(
        new ApiError(400, 'VALIDACION', 'Datos inválidos.', [{ campo: 'contraseniaActual', detalle: 'no coincide' }]),
      );
      await render(<MiCuenta />);
      await completar('mala12345', 'nueva1234', 'nueva1234');
      expect(await screen.findByText('no coincide')).toBeTruthy();
      expect(screen.queryByText('Contraseña actualizada.')).toBeNull();
    });
  });
});

describe('pantallas de perfil', () => {
  it('el cliente muestra Mi cuenta con un solo Cerrar sesión y sin PantallaPendiente', async () => {
    await render(<PerfilClienteScreen />);
    expect(screen.getByLabelText('Nombre y apellido')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Cerrar sesión' })).toHaveLength(1);
    expect(screen.queryByText(/Endpoints:/)).toBeNull();
  });

  it('el gestor muestra Mi cuenta con un solo Cerrar sesión y sin PantallaPendiente', async () => {
    mockUsuario = { ...cliente, rol: 'GESTOR' };
    await render(<PerfilGestorScreen />);
    expect(screen.getByLabelText('Nombre y apellido')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Cerrar sesión' })).toHaveLength(1);
    expect(screen.queryByText(/Endpoints:/)).toBeNull();
  });

  it('el prestador conserva su PantallaPendiente y suma Mi cuenta, con un solo Cerrar sesión', async () => {
    mockUsuario = { ...cliente, rol: 'PRESTADOR', estadoValidacion: 'APROBADO' };
    await render(<PerfilPropioScreen />);
    expect(screen.getByText('Endpoints: B7, B8, E7')).toBeTruthy();
    expect(screen.getByText('Estado de validación: Aprobado')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Cerrar sesión' })).toHaveLength(1);
  });
});
