import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Pagina } from '../../../api/paginacion';
import { listarValoracionesDePrestador, type Resena } from '../../../api/reputacion';
import { ResenasScreen } from '../ResenasScreen';

jest.mock('../../../api/reputacion', () => ({ listarValoracionesDePrestador: jest.fn() }));
jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: { uuidPrestador: 'p1' } }),
  useFocusEffect: (efecto: () => void | (() => void)) => require('react').useEffect(() => efecto(), [efecto]),
}));

const mockListar = listarValoracionesDePrestador as jest.Mock;

const resena = (n: number, cambios: Partial<Resena> = {}): Resena => ({
  uuid: `r-${n}`,
  puntaje: 4,
  comentario: `Comentario ${n}`,
  nombreCliente: `Cliente ${n}`,
  creadoEn: '2026-10-10T12:00:00Z',
  ...cambios,
});

const pagina = (contenido: Resena[]): Pagina<Resena> => ({
  contenido,
  pagina: 0,
  tamanio: 20,
  totalElementos: contenido.length,
  totalPaginas: 1,
});

beforeEach(() => {
  mockListar.mockReset();
});

describe('ResenasScreen', () => {
  it('muestra estrellas, nombre, fecha y comentario de cada reseña', async () => {
    mockListar.mockResolvedValue(pagina([resena(1), resena(2, { puntaje: 2, comentario: null })]));
    await render(<ResenasScreen />);

    expect(await screen.findByText('Cliente 1')).toBeOnTheScreen();
    expect(screen.getByText('Comentario 1')).toBeOnTheScreen();
    expect(screen.getAllByText('10/10/2026')).toHaveLength(2);
    expect(screen.getByLabelText('4 de 5 estrellas')).toBeOnTheScreen();
    expect(screen.getByText('Cliente 2')).toBeOnTheScreen();
    expect(screen.getByLabelText('2 de 5 estrellas')).toBeOnTheScreen();
    expect(screen.queryByText('Comentario 2')).toBeNull();
    expect(mockListar).toHaveBeenCalledWith('p1', { page: 0, size: 20 });
  });

  it('sin reseñas muestra el estado vacío', async () => {
    mockListar.mockResolvedValue(pagina([]));
    await render(<ResenasScreen />);

    expect(await screen.findByText('Este prestador todavía no tiene reseñas.')).toBeOnTheScreen();
  });

  it('si falla la carga permite reintentar', async () => {
    mockListar.mockRejectedValueOnce(new Error('red')).mockResolvedValueOnce(pagina([resena(1)]));
    await render(<ResenasScreen />);

    expect(await screen.findByText('No pudimos cargar las reseñas.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Reintentar'));
    expect(await screen.findByText('Cliente 1')).toBeOnTheScreen();
  });
});
