import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ApiError } from '../../../api/errores';
import { cambiarEstadoDeUsuario, eliminarUsuario, listarUsuarios, type UsuarioAdmin } from '../../../api/gestion';
import type { Pagina } from '../../../api/paginacion';
import { UsuariosScreen } from '../UsuariosScreen';

jest.mock('../../../api/gestion', () => ({
  listarUsuarios: jest.fn(),
  cambiarEstadoDeUsuario: jest.fn(),
  eliminarUsuario: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: (efecto: () => void) => require('react').useEffect(efecto, [efecto]),
}));

jest.mock('../../../store/sesion', () => ({ useSesion: () => ({ sesion: { rol: 'GESTOR', usuario: { uuid: 'yo' } } }) }));

const mockListar = listarUsuarios as jest.Mock;
const mockEstado = cambiarEstadoDeUsuario as jest.Mock;
const mockEliminar = eliminarUsuario as jest.Mock;

function usuario(uuid: string, cambios: Partial<UsuarioAdmin> = {}): UsuarioAdmin {
  return {
    uuid,
    rol: 'CLIENTE',
    nombreApellido: `Usuario ${uuid}`,
    email: `${uuid}@mail.com`,
    telefono: null,
    estadoCuenta: 'ACTIVA',
    estadoValidacion: null,
    tipoServicio: null,
    creadoEn: '2026-10-01T10:00:00Z',
    ...cambios,
  };
}

function pagina(contenido: UsuarioAdmin[], numero = 0, totalPaginas = 1): Pagina<UsuarioAdmin> {
  return { contenido, pagina: numero, tamanio: 20, totalElementos: contenido.length, totalPaginas };
}

beforeEach(() => {
  mockListar.mockReset();
  mockEstado.mockReset();
  mockEliminar.mockReset();
  mockNavigate.mockReset();
});

