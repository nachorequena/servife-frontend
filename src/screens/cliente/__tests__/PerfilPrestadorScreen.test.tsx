import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { obtenerPrestador, type PrestadorDetalle } from '../../../api/catalogo';
import { ApiError } from '../../../api/errores';
import type { Pagina } from '../../../api/paginacion';
import {
  listarPublicacionesDePrestador,
  listarValoracionesDePrestador,
  type Publicacion,
  type Resena,
} from '../../../api/reputacion';
import { PerfilPrestadorScreen } from '../PerfilPrestadorScreen';

jest.mock('../../../api/catalogo', () => ({ obtenerPrestador: jest.fn() }));
jest.mock('../../../api/reputacion', () => ({
  listarValoracionesDePrestador: jest.fn(),
  listarPublicacionesDePrestador: jest.fn(),
}));
jest.mock('../../../api/archivos', () => ({ descargarImagen: jest.fn(() => new Promise(() => {})) }));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: { uuidPrestador: 'p1' } }),
  useFocusEffect: (efecto: () => void | (() => void)) => require('react').useEffect(() => efecto(), [efecto]),
}));

const mockObtener = obtenerPrestador as jest.Mock;
const mockValoraciones = listarValoracionesDePrestador as jest.Mock;
const mockPublicaciones = listarPublicacionesDePrestador as jest.Mock;

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

const resena: Resena = {
  uuid: 'v1',
  puntaje: 5,
  comentario: 'Impecable, muy prolijo.',
  nombreCliente: 'Ana Pérez',
  creadoEn: '2026-10-10T12:00:00Z',
};

const trabajo = (n: number, cambios: Partial<Publicacion> = {}): Publicacion => ({
  uuid: `pub-${n}`,
  titulo: `Trabajo ${n}`,
  descripcion: null,
  fechaTrabajo: null,
  imagenIds: [`img-${n}`],
  puntaje: null,
  uuidSolicitud: null,
  creadoEn: '2026-10-01T12:00:00Z',
  ...cambios,
});

function pagina<T>(contenido: T[], totalElementos = contenido.length): Pagina<T> {
  return { contenido, pagina: 0, tamanio: 20, totalElementos, totalPaginas: 1 };
}

const metricas = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

const renderizar = () =>
  render(
    <SafeAreaProvider initialMetrics={metricas}>
      <PerfilPrestadorScreen />
    </SafeAreaProvider>,
  );

beforeEach(() => {
  mockObtener.mockReset();
  mockNavigate.mockReset();
  mockGoBack.mockReset();
  mockValoraciones.mockReset().mockResolvedValue(pagina([resena], 2));
  mockPublicaciones.mockReset().mockResolvedValue(pagina([]));
});

