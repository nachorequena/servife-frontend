import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { vaciarDocumentosDescargados } from '../../../api/cacheImagenes';
import { ApiError } from '../../../api/errores';
import { descargarDocumento, obtenerExpediente, validarPrestador, type Expediente } from '../../../api/gestion';
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
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({ params: { uuidPrestador: 'p1', nombreApellido: 'Pedro Gasista' } }),
  useFocusEffect: (efecto: () => void) => require('react').useEffect(efecto, [efecto]),
}));

const mockExpediente = obtenerExpediente as jest.Mock;
const mockDescargar = descargarDocumento as jest.Mock;
const mockValidar = validarPrestador as jest.Mock;

const completo: Expediente = {
  declaracionJuradaEn: '2026-10-20T10:00:00Z',
  documentos: [
    { uuid: 'd1', tipo: 'DNI_FRENTE', estado: 'PENDIENTE', creadoEn: '2026-10-20T10:00:00Z' },
    { uuid: 'd2', tipo: 'DNI_DORSO', estado: 'PENDIENTE', creadoEn: '2026-10-20T10:00:00Z' },
    { uuid: 'd3', tipo: 'CERTIFICACION', estado: 'PENDIENTE', creadoEn: '2026-10-20T10:00:00Z' },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockDescargar.mockImplementation((_p: string, d: string) => Promise.resolve(`file:///cache/documentos/${d}`));
});

describe('ExpedienteScreen', () => {
  it('muestra la declaración jurada y las imágenes bajadas como documentos', async () => {
    mockExpediente.mockResolvedValue(completo);
    await render(<ExpedienteScreen />);
    expect(await screen.findByText('Aceptada el 20/10/2026.')).toBeOnTheScreen();
    expect((await screen.findByLabelText('DNI (frente)')).props.source).toEqual({ uri: 'file:///cache/documentos/d1' });
    expect(await screen.findByLabelText('Certificación')).toBeOnTheScreen();
    expect(mockExpediente).toHaveBeenCalledWith('p1');
    expect(mockDescargar).toHaveBeenCalledWith('p1', 'd2');
  });

  it('avisa lo que falta', async () => {
    mockExpediente.mockResolvedValue({ declaracionJuradaEn: null, documentos: [] });
    await render(<ExpedienteScreen />);
    expect(await screen.findByText('Todavía no la aceptó.')).toBeOnTheScreen();
    expect(screen.getByText('No cargó el DNI.')).toBeOnTheScreen();
    expect(screen.getByText('No cargó certificaciones.')).toBeOnTheScreen();
  });

  it('aprobar desde el expediente vuelve a Validaciones', async () => {
    mockExpediente.mockResolvedValue(completo);
    mockValidar.mockResolvedValue({ uuid: 'p1', estadoValidacion: 'APROBADO' });
    await render(<ExpedienteScreen />);
    await fireEvent.press(await screen.findByText('Aprobar'));
    await fireEvent.press(screen.getByText('Confirmar aprobación'));
    await waitFor(() => expect(mockValidar).toHaveBeenCalledWith('p1', { decision: 'APROBAR' }));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('un 409 por matrícula se muestra y no sale de la pantalla', async () => {
    mockExpediente.mockResolvedValue(completo);
    mockValidar.mockRejectedValue(new ApiError(409, 'FALTA_MATRICULA', 'El rubro Gas requiere matrícula y no hay ninguna certificación.'));
    await render(<ExpedienteScreen />);
    await fireEvent.press(await screen.findByText('Aprobar'));
    await fireEvent.press(screen.getByText('Confirmar aprobación'));
    expect(await screen.findByText(/requiere matrícula/)).toBeOnTheScreen();
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('si falla la carga muestra el error con reintento', async () => {
    mockExpediente.mockRejectedValueOnce(new Error('red')).mockResolvedValue(completo);
    await render(<ExpedienteScreen />);
    await fireEvent.press(await screen.findByText('Reintentar'));
    expect(await screen.findByText('Aceptada el 20/10/2026.')).toBeOnTheScreen();
  });

  it('al salir borra los documentos descargados', async () => {
    mockExpediente.mockResolvedValue(completo);
    const { unmount } = await render(<ExpedienteScreen />);
    await screen.findByText('Aceptada el 20/10/2026.');
    await unmount();
    expect(vaciarDocumentosDescargados).toHaveBeenCalled();
  });
});
