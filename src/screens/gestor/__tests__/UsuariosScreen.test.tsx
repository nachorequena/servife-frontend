import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ApiError } from '../../../api/errores';
import { cambiarEstadoDeUsuario, eliminarUsuario, listarUsuarios, type UsuarioAdmin } from '../../../api/gestion';
import type { Pagina } from '../../../api/paginacion';
import { renderPantalla } from '../../../testing/pantalla';
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

async function abrirMenu(nombre: string) {
  await fireEvent.press(await screen.findByRole('button', { name: `Acciones sobre ${nombre}` }));
}

beforeEach(() => {
  mockListar.mockReset();
  mockEstado.mockReset();
  mockEliminar.mockReset();
  mockNavigate.mockReset();
});

describe('UsuariosScreen', () => {
  it('muestra esqueletos mientras carga', async () => {
    mockListar.mockReturnValue(new Promise(() => undefined));
    await renderPantalla(<UsuariosScreen />);
    expect(screen.getByTestId('cargando')).toBeOnTheScreen();
  });

  it('muestra rol, rubro, validación, teléfono y si la cuenta está suspendida', async () => {
    mockListar.mockResolvedValue(
      pagina([
        usuario('p1', { rol: 'PRESTADOR', tipoServicio: 'Gas', estadoValidacion: 'PENDIENTE', telefono: '342555', estadoCuenta: 'SUSPENDIDA' }),
      ]),
    );
    await renderPantalla(<UsuariosScreen />);
    expect(await screen.findByText('Usuario p1')).toBeOnTheScreen();
    expect(screen.getByText('Prestador')).toBeOnTheScreen();
    expect(screen.getByText('Gas')).toBeOnTheScreen();
    expect(screen.getByText('Pendiente de validación')).toBeOnTheScreen();
    expect(screen.getByText('342555')).toBeOnTheScreen();
    expect(screen.getByText('Suspendida')).toBeOnTheScreen();
  });

  it('la búsqueda se aplica sola mientras se escribe', async () => {
    mockListar.mockResolvedValue(pagina([usuario('c1')]));
    await renderPantalla(<UsuariosScreen />);
    await screen.findByText('Usuario c1');
    expect(screen.getByLabelText('Buscar por nombre, email o ID').props.maxLength).toBe(120);
    await fireEvent.changeText(screen.getByLabelText('Buscar por nombre, email o ID'), '  ana ');
    await waitFor(() =>
      expect(mockListar).toHaveBeenLastCalledWith({ rol: undefined, estado: undefined, texto: 'ana', page: 0, size: 20 }),
    );
  });

  it('los filtros se eligen en una hoja y quedan como chips que se pueden quitar', async () => {
    mockListar.mockResolvedValue(pagina([usuario('c1')]));
    await renderPantalla(<UsuariosScreen />);
    await screen.findByText('Usuario c1');
    await fireEvent.press(screen.getByRole('button', { name: 'Filtros' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Prestadores' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Suspendidas' }));
    expect(mockListar).toHaveBeenCalledTimes(1); // nada cambia hasta aplicar
    await fireEvent.press(screen.getByRole('button', { name: 'Aplicar' }));
    await waitFor(() => expect(mockListar).toHaveBeenLastCalledWith(expect.objectContaining({ rol: 'PRESTADOR', estado: 'SUSPENDIDA' })));
    expect(screen.getByRole('button', { name: 'Filtros (2)' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Quitar filtro de rol' }));
    await waitFor(() => expect(mockListar).toHaveBeenLastCalledWith(expect.objectContaining({ rol: undefined, estado: 'SUSPENDIDA' })));
  });

  it('sin resultados con filtros ofrece limpiarlos', async () => {
    mockListar.mockResolvedValue(pagina([]));
    await renderPantalla(<UsuariosScreen />);
    await fireEvent.changeText(screen.getByLabelText('Buscar por nombre, email o ID'), 'nadie');
    expect(await screen.findByText('No hay usuarios con esos filtros.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(screen.getByLabelText('Buscar por nombre, email o ID').props.value).toBe('');
  });

  it('si falla la carga muestra el error con reintento', async () => {
    mockListar.mockRejectedValueOnce(new Error('red'));
    await renderPantalla(<UsuariosScreen />);
    expect(await screen.findByText('No pudimos cargar los usuarios.')).toBeOnTheScreen();
    mockListar.mockResolvedValue(pagina([usuario('c1')]));
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Usuario c1')).toBeOnTheScreen();
  });

  it('pide la página siguiente al llegar al final', async () => {
    mockListar.mockResolvedValueOnce(pagina([usuario('a')], 0, 2)).mockResolvedValueOnce(pagina([usuario('b')], 1, 2));
    await renderPantalla(<UsuariosScreen />);
    await screen.findByText('Usuario a');
    await act(async () => screen.getByTestId('lista-usuarios').props.onEndReached());
    expect(await screen.findByText('Usuario b')).toBeOnTheScreen();
  });

  it('el botón flotante añade un gestor y el menú lleva a editar', async () => {
    const ana = usuario('c1');
    mockListar.mockResolvedValue(pagina([ana]));
    await renderPantalla(<UsuariosScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Añadir gestor' }));
    expect(mockNavigate).toHaveBeenLastCalledWith('FormularioUsuario', {});
    await abrirMenu('Usuario c1');
    await fireEvent.press(screen.getByRole('button', { name: 'Editar datos' }));
    expect(mockNavigate).toHaveBeenLastCalledWith('FormularioUsuario', { usuario: ana });
  });

  it('suspender exige el motivo, lo envía y avisa', async () => {
    mockListar.mockResolvedValue(pagina([usuario('c1')]));
    mockEstado.mockResolvedValue(usuario('c1', { estadoCuenta: 'SUSPENDIDA' }));
    await renderPantalla(<UsuariosScreen />);
    await abrirMenu('Usuario c1');
    await fireEvent.press(screen.getByRole('button', { name: 'Suspender cuenta' }));
    const campo = screen.getByLabelText('Motivo');
    expect(campo.props.maxLength).toBe(255);
    await fireEvent.press(screen.getByRole('button', { name: 'Suspender' }));
    expect(mockEstado).not.toHaveBeenCalled();
    expect(screen.getByText('Escribí el motivo: le llega al usuario por correo.')).toBeOnTheScreen();
    await fireEvent.changeText(campo, ' Reclamos ');
    await fireEvent.press(screen.getByRole('button', { name: 'Suspender' }));
    await waitFor(() => expect(mockEstado).toHaveBeenCalledWith('c1', { estado: 'SUSPENDIDA', motivo: 'Reclamos' }));
    expect(await screen.findByText('Suspendiste a Usuario c1. Le avisamos por correo.')).toBeOnTheScreen();
  });

  it('reactivar pide confirmar y no exige motivo', async () => {
    mockListar.mockResolvedValue(pagina([usuario('c1', { estadoCuenta: 'SUSPENDIDA' })]));
    mockEstado.mockResolvedValue(usuario('c1'));
    await renderPantalla(<UsuariosScreen />);
    await abrirMenu('Usuario c1');
    await fireEvent.press(screen.getByRole('button', { name: 'Reactivar cuenta' }));
    expect(screen.getByText('¿Reactivar a Usuario c1?')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Reactivar' }));
    await waitFor(() => expect(mockEstado).toHaveBeenCalledWith('c1', { estado: 'ACTIVA' }));
    expect(await screen.findByText('Usuario c1 está activo de nuevo.')).toBeOnTheScreen();
  });

  it('dar de baja pide confirmar en un diálogo, saca al usuario y avisa', async () => {
    mockListar.mockResolvedValueOnce(pagina([usuario('c1'), usuario('c2')])).mockResolvedValue(pagina([usuario('c2')]));
    mockEliminar.mockResolvedValue(undefined);
    await renderPantalla(<UsuariosScreen />);
    await abrirMenu('Usuario c1');
    await fireEvent.press(screen.getByRole('button', { name: 'Dar de baja' }));
    expect(screen.getByText('¿Dar de baja a Usuario c1?')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    expect(mockEliminar).not.toHaveBeenCalled();
    await abrirMenu('Usuario c1');
    await fireEvent.press(screen.getByRole('button', { name: 'Dar de baja' }));
    await fireEvent.press(screen.getAllByRole('button', { name: 'Dar de baja' }).at(-1)!);
    await waitFor(() => expect(mockEliminar).toHaveBeenCalledWith('c1'));
    expect(await screen.findByText('Usuario c1 fue dado de baja.')).toBeOnTheScreen();
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Acciones sobre Usuario c1' })).toBeNull());
  });

  it('sobre la propia cuenta el menú solo ofrece editar', async () => {
    mockListar.mockResolvedValue(pagina([usuario('yo', { rol: 'GESTOR' })]));
    await renderPantalla(<UsuariosScreen />);
    await abrirMenu('Usuario yo');
    expect(screen.getByRole('button', { name: 'Editar datos' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Suspender cuenta' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Dar de baja' })).toBeNull();
  });

  it('un error del backend se avisa como error', async () => {
    mockListar.mockResolvedValue(pagina([usuario('c1', { estadoCuenta: 'SUSPENDIDA' })]));
    mockEstado.mockRejectedValue(new ApiError(409, 'ESTADO_SIN_CAMBIOS', 'La cuenta ya está activa.'));
    await renderPantalla(<UsuariosScreen />);
    await abrirMenu('Usuario c1');
    await fireEvent.press(screen.getByRole('button', { name: 'Reactivar cuenta' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Reactivar' }));
    expect(await screen.findByText('La cuenta ya está activa.')).toBeOnTheScreen();
    expect(screen.getByTestId('icono-close-circle')).toBeOnTheScreen();
  });
});
