import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ApiError } from '../../../api/errores';
import { listarMisSolicitudes, type SolicitudEnLista } from '../../../api/solicitudes';
import { HistorialScreen } from '../HistorialScreen';

jest.mock('../../../api/solicitudes', () => ({ listarMisSolicitudes: jest.fn() }));

const mockSetParams = jest.fn();
const mockNavigate = jest.fn();
let mockParams: { aviso?: string } | undefined;
const mockNavegacion = { setParams: mockSetParams, navigate: mockNavigate, addListener: () => () => undefined };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavegacion,
  useRoute: () => ({ params: mockParams }),
  useFocusEffect: (efecto: () => void | (() => void)) => require('react').useEffect(() => efecto(), [efecto]),
}));

const mockListar = listarMisSolicitudes as jest.Mock;

const item = (n: number, estado: SolicitudEnLista['estado'] = 'PENDIENTE'): SolicitudEnLista => ({
  uuid: `s${n}`,
  estado,
  contraparte: { uuid: `p${n}`, nombreApellido: `Prestador ${n}`, telefono: null },
  tipoServicio: { uuid: 't', nombre: 'Plomero', icono: null } as SolicitudEnLista['tipoServicio'],
  fechaDeseada: '2025-11-11',
  horaPreferida: null,
  descripcion: 'x',
  direccion: 'y',
  creadoEn: '2025-11-01T10:00:00Z',
});

const pagina = (contenido: SolicitudEnLista[], numero = 0, totalPaginas = 1) => ({
  contenido,
  pagina: numero,
  tamanio: 20,
  totalElementos: contenido.length,
  totalPaginas,
});

beforeEach(() => {
  mockSetParams.mockReset();
  mockNavigate.mockReset();
  mockListar.mockReset();
  mockListar.mockResolvedValue(pagina([]));
  mockParams = undefined;
});

describe('HistorialScreen', () => {
  it('muestra el aviso, limpia el parámetro y lo oculta a los 4 s', async () => {
    jest.useFakeTimers();
    try {
      mockParams = { aviso: 'Solicitud enviada.' };
      await render(<HistorialScreen />);
      expect(screen.getByText('Solicitud enviada.')).toBeOnTheScreen();
      expect(mockSetParams).toHaveBeenCalledWith({ aviso: undefined });
      await act(async () => {
        await jest.advanceTimersByTimeAsync(4100);
      });
      expect(screen.queryByText('Solicitud enviada.')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('sin aviso no muestra nada', async () => {
    await render(<HistorialScreen />);
    expect(screen.queryByText('Solicitud enviada.')).toBeNull();
    expect(mockSetParams).not.toHaveBeenCalled();
  });

  it('lista las tarjetas con prestador, rubro, fecha y estado, y abre el detalle', async () => {
    mockListar.mockResolvedValue(pagina([item(1), item(2, 'EN_CURSO')]));
    await render(<HistorialScreen />);
    expect(await screen.findByText('Prestador 1')).toBeOnTheScreen();
    expect(screen.getAllByText('Plomero')).toHaveLength(2);
    expect(screen.getAllByText('11/11/2025')).toHaveLength(2);
    expect(screen.getByText('Pendiente')).toBeOnTheScreen();
    expect(screen.getAllByText('En curso').length).toBeGreaterThan(0);
    await fireEvent.press(screen.getByText('Prestador 2'));
    expect(mockNavigate).toHaveBeenCalledWith('DetalleSolicitud', { uuidSolicitud: 's2' });
  });

  it('sin solicitudes muestra el estado vacío', async () => {
    await render(<HistorialScreen />);
    expect(await screen.findByText('Todavía no pediste ningún servicio.')).toBeOnTheScreen();
  });

  it.each([
    ['Pendientes', ['PENDIENTE']],
    ['Aceptadas', ['ACEPTADA']],
    ['En curso', ['EN_CURSO']],
    ['Finalizadas', ['FINALIZADA', 'VALORADA']],
    ['Canceladas', ['CANCELADA', 'RECHAZADA']],
  ])('el filtro %s pide %j', async (etiqueta, estados) => {
    await render(<HistorialScreen />);
    await screen.findByText('Todavía no pediste ningún servicio.');
    await fireEvent.press(screen.getByLabelText(etiqueta));
    await waitFor(() => expect(mockListar).toHaveBeenLastCalledWith(expect.objectContaining({ estados, page: 0 })));
    expect(await screen.findByText('No hay solicitudes en este estado.')).toBeOnTheScreen();
  });

  it('Todas pide sin estados', async () => {
    await render(<HistorialScreen />);
    await screen.findByText('Todavía no pediste ningún servicio.');
    expect(mockListar).toHaveBeenLastCalledWith(expect.objectContaining({ estados: undefined, page: 0 }));
  });

  it('error con Reintentar', async () => {
    mockListar.mockRejectedValueOnce(new ApiError(500, 'X', 'boom'));
    await render(<HistorialScreen />);
    expect(await screen.findByText('No pudimos cargar tus solicitudes.')).toBeOnTheScreen();
    mockListar.mockResolvedValue(pagina([item(1)]));
    await fireEvent.press(screen.getByText('Reintentar'));
    expect(await screen.findByText('Prestador 1')).toBeOnTheScreen();
  });

  it('pagina al llegar al final', async () => {
    mockListar.mockResolvedValueOnce(pagina([item(1)], 0, 2));
    await render(<HistorialScreen />);
    await screen.findByText('Prestador 1');
    mockListar.mockResolvedValueOnce(pagina([item(2)], 1, 2));
    await fireEvent(screen.getByTestId('lista-solicitudes'), 'endReached');
    expect(await screen.findByText('Prestador 2')).toBeOnTheScreen();
    expect(mockListar).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }));
  });
});
