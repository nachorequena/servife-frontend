import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { vaciarDocumentosDescargados } from '../../../api/cacheImagenes';
import { ApiError } from '../../../api/errores';
import { descargarDocumento, obtenerExpediente, validarPrestador, type Expediente } from '../../../api/gestion';
import { renderPantalla } from '../../../testing/pantalla';
import { ExpedienteScreen } from '../ExpedienteScreen';

jest.mock('../../../api/gestion', () => ({
  obtenerExpediente: jest.fn(),
  descargarDocumento: jest.fn(),
  validarPrestador: jest.fn(),
}));
jest.mock('../../../api/cacheImagenes', () => ({ vaciarDocumentosDescargados: jest.fn() }));
// ImagenProtegida real: se prueba que use el descargar del documento.
jest.mock('../../../api/archivos', () => ({ descargarImagen: jest.fn() }));

const mockGoBack = jest.fn();
let mockParams: Record<string, unknown>;
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({ params: mockParams }),
  useFocusEffect: (efecto: () => void) => require('react').useEffect(efecto, [efecto]),
}));

const mockExpediente = obtenerExpediente as jest.Mock;
const mockDescargar = descargarDocumento as jest.Mock;
const mockValidar = validarPrestador as jest.Mock;

const fecha = '2026-10-20T10:00:00Z';
const completo: Expediente = {
  declaracionJuradaEn: fecha,
  documentos: [
    { uuid: 'd1', tipo: 'DNI_FRENTE', estado: 'PENDIENTE', creadoEn: fecha },
    { uuid: 'd2', tipo: 'DNI_DORSO', estado: 'PENDIENTE', creadoEn: fecha },
    { uuid: 'd3', tipo: 'CERTIFICACION', estado: 'PENDIENTE', creadoEn: fecha },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { uuidPrestador: 'p1', nombreApellido: 'Pedro Gasista', rubro: 'Gas', requiereMatricula: true };
  mockDescargar.mockImplementation((_p: string, d: string) => Promise.resolve(`file:///cache/documentos/${d}`));
});

describe('ExpedienteScreen', () => {
  it('muestra el rubro, la declaración y las imágenes bajadas como documentos', async () => {
    mockExpediente.mockResolvedValue(completo);
    await renderPantalla(<ExpedienteScreen />);
    expect(await screen.findByText('Aceptada el 20/10/2026.')).toBeOnTheScreen();
    expect(screen.getByText('Gas')).toBeOnTheScreen();
    expect((await screen.findByLabelText('DNI (frente)')).props.source).toEqual({ uri: 'file:///cache/documentos/d1' });
    expect(mockDescargar).toHaveBeenCalledWith('p1', 'd2');
    expect(screen.queryByText(/no se puede aprobar/)).toBeNull();
  });

  it('marca lo que falta y avisa si el rubro pide matrícula y no hay certificación', async () => {
    mockExpediente.mockResolvedValue({ declaracionJuradaEn: null, documentos: [] });
    await renderPantalla(<ExpedienteScreen />);
    expect(await screen.findByText('Todavía no la aceptó.')).toBeOnTheScreen();
    expect(screen.getAllByText('No lo cargó.')).toHaveLength(2);
    expect(screen.getByText('No cargó certificaciones.')).toBeOnTheScreen();
    expect(screen.getByText(/requiere matrícula y no cargó ninguna certificación/)).toBeOnTheScreen();
    expect(screen.getAllByLabelText('Falta').length).toBeGreaterThanOrEqual(3);
  });

  it('sin matrícula la certificación es opcional', async () => {
    mockParams = { uuidPrestador: 'p1', nombreApellido: 'Pablo Plomero', rubro: 'Plomería', requiereMatricula: false };
    mockExpediente.mockResolvedValue({ declaracionJuradaEn: fecha, documentos: completo.documentos.slice(0, 2) });
    await renderPantalla(<ExpedienteScreen />);
    expect(await screen.findByText('Opcional')).toBeOnTheScreen();
    expect(screen.queryByText(/no se puede aprobar/)).toBeNull();
  });

  it('tocar una imagen la abre en pantalla completa y se cierra', async () => {
    mockExpediente.mockResolvedValue(completo);
    await renderPantalla(<ExpedienteScreen />);
    await fireEvent.press(await screen.findByRole('imagebutton', { name: 'Ampliar DNI (frente)' }));
    expect(await screen.findByRole('button', { name: 'Cerrar imagen' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar imagen' }));
    expect(screen.queryByRole('button', { name: 'Cerrar imagen' })).toBeNull();
  });

  it('aprobar desde el expediente avisa y vuelve a Validaciones', async () => {
    mockExpediente.mockResolvedValue(completo);
    mockValidar.mockResolvedValue({ uuid: 'p1', estadoValidacion: 'APROBADO' });
    await renderPantalla(<ExpedienteScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Aprobar' }));
    await fireEvent.press(screen.getAllByRole('button', { name: 'Aprobar' }).at(-1)!);
    await waitFor(() => expect(mockValidar).toHaveBeenCalledWith('p1', { decision: 'APROBAR' }));
    expect(await screen.findByText('Pedro Gasista fue aprobado.')).toBeOnTheScreen();
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('un 409 por matrícula se avisa y no sale de la pantalla', async () => {
    mockExpediente.mockResolvedValue(completo);
    mockValidar.mockRejectedValue(new ApiError(409, 'FALTA_MATRICULA', 'El rubro Gas requiere matrícula y no hay ninguna certificación.'));
    await renderPantalla(<ExpedienteScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Aprobar' }));
    await fireEvent.press(screen.getAllByRole('button', { name: 'Aprobar' }).at(-1)!);
    expect(await screen.findByText(/requiere matrícula y no hay ninguna/)).toBeOnTheScreen();
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('si falla la carga muestra el error con reintento', async () => {
    mockExpediente.mockRejectedValueOnce(new Error('red')).mockResolvedValue(completo);
    await renderPantalla(<ExpedienteScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Aceptada el 20/10/2026.')).toBeOnTheScreen();
  });

  it('al salir borra los documentos descargados', async () => {
    mockExpediente.mockResolvedValue(completo);
    const { unmount } = await renderPantalla(<ExpedienteScreen />);
    await screen.findByText('Aceptada el 20/10/2026.');
    await unmount();
    expect(vaciarDocumentosDescargados).toHaveBeenCalled();
  });
});
