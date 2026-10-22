import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ApiError } from '../../../api/errores';
import { listarValidacionesPendientes, validarPrestador, type PrestadorPendiente } from '../../../api/gestion';
import type { Pagina } from '../../../api/paginacion';
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

function pendiente(n: number): PrestadorPendiente {
  return {
    uuid: `p${n}`,
    nombreApellido: `Prestador${n} Apellido`,
    email: `p${n}@mail.com`,
    tipoServicio: { uuid: 't1', nombre: 'Plomero', icono: 'water', requiereMatricula: true },
    postuladoEn: '2026-09-18T13:12:04Z',
  };
}

function pagina(contenido: PrestadorPendiente[], numero = 0, totalPaginas = 1): Pagina<PrestadorPendiente> {
  return { contenido, pagina: numero, tamanio: 20, totalElementos: contenido.length, totalPaginas };
}

function lista() {
  return screen.getByTestId('lista-validaciones');
}

beforeEach(() => {
  mockListar.mockReset();
  mockValidar.mockReset();
});

describe('ValidacionesScreen', () => {
  it('muestra un indicador mientras carga la primera página', async () => {
    mockListar.mockReturnValue(new Promise(() => undefined));
    await render(<ValidacionesScreen />);
    expect(screen.getByText('Validaciones')).toBeOnTheScreen();
    expect(screen.queryByTestId('lista-validaciones')).toBeNull();
    expect(screen.queryByText('No hay prestadores pendientes.')).toBeNull();
  });

  it('muestra nombre, email, rubro y fecha de postulación de cada pendiente', async () => {
    mockListar.mockResolvedValue(pagina([pendiente(1)]));
    await render(<ValidacionesScreen />);
    expect(await screen.findByText('Prestador1 Apellido')).toBeOnTheScreen();
    expect(screen.getByText('p1@mail.com')).toBeOnTheScreen();
    expect(screen.getByText('Plomero')).toBeOnTheScreen();
    expect(screen.getByText('Postulado el 18/09/2026')).toBeOnTheScreen();
  });

  it('muestra el estado vacío', async () => {
    mockListar.mockResolvedValue(pagina([]));
    await render(<ValidacionesScreen />);
    expect(await screen.findByText('No hay prestadores pendientes.')).toBeOnTheScreen();
  });

  it('si falla la primera carga muestra el error con reintento, sin el estado vacío', async () => {
    mockListar.mockRejectedValueOnce(new Error('red'));
    await render(<ValidacionesScreen />);
    expect(await screen.findByText('No pudimos cargar las validaciones.')).toBeOnTheScreen();
    expect(screen.queryByText('No hay prestadores pendientes.')).toBeNull();
    mockListar.mockResolvedValue(pagina([pendiente(1)]));
    await fireEvent.press(screen.getByText('Reintentar'));
    expect(await screen.findByText('Prestador1 Apellido')).toBeOnTheScreen();
    expect(screen.queryByText('No pudimos cargar las validaciones.')).toBeNull();
  });

  it('pide la página siguiente al llegar al final', async () => {
    mockListar.mockResolvedValueOnce(pagina([pendiente(1)], 0, 2)).mockResolvedValueOnce(pagina([pendiente(2)], 1, 2));
    await render(<ValidacionesScreen />);
    await screen.findByText('Prestador1 Apellido');
    await act(async () => lista().props.onEndReached());
    expect(await screen.findByText('Prestador2 Apellido')).toBeOnTheScreen();
    expect(mockListar).toHaveBeenLastCalledWith({ page: 1, size: 20 });
  });

  it('deslizar hacia abajo recarga la lista', async () => {
    mockListar.mockResolvedValue(pagina([pendiente(1)]));
    await render(<ValidacionesScreen />);
    await screen.findByText('Prestador1 Apellido');
    mockListar.mockResolvedValue(pagina([]));
    await act(async () => lista().props.onRefresh());
    expect(await screen.findByText('No hay prestadores pendientes.')).toBeOnTheScreen();
    expect(mockListar).toHaveBeenCalledTimes(2);
  });

  it('si falla el refresco conserva la lista y avisa', async () => {
    mockListar.mockResolvedValueOnce(pagina([pendiente(1)])).mockRejectedValueOnce(new Error('red'));
    await render(<ValidacionesScreen />);
    await screen.findByText('Prestador1 Apellido');
    await act(async () => lista().props.onRefresh());
    expect(await screen.findByText('No pudimos actualizar la lista.')).toBeOnTheScreen();
    expect(screen.getByText('Prestador1 Apellido')).toBeOnTheScreen();
  });

  it('vuelve a pedir la lista al volver a la pantalla', async () => {
    mockListar.mockResolvedValue(pagina([pendiente(1)]));
    await render(<ValidacionesScreen />);
    await screen.findByText('Prestador1 Apellido');
    mockListar.mockResolvedValue(pagina([pendiente(2)]));
    await act(async () => mockFoco.disparar());
    expect(await screen.findByText('Prestador2 Apellido')).toBeOnTheScreen();
    expect(screen.queryByText('Prestador1 Apellido')).toBeNull();
  });

  it('aprobar pide confirmación, llama a E6 y trae la lista de nuevo', async () => {
    mockListar
      .mockResolvedValueOnce(pagina([pendiente(1), pendiente(2)]))
      .mockResolvedValueOnce(pagina([pendiente(2), pendiente(3)]));
    mockValidar.mockResolvedValue({ uuid: 'p1', estadoValidacion: 'APROBADO' });
    await render(<ValidacionesScreen />);
    await screen.findByText('Prestador1 Apellido');
    await fireEvent.press(screen.getAllByText('Aprobar')[0]);
    expect(mockValidar).not.toHaveBeenCalled();
    expect(screen.getByText('¿Aprobar a Prestador1 Apellido? Va a aparecer en las búsquedas.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Confirmar aprobación'));
    await waitFor(() => expect(mockValidar).toHaveBeenCalledWith('p1', { decision: 'APROBAR' }));
    expect(await screen.findByText('Prestador3 Apellido')).toBeOnTheScreen();
    expect(screen.queryByText('Prestador1 Apellido')).toBeNull();
    expect(screen.getByText('Prestador aprobado.')).toBeOnTheScreen();
  });

  it('cancelar la aprobación no llama a E6', async () => {
    mockListar.mockResolvedValue(pagina([pendiente(1)]));
    await render(<ValidacionesScreen />);
    await screen.findByText('Prestador1 Apellido');
    await fireEvent.press(screen.getByText('Aprobar'));
    await fireEvent.press(screen.getByText('Cancelar'));
    expect(screen.queryByText('Confirmar aprobación')).toBeNull();
    expect(mockValidar).not.toHaveBeenCalled();
  });

  it('rechazar exige confirmar y envía el motivo, limitado a 255 caracteres', async () => {
    mockListar.mockResolvedValueOnce(pagina([pendiente(1)])).mockResolvedValueOnce(pagina([]));
    mockValidar.mockResolvedValue({ uuid: 'p1', estadoValidacion: 'RECHAZADO' });
    await render(<ValidacionesScreen />);
    await screen.findByText('Prestador1 Apellido');
    await fireEvent.press(screen.getByText('Rechazar'));
    expect(mockValidar).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Motivo (opcional)').props.maxLength).toBe(255);
    await fireEvent.changeText(screen.getByLabelText('Motivo (opcional)'), 'Sin matrícula');
    await fireEvent.press(screen.getByText('Confirmar rechazo'));
    await waitFor(() =>
      expect(mockValidar).toHaveBeenCalledWith('p1', { decision: 'RECHAZAR', motivo: 'Sin matrícula' }),
    );
    expect(await screen.findByText('No hay prestadores pendientes.')).toBeOnTheScreen();
    expect(screen.getByText('Prestador rechazado.')).toBeOnTheScreen();
  });

  it('mientras se envía la decisión, confirmar y cancelar quedan deshabilitados', async () => {
    mockListar.mockResolvedValue(pagina([pendiente(1)]));
    let terminar: (valor: unknown) => void = () => undefined;
    mockValidar.mockReturnValue(new Promise((resolver) => (terminar = resolver)));
    await render(<ValidacionesScreen />);
    await screen.findByText('Prestador1 Apellido');
    await fireEvent.press(screen.getByText('Rechazar'));
    fireEvent.press(screen.getByText('Confirmar rechazo'));
    await waitFor(() => expect(mockValidar).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Confirmar rechazo' })).toBeDisabled();
    await act(async () => terminar({ uuid: 'p1', estadoValidacion: 'RECHAZADO' }));
  });

  it('VALIDACION_YA_RESUELTA avisa y recarga la lista', async () => {
    mockListar.mockResolvedValueOnce(pagina([pendiente(1)])).mockResolvedValueOnce(pagina([]));
    mockValidar.mockRejectedValue(new ApiError(409, 'VALIDACION_YA_RESUELTA', 'Ya fue resuelta.'));
    await render(<ValidacionesScreen />);
    await screen.findByText('Prestador1 Apellido');
    await fireEvent.press(screen.getByText('Aprobar'));
    await fireEvent.press(screen.getByText('Confirmar aprobación'));
    expect(await screen.findByText('Ya fue resuelta.')).toBeOnTheScreen();
    await waitFor(() => expect(mockListar).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('No hay prestadores pendientes.')).toBeOnTheScreen();
  });

  it('otro error de E6 se muestra y deja la confirmación abierta', async () => {
    mockListar.mockResolvedValue(pagina([pendiente(1)]));
    mockValidar.mockRejectedValue(new ApiError(404, 'NO_ENCONTRADO', 'No existe.'));
    await render(<ValidacionesScreen />);
    await screen.findByText('Prestador1 Apellido');
    await fireEvent.press(screen.getByText('Aprobar'));
    await fireEvent.press(screen.getByText('Confirmar aprobación'));
    expect(await screen.findByText('No existe.')).toBeOnTheScreen();
    expect(screen.getByText('Confirmar aprobación')).toBeOnTheScreen();
  });

  it('Ver expediente abre el expediente del prestador', async () => {
    mockListar.mockResolvedValue(pagina([pendiente(1)]));
    await render(<ValidacionesScreen />);
    await screen.findByText('Prestador1 Apellido');
    await fireEvent.press(screen.getByText('Ver expediente'));
    expect(mockNavigate).toHaveBeenCalledWith('Expediente', { uuidPrestador: 'p1', nombreApellido: 'Prestador1 Apellido' });
  });

  it('un 409 por expediente incompleto se muestra y el prestador sigue en la lista', async () => {
    mockListar.mockResolvedValue(pagina([pendiente(1)]));
    mockValidar.mockRejectedValue(new ApiError(409, 'EXPEDIENTE_INCOMPLETO', 'Falta el DNI (frente y dorso) o la declaración jurada del prestador.'));
    await render(<ValidacionesScreen />);
    await screen.findByText('Prestador1 Apellido');
    await fireEvent.press(screen.getByText('Aprobar'));
    await fireEvent.press(screen.getByText('Confirmar aprobación'));
    expect(await screen.findByText(/Falta el DNI/)).toBeOnTheScreen();
    expect(screen.getByText('Prestador1 Apellido')).toBeOnTheScreen();
  });
});
