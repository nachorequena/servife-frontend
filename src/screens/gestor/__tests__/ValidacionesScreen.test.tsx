import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ApiError } from '../../../api/errores';
import { listarValidacionesPendientes, validarPrestador, type PrestadorPendiente } from '../../../api/gestion';
import type { Pagina } from '../../../api/paginacion';
import { renderPantalla } from '../../../testing/pantalla';
import { ValidacionesScreen } from '../ValidacionesScreen';

jest.mock('../../../api/gestion', () => ({ listarValidacionesPendientes: jest.fn(), validarPrestador: jest.fn() }));

const mockFoco: { disparar: () => void } = { disparar: () => undefined };
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: (efecto: () => void) => {
    require('react').useEffect(efecto, [efecto]);
    mockFoco.disparar = efecto;
  },
}));

const mockListar = listarValidacionesPendientes as jest.Mock;
const mockValidar = validarPrestador as jest.Mock;

function pendiente(n: number, requiereMatricula = true): PrestadorPendiente {
  return {
    uuid: `p${n}`,
    nombreApellido: `Prestador${n} Apellido`,
    email: `p${n}@mail.com`,
    tipoServicio: { uuid: 't1', nombre: 'Gas', icono: 'flame', requiereMatricula },
    postuladoEn: new Date().toISOString(),
  };
}

function pagina(contenido: PrestadorPendiente[], numero = 0, totalPaginas = 1): Pagina<PrestadorPendiente> {
  return { contenido, pagina: numero, tamanio: 20, totalElementos: contenido.length, totalPaginas };
}

const lista = () => screen.getByTestId('lista-validaciones');

beforeEach(() => {
  mockListar.mockReset();
  mockValidar.mockReset();
  mockNavigate.mockReset();
});