describe('UsuariosScreen', () => {
  it('muestra rol, rubro, validación, teléfono y si la cuenta está suspendida', async () => {
    mockListar.mockResolvedValue(
      pagina([
        usuario('p1', { rol: 'PRESTADOR', tipoServicio: 'Gas', estadoValidacion: 'PENDIENTE', telefono: '342555', estadoCuenta: 'SUSPENDIDA' }),
      ]),
    );
    await render(<UsuariosScreen />);
    expect(await screen.findByText('Usuario p1')).toBeOnTheScreen();
    expect(screen.getByText('Prestador · Gas · pendiente de validación')).toBeOnTheScreen();
    expect(screen.getByText('342555')).toBeOnTheScreen();
    expect(screen.getByText('Cuenta suspendida')).toBeOnTheScreen();
    expect(screen.getByText('Reactivar')).toBeOnTheScreen();
  });

  it('filtra por rol, estado y texto', async () => {
    mockListar.mockResolvedValue(pagina([usuario('c1')]));
    await render(<UsuariosScreen />);
    await screen.findByText('Usuario c1');
    expect(mockListar).toHaveBeenLastCalledWith({ rol: undefined, estado: undefined, texto: undefined, page: 0, size: 20 });

    await fireEvent.press(screen.getByText('Prestadores'));
    await waitFor(() => expect(mockListar).toHaveBeenLastCalledWith(expect.objectContaining({ rol: 'PRESTADOR' })));
    await fireEvent.press(screen.getByText('Suspendidas'));
    await waitFor(() => expect(mockListar).toHaveBeenLastCalledWith(expect.objectContaining({ estado: 'SUSPENDIDA' })));
    await fireEvent.changeText(screen.getByLabelText('Buscar por nombre, email o ID'), '  ana ');
    await fireEvent(screen.getByLabelText('Buscar por nombre, email o ID'), 'submitEditing');
    await waitFor(() =>
      expect(mockListar).toHaveBeenLastCalledWith({ rol: 'PRESTADOR', estado: 'SUSPENDIDA', texto: 'ana', page: 0, size: 20 }),
    );
    expect(screen.getByLabelText('Buscar por nombre, email o ID').props.maxLength).toBe(120);
  });

  it('muestra el vacío, y el error de carga con reintento', async () => {
    mockListar.mockRejectedValueOnce(new Error('red'));
    await render(<UsuariosScreen />);
    expect(await screen.findByText('No pudimos cargar los usuarios.')).toBeOnTheScreen();
    mockListar.mockResolvedValue(pagina([]));
    await fireEvent.press(screen.getByText('Reintentar'));
    expect(await screen.findByText('No hay usuarios con esos filtros.')).toBeOnTheScreen();
  });

  it('pide la página siguiente al llegar al final', async () => {
    mockListar.mockResolvedValueOnce(pagina([usuario('a')], 0, 2)).mockResolvedValueOnce(pagina([usuario('b')], 1, 2));
    await render(<UsuariosScreen />);
    await screen.findByText('Usuario a');
    await act(async () => screen.getByTestId('lista-usuarios').props.onEndReached());
    expect(await screen.findByText('Usuario b')).toBeOnTheScreen();
  });

  it('Añadir gestor y Editar abren el formulario', async () => {
    const ana = usuario('c1');
    mockListar.mockResolvedValue(pagina([ana]));
    await render(<UsuariosScreen />);
    await screen.findByText('Usuario c1');
    await fireEvent.press(screen.getByText('Añadir gestor'));
    expect(mockNavigate).toHaveBeenLastCalledWith('FormularioUsuario', {});
    await fireEvent.press(screen.getByText('Editar'));
    expect(mockNavigate).toHaveBeenLastCalledWith('FormularioUsuario', { usuario: ana });
  });

  it('suspender exige motivo y lo envía', async () => {
    mockListar.mockResolvedValue(pagina([usuario('c1')]));
    mockEstado.mockResolvedValue(usuario('c1', { estadoCuenta: 'SUSPENDIDA' }));
    await render(<UsuariosScreen />);
    await screen.findByText('Usuario c1');
    await fireEvent.press(screen.getByText('Suspender'));
    const campo = screen.getByLabelText('Motivo (le llega por correo)');
    expect(campo.props.maxLength).toBe(255);
    await fireEvent.press(screen.getByText('Confirmar suspensión'));
    expect(mockEstado).not.toHaveBeenCalled();
    expect(screen.getByText('Escribí el motivo: le llega al usuario por correo.')).toBeOnTheScreen();

    await fireEvent.changeText(campo, ' Reclamos ');
    await fireEvent.press(screen.getByText('Confirmar suspensión'));
    await waitFor(() => expect(mockEstado).toHaveBeenCalledWith('c1', { estado: 'SUSPENDIDA', motivo: 'Reclamos' }));
    expect(await screen.findByText('Suspendiste a Usuario c1. Le avisamos por correo.')).toBeOnTheScreen();
    await waitFor(() => expect(mockListar).toHaveBeenCalledTimes(2));
  });

  it('reactivar no exige motivo', async () => {
    mockListar.mockResolvedValue(pagina([usuario('c1', { estadoCuenta: 'SUSPENDIDA' })]));
    mockEstado.mockResolvedValue(usuario('c1'));
    await render(<UsuariosScreen />);
    await screen.findByText('Usuario c1');
    await fireEvent.press(screen.getByText('Reactivar'));
    await fireEvent.press(screen.getByText('Confirmar reactivación'));
    await waitFor(() => expect(mockEstado).toHaveBeenCalledWith('c1', { estado: 'ACTIVA' }));
  });

  it('dar de baja pide confirmación y saca al usuario', async () => {
    mockListar.mockResolvedValueOnce(pagina([usuario('c1'), usuario('c2')])).mockResolvedValue(pagina([usuario('c2')]));
    mockEliminar.mockResolvedValue(undefined);
    await render(<UsuariosScreen />);
    await screen.findByText('Usuario c1');
    await fireEvent.press(screen.getAllByText('Dar de baja')[0]);
    expect(screen.getByText('¿Dar de baja a Usuario c1? No va a poder volver a ingresar.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Cancelar'));
    expect(mockEliminar).not.toHaveBeenCalled();
    await fireEvent.press(screen.getAllByText('Dar de baja')[0]);
    await fireEvent.press(screen.getByText('Confirmar baja'));
    await waitFor(() => expect(mockEliminar).toHaveBeenCalledWith('c1'));
    await waitFor(() => expect(screen.queryByText('Usuario c1')).toBeNull());
    expect(screen.getByText('Usuario c1 fue dado de baja.')).toBeOnTheScreen();
  });

  it('sobre la propia cuenta solo se puede editar', async () => {
    mockListar.mockResolvedValue(pagina([usuario('yo', { rol: 'GESTOR' })]));
    await render(<UsuariosScreen />);
    await screen.findByText('Usuario yo');
    expect(screen.getByText('Editar')).toBeOnTheScreen();
    expect(screen.queryByText('Suspender')).toBeNull();
    expect(screen.queryByText('Dar de baja')).toBeNull();
  });

  it('un error del backend se muestra y deja la confirmación abierta', async () => {
    mockListar.mockResolvedValue(pagina([usuario('c1')]));
    mockEstado.mockRejectedValue(new ApiError(409, 'ESTADO_SIN_CAMBIOS', 'La cuenta ya está suspendida.'));
    await render(<UsuariosScreen />);
    await screen.findByText('Usuario c1');
    await fireEvent.press(screen.getByText('Suspender'));
    await fireEvent.changeText(screen.getByLabelText('Motivo (le llega por correo)'), 'x');
    await fireEvent.press(screen.getByText('Confirmar suspensión'));
    expect(await screen.findByText('La cuenta ya está suspendida.')).toBeOnTheScreen();
    expect(screen.getByText('Confirmar suspensión')).toBeOnTheScreen();
  });
});