describe('PerfilPrestadorScreen', () => {
  it('muestra los datos del prestador', async () => {
    mockObtener.mockResolvedValue(detalle);
    await renderizar();
    expect(await screen.findByText('Geronimo Lopez')).toBeOnTheScreen();
    expect(mockObtener).toHaveBeenCalledWith('p1');
    expect(screen.getByText('Servicio: Electricista')).toBeOnTheScreen();
    expect(screen.getByText('Disponibilidad: Lun, Mié, Vie')).toBeOnTheScreen();
    expect(screen.getByText('Zona: Santa Fe Capital')).toBeOnTheScreen();
    expect(screen.getByText('Instalaciones y reparaciones eléctricas.')).toBeOnTheScreen();
    expect(screen.getByText('12 servicios realizados')).toBeOnTheScreen();
    expect(screen.getByText('Verificado')).toBeOnTheScreen();
    expect(screen.queryByText(/Tarifa/)).toBeNull();
    expect(screen.queryByText('Ver trabajos realizados')).toBeNull();
    expect(screen.queryByText('Ver valoraciones')).toBeNull();
  });

  it('usa el singular con un solo servicio realizado', async () => {
    mockObtener.mockResolvedValue({ ...detalle, serviciosRealizados: 1 });
    await renderizar();
    expect(await screen.findByText('1 servicio realizado')).toBeOnTheScreen();
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
    mockValoraciones.mockResolvedValue(pagina([]));
    await renderizar();
    expect(await screen.findByText('Sin días cargados')).toBeOnTheScreen();
    expect(await screen.findByText('Sin valoraciones aún')).toBeOnTheScreen();
    expect(screen.getByText('0 servicios realizados')).toBeOnTheScreen();
    expect(screen.queryByText(/Zona:/)).toBeNull();
    expect(screen.queryByText('Verificado')).toBeNull();
    expect(screen.queryByLabelText(/de 5 estrellas/)).toBeNull();
  });

  it('muestra la valoración más reciente con el promedio y el total, y tocarla abre todas', async () => {
    mockObtener.mockResolvedValue(detalle);
    await renderizar();
    expect(await screen.findByText('Ana Pérez')).toBeOnTheScreen();
    expect(mockValoraciones).toHaveBeenCalledWith('p1', { size: 1 });
    expect(screen.getByText('2 valoraciones')).toBeOnTheScreen();
    expect(screen.getByLabelText('4 de 5 estrellas')).toBeOnTheScreen();
    expect(screen.getByLabelText('5 de 5 estrellas')).toBeOnTheScreen();
    expect(screen.getByText('Impecable, muy prolijo.')).toBeOnTheScreen();

    await fireEvent.press(screen.getByText('Ana Pérez'));
    expect(mockNavigate).toHaveBeenCalledWith('ValoracionesDelPrestador', { uuidPrestador: 'p1' });
    mockNavigate.mockReset();
    await fireEvent.press(screen.getByText('Ver las 2 valoraciones'));
    expect(mockNavigate).toHaveBeenCalledWith('ValoracionesDelPrestador', { uuidPrestador: 'p1' });
  });

  it('con una sola valoración usa el singular y no ofrece el enlace a todas', async () => {
    mockObtener.mockResolvedValue(detalle);
    mockValoraciones.mockResolvedValue(pagina([{ ...resena, comentario: null }]));
    await renderizar();
    expect(await screen.findByText('1 valoración')).toBeOnTheScreen();
    expect(screen.queryByText(/Ver las/)).toBeNull();
    expect(screen.queryByText('Impecable, muy prolijo.')).toBeNull();
  });

  it('si fallan las valoraciones el perfil sigue y ofrece reintentar', async () => {
    mockObtener.mockResolvedValue(detalle);
    mockValoraciones.mockRejectedValueOnce(new ApiError(500, 'ERROR', 'Falló.'));
    await renderizar();
    expect(await screen.findByText('No pudimos cargar las valoraciones.')).toBeOnTheScreen();
    expect(screen.getByText('Geronimo Lopez')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Reintentar'));
    expect(await screen.findByText('Ana Pérez')).toBeOnTheScreen();
  });

  it('muestra los trabajos en grilla y tocar uno abre su detalle', async () => {
    mockObtener.mockResolvedValue(detalle);
    const sinFoto = trabajo(2, { imagenIds: [] });
    mockPublicaciones.mockResolvedValue(pagina([trabajo(1), sinFoto]));
    await renderizar();
    const grilla = await screen.findByTestId('grilla-trabajos');
    const conFoto = await within(grilla).findByLabelText('Trabajo 1');
    expect(within(conFoto).getByTestId('imagen-protegida-espera')).toBeOnTheScreen();
    expect(within(conFoto).queryByText('Trabajo 1')).toBeNull();
    expect(within(grilla).getByText('Trabajo 2')).toBeOnTheScreen();
    expect(mockPublicaciones).toHaveBeenCalledWith('p1', expect.objectContaining({ page: 0 }));

    await fireEvent.press(within(grilla).getByLabelText('Trabajo 2'));
    expect(mockNavigate).toHaveBeenCalledWith('DetalleTrabajo', { publicacion: sinFoto, nombrePrestador: 'Geronimo Lopez' });
  });

  it('sin trabajos lo avisa', async () => {
    mockObtener.mockResolvedValue(detalle);
    await renderizar();
    expect(await screen.findByText('Este prestador todavía no publicó trabajos.')).toBeOnTheScreen();
  });

  it('"Solicitar servicio" queda al pie y abre el formulario', async () => {
    mockObtener.mockResolvedValue(detalle);
    await renderizar();
    await fireEvent.press(await screen.findByText('Solicitar servicio'));
    expect(mockNavigate).toHaveBeenCalledWith('FormularioSolicitud', { uuidPrestador: 'p1' });
  });

  it('404 avisa que ya no está disponible y permite volver', async () => {
    mockObtener.mockRejectedValue(new ApiError(404, 'NO_ENCONTRADO', 'No existe.'));
    await renderizar();
    expect(await screen.findByText('Este prestador ya no está disponible.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Volver'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('otro error ofrece reintentar', async () => {
    mockObtener.mockRejectedValueOnce(new ApiError(500, 'ERROR', 'Falló.'));
    mockObtener.mockResolvedValueOnce(detalle);
    await renderizar();
    expect(await screen.findByText('No pudimos cargar el perfil.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Reintentar'));
    expect(await screen.findByText('Geronimo Lopez')).toBeOnTheScreen();
  });
});
