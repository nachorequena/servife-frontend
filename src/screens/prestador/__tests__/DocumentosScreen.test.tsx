import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';

import { memoria } from '../../../../__mocks__/expo-file-system';
import { ApiError } from '../../../api/errores';
import { obtenerMiExpediente, subirDocumento, type Expediente } from '../../../api/gestion';
import { DocumentosScreen } from '../DocumentosScreen';

jest.mock('../../../api/gestion', () => ({ obtenerMiExpediente: jest.fn(), subirDocumento: jest.fn() }));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (efecto: () => void) => require('react').useEffect(efecto, [efecto]),
}));

const mockExpediente = obtenerMiExpediente as jest.Mock;
const mockSubir = subirDocumento as jest.Mock;
const mockElegir = ImagePicker.launchImageLibraryAsync as jest.Mock;

const vacio: Expediente = { declaracionJuradaEn: null, documentos: [] };

function elegir(uri = 'file:///tmp/dni.jpg', bytes = 1000) {
  memoria.archivos.set(uri, new Uint8Array(1));
  memoria.tamanios.set(uri, bytes);
  mockElegir.mockResolvedValue({ canceled: false, assets: [{ uri, mimeType: 'image/jpeg', fileName: 'dni.jpg' }] });
}

beforeEach(() => {
  jest.clearAllMocks();
  memoria.reiniciar();
});

describe('DocumentosScreen', () => {
  it('sin aceptar la declaración jurada no deja cargar', async () => {
    mockExpediente.mockResolvedValue(vacio);
    await render(<DocumentosScreen />);
    expect(await screen.findByText('Aceptá la declaración jurada para poder cargar tus documentos.')).toBeOnTheScreen();
    expect(screen.getAllByRole('button', { name: 'Elegir foto' })[0]).toBeDisabled();
  });

  it('con la declaración aceptada sube el DNI y recarga lo cargado', async () => {
    mockExpediente
      .mockResolvedValueOnce(vacio)
      .mockResolvedValue({
        declaracionJuradaEn: '2026-10-21T10:00:00Z',
        documentos: [{ uuid: 'd1', tipo: 'DNI_FRENTE', estado: 'PENDIENTE', creadoEn: '2026-10-21T10:00:00Z' }],
      });
    mockSubir.mockResolvedValue({ uuid: 'd1' });
    elegir();
    await render(<DocumentosScreen />);
    await fireEvent(await screen.findByLabelText('Declaro bajo juramento no tener antecedentes penales.'), 'valueChange', true);
    await fireEvent.press(screen.getAllByText('Elegir foto')[0]);
    await waitFor(() => expect(mockSubir).toHaveBeenCalledWith('file:///tmp/dni.jpg', 'image/jpeg', 'DNI_FRENTE', 'dni.jpg'));
    expect(await screen.findByText('Cargado el 21/10/2026.')).toBeOnTheScreen();
    expect(screen.getByText('Documento cargado.')).toBeOnTheScreen();
    expect(screen.getByText('Reemplazar foto')).toBeOnTheScreen();
  });

  it('si ya la aceptó, la declaración queda tildada y fija', async () => {
    mockExpediente.mockResolvedValue({ declaracionJuradaEn: '2026-10-21T10:00:00Z', documentos: [] });
    await render(<DocumentosScreen />);
    const llave = await screen.findByLabelText('Declaro bajo juramento no tener antecedentes penales.');
    expect(llave.props.value).toBe(true);
    expect(screen.getAllByRole('button', { name: 'Elegir foto' })[0]).not.toBeDisabled();
  });

  it('una imagen de más de 5 MB no se sube', async () => {
    mockExpediente.mockResolvedValue({ declaracionJuradaEn: '2026-10-21T10:00:00Z', documentos: [] });
    elegir('file:///tmp/grande.jpg', 5 * 1024 * 1024 + 1);
    await render(<DocumentosScreen />);
    await fireEvent.press((await screen.findAllByText('Elegir foto'))[1]);
    expect(await screen.findByText('La imagen pesa más de 5 MB. Elegí otra.')).toBeOnTheScreen();
    expect(mockSubir).not.toHaveBeenCalled();
  });

  it('muestra el error del backend, por ejemplo el expediente cerrado', async () => {
    mockExpediente.mockResolvedValue({ declaracionJuradaEn: '2026-10-21T10:00:00Z', documentos: [] });
    mockSubir.mockRejectedValue(new ApiError(409, 'EXPEDIENTE_CERRADO', 'Tu perfil ya fue revisado: no se pueden cargar documentos.'));
    elegir();
    await render(<DocumentosScreen />);
    await fireEvent.press(await screen.findByText('Agregar certificación'));
    expect(await screen.findByText('Tu perfil ya fue revisado: no se pueden cargar documentos.')).toBeOnTheScreen();
  });

  it('con 5 certificaciones ya no ofrece agregar', async () => {
    mockExpediente.mockResolvedValue({
      declaracionJuradaEn: '2026-10-21T10:00:00Z',
      documentos: [1, 2, 3, 4, 5].map((n) => ({ uuid: `c${n}`, tipo: 'CERTIFICACION', estado: 'PENDIENTE', creadoEn: '2026-10-21T10:00:00Z' })),
    });
    await render(<DocumentosScreen />);
    expect(await screen.findByText('Certificaciones (5 de 5)')).toBeOnTheScreen();
    expect(screen.queryByText('Agregar certificación')).toBeNull();
  });

  it('si falla la carga muestra el error con reintento', async () => {
    mockExpediente.mockRejectedValueOnce(new Error('red')).mockResolvedValue(vacio);
    await render(<DocumentosScreen />);
    await fireEvent.press(await screen.findByText('Reintentar'));
    expect(await screen.findByText('Certificaciones (0 de 5)')).toBeOnTheScreen();
  });
});
