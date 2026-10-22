import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Pagina } from '../../../api/paginacion';
import { listarMisPublicaciones, listarPublicacionesDePrestador, type Publicacion } from '../../../api/reputacion';
import { TrabajosRealizadosScreen } from '../TrabajosRealizadosScreen';

jest.mock('../../../api/reputacion', () => ({
  listarMisPublicaciones: jest.fn(),
  listarPublicacionesDePrestador: jest.fn(),
}));
jest.mock('../../../components/ImagenProtegida', () => ({
  ImagenProtegida: ({ uuid }: { uuid: string }) =>
    require('react').createElement(require('react-native').Text, null, `img:${uuid}`),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: (efecto: () => void | (() => void)) => require('react').useEffect(() => efecto(), [efecto]),
}));

const mockDePrestador = listarPublicacionesDePrestador as jest.Mock;
const mockMias = listarMisPublicaciones as jest.Mock;

const publicacion = (n: number, cambios: Partial<Publicacion> = {}): Publicacion => ({
  uuid: `pub-${n}`,
  titulo: `Trabajo ${n}`,
  descripcion: `Descripción ${n}`,
  fechaTrabajo: '2026-10-09',
  imagenIds: [`img-${n}`],
  puntaje: 4,
  uuidSolicitud: null,
  creadoEn: '2026-10-10T12:00:00Z',
  ...cambios,
});

const pagina = (contenido: Publicacion[]): Pagina<Publicacion> => ({
  contenido,
  pagina: 0,
  tamanio: 20,
  totalElementos: contenido.length,
  totalPaginas: 1,
});

beforeEach(() => {
  [mockDePrestador, mockMias, mockNavigate].forEach((m) => m.mockReset());
});

describe('TrabajosRealizadosScreen', () => {
  it('el cliente ve los trabajos del prestador con foto, fecha, descripción y estrellas solo si hay puntaje', async () => {
    mockDePrestador.mockResolvedValue(
      pagina([publicacion(1), publicacion(2, { puntaje: null, imagenIds: [], fechaTrabajo: null, descripcion: null })]),
    );
    await render(<TrabajosRealizadosScreen soloLectura uuidPrestador="p1" />);

    expect(await screen.findByText('Trabajo 1')).toBeOnTheScreen();
    expect(screen.getByText('img:img-1')).toBeOnTheScreen();
    expect(screen.getByText('09/10/2026')).toBeOnTheScreen();
    expect(screen.getByText('Descripción 1')).toBeOnTheScreen();
    expect(screen.getAllByLabelText('4 de 5 estrellas')).toHaveLength(1);
    expect(screen.getByText('Trabajo 2')).toBeOnTheScreen();
    expect(mockDePrestador).toHaveBeenCalledWith('p1', { page: 0, size: 20 });
    expect(mockMias).not.toHaveBeenCalled();
    expect(screen.queryByText('Publicar trabajo')).toBeNull();
  });

  it('tocar una tarjeta abre el detalle con el trabajo', async () => {
    const p = publicacion(1);
    mockDePrestador.mockResolvedValue(pagina([p]));
    await render(<TrabajosRealizadosScreen soloLectura uuidPrestador="p1" />);

    await fireEvent.press(await screen.findByText('Trabajo 1'));
    expect(mockNavigate).toHaveBeenCalledWith('DetalleTrabajo', { publicacion: p });
  });

  it('el prestador ve los suyos y puede publicar uno nuevo', async () => {
    mockMias.mockResolvedValue(pagina([publicacion(1)]));
    await render(<TrabajosRealizadosScreen soloLectura={false} />);

    expect(await screen.findByText('Trabajo 1')).toBeOnTheScreen();
    expect(mockMias).toHaveBeenCalledWith({ page: 0, size: 20 });
    await fireEvent.press(screen.getByText('Publicar trabajo'));
    expect(mockNavigate).toHaveBeenCalledWith('NuevoTrabajo');
  });

  it.each([
    [true, 'Este prestador todavía no publicó trabajos.'],
    [false, 'Todavía no publicaste trabajos.'],
  ])('sin trabajos (soloLectura %s) muestra el estado vacío', async (soloLectura, mensaje) => {
    mockDePrestador.mockResolvedValue(pagina([]));
    mockMias.mockResolvedValue(pagina([]));
    await render(<TrabajosRealizadosScreen soloLectura={soloLectura} uuidPrestador="p1" />);
    expect(await screen.findByText(mensaje)).toBeOnTheScreen();
  });

  it('si falla la carga permite reintentar', async () => {
    mockDePrestador.mockRejectedValueOnce(new Error('red')).mockResolvedValueOnce(pagina([publicacion(1)]));
    await render(<TrabajosRealizadosScreen soloLectura uuidPrestador="p1" />);

    expect(await screen.findByText('No pudimos cargar los trabajos.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Reintentar'));
    expect(await screen.findByText('Trabajo 1')).toBeOnTheScreen();
  });
});
