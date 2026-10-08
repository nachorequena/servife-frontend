import { fireEvent, render, screen } from '@testing-library/react-native';

import { obtenerPrestador, type PrestadorDetalle } from '../../../api/catalogo';
import { ApiError } from '../../../api/errores';
import { PerfilPrestadorScreen } from '../PerfilPrestadorScreen';

jest.mock('../../../api/catalogo', () => ({ obtenerPrestador: jest.fn() }));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: { uuidPrestador: 'p1' } }),
}));

const mockObtener = obtenerPrestador as jest.Mock;

const detalle: PrestadorDetalle = {
  uuid: 'p1',
  nombreApellido: 'Geronimo Lopez',
  tipoServicio: { uuid: 't1', nombre: 'Electricista', icono: 'flash', requiereMatricula: true },
  zona: 'Santa Fe Capital',
  descripcion: 'Instalaciones y reparaciones eléctricas.',
  dias: [5, 1, 3],
  valoracionPromedio: 4,
  serviciosRealizados: 12,
  verificado: true,
};

beforeEach(() => {
  mockObtener.mockReset();
  mockNavigate.mockReset();
  mockGoBack.mockReset();
});

describe('PerfilPrestadorScreen', () => {
  it('muestra los datos del prestador', async () => {
    mockObtener.mockResolvedValue(detalle);
    await render(<PerfilPrestadorScreen />);
    expect(await screen.findByText('Geronimo Lopez')).toBeOnTheScreen();
    expect(mockObtener).toHaveBeenCalledWith('p1');
    expect(screen.getByText('Servicio: Electricista')).toBeOnTheScreen();
    expect(screen.getByText('Disponibilidad: Lun, Mié, Vie')).toBeOnTheScreen();
    expect(screen.getByText('Zona: Santa Fe Capital')).toBeOnTheScreen();
    expect(screen.getByText('Instalaciones y reparaciones eléctricas.')).toBeOnTheScreen();
    expect(screen.getByLabelText('4 de 5 estrellas')).toBeOnTheScreen();
    expect(screen.getByText('12 servicios realizados')).toBeOnTheScreen();
    expect(screen.getByText('Verificado')).toBeOnTheScreen();
    expect(screen.queryByText(/Tarifa/)).toBeNull();
  });

  it('sin datos opcionales muestra los textos de reemplazo y omite las filas vacías', async () => {
    mockObtener.mockResolvedValue({
      ...detalle,
      zona: null,
      descripcion: null,
      dias: [],
      valoracionPromedio: null,
      serviciosRealizados: 0,
      verificado: false,
    });
    await render(<PerfilPrestadorScreen />);
    expect(await screen.findByText('Sin días cargados')).toBeOnTheScreen();
    expect(screen.getByText('Sin valoraciones todavía')).toBeOnTheScreen();
    expect(screen.queryByText(/Zona:/)).toBeNull();
    expect(screen.queryByText('Verificado')).toBeNull();
    expect(screen.queryByLabelText(/de 5 estrellas/)).toBeNull();
  });

  it('404 avisa que ya no está disponible y permite volver', async () => {
    mockObtener.mockRejectedValue(new ApiError(404, 'NO_ENCONTRADO', 'No existe.'));
    await render(<PerfilPrestadorScreen />);
    expect(await screen.findByText('Este prestador ya no está disponible.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Volver'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('otro error ofrece reintentar', async () => {
    mockObtener.mockRejectedValueOnce(new ApiError(500, 'ERROR', 'Falló.'));
    mockObtener.mockResolvedValueOnce(detalle);
    await render(<PerfilPrestadorScreen />);
    expect(await screen.findByText('No pudimos cargar el perfil.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Reintentar'));
    expect(await screen.findByText('Geronimo Lopez')).toBeOnTheScreen();
  });

  it('los botones navegan a trabajos realizados y al formulario de solicitud', async () => {
    mockObtener.mockResolvedValue(detalle);
    await render(<PerfilPrestadorScreen />);
    await fireEvent.press(await screen.findByText('Ver trabajos realizados'));
    expect(mockNavigate).toHaveBeenCalledWith('TrabajosRealizados', { uuidPrestador: 'p1' });
    await fireEvent.press(screen.getByText('Solicitar servicio'));
    expect(mockNavigate).toHaveBeenCalledWith('FormularioSolicitud', { uuidPrestador: 'p1' });
  });
});
