import { act, fireEvent, screen } from '@testing-library/react-native';

import { obtenerMisMetricas, type MetricasDePrestador } from '../../../api/gestion';
import { renderPantalla } from '../../../testing/pantalla';
import { DashboardPrestadorScreen } from '../DashboardPrestadorScreen';

jest.mock('../../../api/gestion', () => ({ obtenerMisMetricas: jest.fn() }));
jest.mock('../../../store/sesion', () => ({ useSesion: () => ({ sesion: { usuario: { nombreApellido: 'Pedro Gas' } } }) }));

const mockFoco: { disparar: () => void } = { disparar: () => undefined };
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (efecto: () => void) => {
    require('react').useEffect(efecto, [efecto]);
    mockFoco.disparar = efecto;
  },
}));

const mockMetricas = obtenerMisMetricas as jest.Mock;

const METRICAS: MetricasDePrestador = {
  desde: '2026-06-01',
  hasta: '2026-11-16',
  totalSolicitudes: 9,
  porEstado: [
    { nombre: 'PENDIENTE', cantidad: 1 },
    { nombre: 'ACEPTADA', cantidad: 1 },
    { nombre: 'EN_CURSO', cantidad: 2 },
    { nombre: 'FINALIZADA', cantidad: 3 },
    { nombre: 'VALORADA', cantidad: 2 },
  ],
  porCliente: [
    { nombre: 'Ana Pérez', cantidad: 5 },
    { nombre: 'Beto Díaz', cantidad: 4 },
  ],
  porServicio: [
    { servicio: 'Gas', solicitudes: 8, realizados: 5 },
    { servicio: 'Plomería', solicitudes: 1, realizados: 0 },
  ],
  porMes: [
    { mes: '2026-10', cantidad: 4 },
    { mes: '2026-11', cantidad: 5 },
  ],
  valoracionPromedio: 4.5,
};

beforeEach(() => {
  mockMetricas.mockReset();
});

describe('DashboardPrestadorScreen', () => {
  it('saluda y muestra esqueletos mientras carga', async () => {
    mockMetricas.mockReturnValue(new Promise(() => undefined));
    await renderPantalla(<DashboardPrestadorScreen />);
    expect(screen.getByText('Hola, Pedro')).toBeOnTheScreen();
    expect(screen.getByTestId('cargando')).toBeOnTheScreen();
  });

  it('muestra los indicadores y el trabajo por cliente, servicio, mes y estado', async () => {
    mockMetricas.mockResolvedValue(METRICAS);
    await renderPantalla(<DashboardPrestadorScreen />);

    expect(await screen.findByLabelText('Solicitudes: 9')).toBeOnTheScreen();
    expect(screen.getByLabelText('En curso: 3')).toBeOnTheScreen();
    expect(screen.getByLabelText('Realizados: 5')).toBeOnTheScreen();
    expect(screen.getByLabelText('Valoración: 4,5')).toBeOnTheScreen();
    expect(screen.getByLabelText('Ana Pérez: 5')).toBeOnTheScreen();
    expect(screen.getByLabelText('Gas: 8 · 5 realizados')).toBeOnTheScreen();
    expect(screen.getByLabelText('Plomería: 1 · 0 realizados')).toBeOnTheScreen();
    expect(screen.getByLabelText('En curso: 2')).toBeOnTheScreen(); // barra del estado EN_CURSO
    expect(screen.getByTestId('por-mes').props.accessibilityLabel).toBe('Solicitudes por mes. oct 26: 4, nov 26: 5');
  });

  it('sin solicitudes ni valoraciones lo dice', async () => {
    mockMetricas.mockResolvedValue({
      ...METRICAS,
      totalSolicitudes: 0,
      porEstado: [],
      porCliente: [],
      porServicio: [],
      porMes: [{ mes: '2026-11', cantidad: 0 }],
      valoracionPromedio: null,
    });
    await renderPantalla(<DashboardPrestadorScreen />);
    expect(await screen.findByLabelText('Valoración: —')).toBeOnTheScreen();
    expect(screen.getAllByText('Todavía no recibiste solicitudes en este período.')).toHaveLength(3);
  });

  it('cambiar el período vuelve a pedir con otra fecha de inicio', async () => {
    mockMetricas.mockResolvedValue(METRICAS);
    await renderPantalla(<DashboardPrestadorScreen />);
    await screen.findByLabelText('Solicitudes: 9');
    const primera = mockMetricas.mock.calls[0][0].desde;
    await fireEvent.press(screen.getByRole('button', { name: 'Últimos 3 meses' }));
    expect(mockMetricas).toHaveBeenCalledTimes(2);
    expect(mockMetricas.mock.calls[1][0].desde > primera).toBe(true);
  });

  it('si falla la primera carga ofrece reintentar; si falla al refrescar conserva los datos', async () => {
    mockMetricas.mockRejectedValueOnce(new Error('red'));
    await renderPantalla(<DashboardPrestadorScreen />);
    expect(await screen.findByText('No pudimos cargar tus números.')).toBeOnTheScreen();

    mockMetricas.mockResolvedValueOnce(METRICAS);
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByLabelText('Solicitudes: 9')).toBeOnTheScreen();

    mockMetricas.mockRejectedValueOnce(new Error('red'));
    await act(async () => screen.getByTestId('dashboard-prestador').props.refreshControl.props.onRefresh());
    expect(await screen.findByText(/No pudimos actualizar tus números/)).toBeOnTheScreen();
    expect(screen.getByLabelText('Solicitudes: 9')).toBeOnTheScreen();
  });
});
