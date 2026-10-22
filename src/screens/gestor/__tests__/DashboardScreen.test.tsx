import { act, fireEvent, screen } from '@testing-library/react-native';

import { listarValidacionesPendientes, obtenerMetricas, type PrestadorPendiente } from '../../../api/gestion';
import { renderPantalla } from '../../../testing/pantalla';
import { DashboardScreen } from '../DashboardScreen';

jest.mock('../../../api/gestion', () => ({ obtenerMetricas: jest.fn(), listarValidacionesPendientes: jest.fn() }));
jest.mock('../../../store/sesion', () => ({ useSesion: () => ({ sesion: { usuario: { nombreApellido: 'Gina Gestora' } } }) }));

const mockNavigate = jest.fn();
const mockFoco: { disparar: () => void } = { disparar: () => undefined };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: (efecto: () => void) => {
    require('react').useEffect(efecto, [efecto]);
    mockFoco.disparar = efecto;
  },
}));

const mockMetricas = obtenerMetricas as jest.Mock;
const mockPendientes = listarValidacionesPendientes as jest.Mock;

function pendiente(n: number): PrestadorPendiente {
  return {
    uuid: `p${n}`,
    nombreApellido: `Prestador ${n}`,
    email: `p${n}@mail.com`,
    tipoServicio: { uuid: 't', nombre: 'Plomería', icono: 'water', requiereMatricula: false },
    postuladoEn: new Date().toISOString(),
  };
}

function pagina(contenido: PrestadorPendiente[]) {
  return { contenido, pagina: 0, tamanio: 3, totalElementos: contenido.length, totalPaginas: 1 };
}

beforeEach(() => {
  mockMetricas.mockReset();
  mockPendientes.mockReset();
  mockNavigate.mockReset();
});

describe('DashboardScreen', () => {
  it('saluda por el nombre y muestra esqueletos mientras carga', async () => {
    mockMetricas.mockReturnValue(new Promise(() => undefined));
    mockPendientes.mockReturnValue(new Promise(() => undefined));
    await renderPantalla(<DashboardScreen />);
    expect(screen.getByText('Hola, Gina')).toBeOnTheScreen();
    expect(screen.getByTestId('cargando')).toBeOnTheScreen();
  });

  it('muestra los contadores y las validaciones más viejas', async () => {
    mockMetricas.mockResolvedValue({ serviciosActivos: 4, solicitudesPendientes: 2, validacionesPendientes: 5 });
    mockPendientes.mockResolvedValue(pagina([pendiente(1), pendiente(2), pendiente(3)]));
    await renderPantalla(<DashboardScreen />);
    expect(await screen.findByLabelText('Servicios activos: 4')).toBeOnTheScreen();
    expect(screen.getByLabelText('Sin responder: 2')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Por validar: 5' })).toBeOnTheScreen();
    expect(screen.getByText('Prestador 1')).toBeOnTheScreen();
    expect(mockPendientes).toHaveBeenCalledWith({ page: 0, size: 3 });
    expect(screen.queryByText(/Incidencias/)).toBeNull();
  });

  it('el contador, una validación o "Ver todas" llevan a Validaciones', async () => {
    mockMetricas.mockResolvedValue({ serviciosActivos: 0, solicitudesPendientes: 0, validacionesPendientes: 5 });
    mockPendientes.mockResolvedValue(pagina([pendiente(1)]));
    await renderPantalla(<DashboardScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Prestador 1' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Ver todas' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Por validar: 5' }));
    expect(mockNavigate).toHaveBeenCalledTimes(3);
    expect(mockNavigate).toHaveBeenCalledWith('Validaciones');
  });

  it('sin pendientes muestra el vacío y no ofrece "Ver todas"', async () => {
    mockMetricas.mockResolvedValue({ serviciosActivos: 1, solicitudesPendientes: 0, validacionesPendientes: 0 });
    mockPendientes.mockResolvedValue(pagina([]));
    await renderPantalla(<DashboardScreen />);
    expect(await screen.findByText('No hay prestadores pendientes.')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Ver todas' })).toBeNull();
  });

  it('si falla la primera carga muestra el error con reintento', async () => {
    mockMetricas.mockRejectedValueOnce(new Error('red'));
    mockPendientes.mockResolvedValue(pagina([]));
    await renderPantalla(<DashboardScreen />);
    expect(await screen.findByText('No pudimos cargar el dashboard.')).toBeOnTheScreen();
    mockMetricas.mockResolvedValue({ serviciosActivos: 7, solicitudesPendientes: 0, validacionesPendientes: 0 });
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByLabelText('Servicios activos: 7')).toBeOnTheScreen();
  });

  it('si falla al refrescar conserva los datos y avisa', async () => {
    mockMetricas.mockResolvedValueOnce({ serviciosActivos: 4, solicitudesPendientes: 0, validacionesPendientes: 0 });
    mockPendientes.mockResolvedValue(pagina([]));
    await renderPantalla(<DashboardScreen />);
    await screen.findByLabelText('Servicios activos: 4');
    mockMetricas.mockRejectedValueOnce(new Error('red'));
    await act(async () => screen.getByTestId('dashboard').props.refreshControl.props.onRefresh());
    expect(await screen.findByText(/No pudimos actualizar el dashboard/)).toBeOnTheScreen();
    expect(screen.getByLabelText('Servicios activos: 4')).toBeOnTheScreen();
  });

  it('al volver a la pantalla vuelve a pedir los datos', async () => {
    mockMetricas.mockResolvedValueOnce({ serviciosActivos: 1, solicitudesPendientes: 0, validacionesPendientes: 0 });
    mockPendientes.mockResolvedValue(pagina([]));
    await renderPantalla(<DashboardScreen />);
    await screen.findByLabelText('Servicios activos: 1');
    mockMetricas.mockResolvedValueOnce({ serviciosActivos: 9, solicitudesPendientes: 0, validacionesPendientes: 0 });
    await act(async () => mockFoco.disparar());
    expect(await screen.findByLabelText('Servicios activos: 9')).toBeOnTheScreen();
  });
});