describe('ValidacionesScreen', () => {
  it('muestra esqueletos mientras carga y no repite el título de la pantalla', async () => {
    mockListar.mockReturnValue(new Promise(() => undefined));
    await renderPantalla(<ValidacionesScreen />);
    expect(screen.getByTestId('cargando')).toBeOnTheScreen();
    expect(screen.queryByText('Validaciones')).toBeNull();
  });

  it('muestra nombre, email, rubro, matrícula y hace cuánto se postuló', async () => {
    mockListar.mockResolvedValue(pagina([pendiente(1)]));
    await renderPantalla(<ValidacionesScreen />);
    expect(await screen.findByText('Prestador1 Apellido')).toBeOnTheScreen();
    expect(screen.getByText('p1@mail.com')).toBeOnTheScreen();
    expect(screen.getByText('Gas')).toBeOnTheScreen();
    expect(screen.getByText('Requiere matrícula')).toBeOnTheScreen();
    expect(screen.getByText('Se postuló hoy')).toBeOnTheScreen();
  });

  it('sin pendientes muestra el vacío', async () => {
    mockListar.mockResolvedValue(pagina([]));
    await renderPantalla(<ValidacionesScreen />);
    expect(await screen.findByText('No hay prestadores pendientes de validación.')).toBeOnTheScreen();
  });

  it('si falla la primera carga muestra el error con reintento', async () => {
    mockListar.mockRejectedValueOnce(new Error('red'));
    await renderPantalla(<ValidacionesScreen />);
    expect(await screen.findByText('No pudimos cargar las validaciones.')).toBeOnTheScreen();
    mockListar.mockResolvedValue(pagina([pendiente(1)]));
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Prestador1 Apellido')).toBeOnTheScreen();
  });

  it('pide la página siguiente al llegar al final', async () => {
    mockListar.mockResolvedValueOnce(pagina([pendiente(1)], 0, 2)).mockResolvedValueOnce(pagina([pendiente(2)], 1, 2));
    await renderPantalla(<ValidacionesScreen />);
    await screen.findByText('Prestador1 Apellido');
    await act(async () => lista().props.onEndReached());
    expect(await screen.findByText('Prestador2 Apellido')).toBeOnTheScreen();
    expect(mockListar).toHaveBeenLastCalledWith({ page: 1, size: 20 });
  });

  it('si falla el refresco conserva la lista y avisa', async () => {
    mockListar.mockResolvedValueOnce(pagina([pendiente(1)])).mockRejectedValueOnce(new Error('red'));
    await renderPantalla(<ValidacionesScreen />);
    await screen.findByText('Prestador1 Apellido');
    await act(async () => lista().props.onRefresh());
    expect(await screen.findByText(/No pudimos actualizar la lista/)).toBeOnTheScreen();
    expect(screen.getByText('Prestador1 Apellido')).toBeOnTheScreen();
  });

  it('vuelve a pedir la lista al volver a la pantalla', async () => {
    mockListar.mockResolvedValue(pagina([pendiente(1)]));
    await renderPantalla(<ValidacionesScreen />);
    await screen.findByText('Prestador1 Apellido');
    mockListar.mockResolvedValue(pagina([pendiente(2)]));
    await act(async () => mockFoco.disparar());
    expect(await screen.findByText('Prestador2 Apellido')).toBeOnTheScreen();
  });

  it('Ver expediente abre el expediente con el rubro', async () => {
    mockListar.mockResolvedValue(pagina([pendiente(1)]));
    await renderPantalla(<ValidacionesScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Ver expediente' }));
    expect(mockNavigate).toHaveBeenCalledWith('Expediente', {
      uuidPrestador: 'p1',
      nombreApellido: 'Prestador1 Apellido',
      rubro: 'Gas',
      requiereMatricula: true,
    });
  });

  it('aprobar pide confirmar en un diálogo, llama a E6, avisa y recarga', async () => {
    mockListar.mockResolvedValueOnce(pagina([pendiente(1)])).mockResolvedValueOnce(pagina([pendiente(3)]));
    mockValidar.mockResolvedValue({ uuid: 'p1', estadoValidacion: 'APROBADO' });
    await renderPantalla(<ValidacionesScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Aprobar' }));
    expect(mockValidar).not.toHaveBeenCalled();
    expect(screen.getByText('¿Aprobar a Prestador1 Apellido?')).toBeOnTheScreen();
    await fireEvent.press(screen.getAllByRole('button', { name: 'Aprobar' }).at(-1)!);
    await waitFor(() => expect(mockValidar).toHaveBeenCalledWith('p1', { decision: 'APROBAR' }));
    expect(await screen.findByText('Prestador1 Apellido fue aprobado.')).toBeOnTheScreen();
    expect(await screen.findByText('Prestador3 Apellido')).toBeOnTheScreen();
  });

  it('cancelar el diálogo no llama a E6', async () => {
    mockListar.mockResolvedValue(pagina([pendiente(1)]));
    await renderPantalla(<ValidacionesScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Aprobar' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByText('¿Aprobar a Prestador1 Apellido?')).toBeNull();
    expect(mockValidar).not.toHaveBeenCalled();
  });

  it('rechazar abre la hoja con el motivo (hasta 255) y lo envía', async () => {
    mockListar.mockResolvedValueOnce(pagina([pendiente(1)])).mockResolvedValueOnce(pagina([]));
    mockValidar.mockResolvedValue({ uuid: 'p1', estadoValidacion: 'RECHAZADO' });
    await renderPantalla(<ValidacionesScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Rechazar' }));
    const campo = screen.getByLabelText('Motivo (opcional, le llega al prestador)');
    expect(campo.props.maxLength).toBe(255);
    await fireEvent.changeText(campo, 'Sin matrícula');
    await fireEvent.press(screen.getAllByRole('button', { name: 'Rechazar' }).at(-1)!);
    await waitFor(() => expect(mockValidar).toHaveBeenCalledWith('p1', { decision: 'RECHAZAR', motivo: 'Sin matrícula' }));
    expect(await screen.findByText('Prestador1 Apellido fue rechazado.')).toBeOnTheScreen();
  });

  it('mientras se envía, los botones del diálogo quedan deshabilitados', async () => {
    mockListar.mockResolvedValue(pagina([pendiente(1)]));
    let terminar: (valor: unknown) => void = () => undefined;
    mockValidar.mockReturnValue(new Promise((resolver) => (terminar = resolver)));
    await renderPantalla(<ValidacionesScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Aprobar' }));
    fireEvent.press(screen.getAllByRole('button', { name: 'Aprobar' }).at(-1)!);
    await waitFor(() => expect(mockValidar).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    await act(async () => terminar({ uuid: 'p1', estadoValidacion: 'APROBADO' }));
  });

  it('VALIDACION_YA_RESUELTA avisa con un error y recarga la lista', async () => {
    mockListar.mockResolvedValueOnce(pagina([pendiente(1)])).mockResolvedValueOnce(pagina([]));
    mockValidar.mockRejectedValue(new ApiError(409, 'VALIDACION_YA_RESUELTA', 'Ya fue resuelta.'));
    await renderPantalla(<ValidacionesScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Aprobar' }));
    await fireEvent.press(screen.getAllByRole('button', { name: 'Aprobar' }).at(-1)!);
    expect(await screen.findByText('Ya fue resuelta.')).toBeOnTheScreen();
    expect(await screen.findByText('No hay prestadores pendientes de validación.')).toBeOnTheScreen();
  });

  it('un 409 por expediente incompleto avisa y el prestador sigue en la lista', async () => {
    mockListar.mockResolvedValue(pagina([pendiente(1)]));
    mockValidar.mockRejectedValue(new ApiError(409, 'EXPEDIENTE_INCOMPLETO', 'Falta el DNI (frente y dorso) o la declaración jurada del prestador.'));
    await renderPantalla(<ValidacionesScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Aprobar' }));
    await fireEvent.press(screen.getAllByRole('button', { name: 'Aprobar' }).at(-1)!);
    expect(await screen.findByText(/Falta el DNI/)).toBeOnTheScreen();
    expect(screen.getByText('Prestador1 Apellido')).toBeOnTheScreen();
  });
});
