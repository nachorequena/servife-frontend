import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';

import { memoria } from '../../../../__mocks__/expo-file-system';
import { ApiError } from '../../../api/errores';
import { obtenerMiExpediente, subirDocumento, type Expediente } from '../../../api/gestion';
import { renderPantalla } from '../../../testing/pantalla';
import { DocumentosScreen } from '../DocumentosScreen';

jest.mock('../../../api/gestion', () => ({ obtenerMiExpediente: jest.fn(), subirDocumento: jest.fn() }));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (efecto: () => void) => require('react').useEffect(efecto, [efecto]),
}));

const mockExpediente = obtenerMiExpediente as jest.Mock;
const mockSubir = subirDocumento as jest.Mock;
const mockElegir = ImagePicker.launchImageLibraryAsync as jest.Mock;

const DECLARACION = 'Declaro bajo juramento no tener antecedentes penales.';
const fecha = '2026-10-21T10:00:00Z';
const vacio: Expediente = { declaracionJuradaEn: null, documentos: [] };
const conDeclaracion: Expediente = { declaracionJuradaEn: fecha, documentos: [] };

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
  it('muestra esqueletos mientras carga', async () => {
    mockExpediente.mockReturnValue(new Promise(() => undefined));
    await renderPantalla(<DocumentosScreen />);
    expect(screen.getByTestId('cargando')).toBeOnTheScreen();
  });

  it('sin aceptar la declaración jurada no deja cargar y el progreso está en 0', async () => {
    mockExpediente.mockResolvedValue(vacio);
    await renderPantalla(<DocumentosScreen />);
    expect(await screen.findByText('Aceptá la declaración jurada para poder cargar tus documentos.')).toBeOnTheScreen();
    expect(screen.getByText('0 de 3 listos')).toBeOnTheScreen();
    expect(screen.getAllByRole('button', { name: 'Elegir foto' })[0]).toBeDisabled();
  });

  it('con la declaración tildada sube el DNI, avisa, muestra la miniatura y avanza el progreso', async () => {
    mockExpediente.mockResolvedValueOnce(vacio).mockResolvedValue({
      declaracionJuradaEn: fecha,
      documentos: [{ uuid: 'd1', tipo: 'DNI_FRENTE', estado: 'PENDIENTE', creadoEn: fecha }],
    });
    mockSubir.mockResolvedValue({ uuid: 'd1', tipo: 'DNI_FRENTE', estado: 'PENDIENTE', creadoEn: fecha });
    elegir();
    await renderPantalla(<DocumentosScreen />);
    await fireEvent.press(await screen.findByRole('checkbox', { name: DECLARACION }));
    await fireEvent.press(screen.getAllByRole('button', { name: 'Elegir foto' })[0]);
    await waitFor(() => expect(mockSubir).toHaveBeenCalledWith('file:///tmp/dni.jpg', 'image/jpeg', 'DNI_FRENTE', 'dni.jpg'));
    expect(await screen.findByText('Documento cargado.')).toBeOnTheScreen();
    expect(await screen.findByText('Cargado el 21/10/2026')).toBeOnTheScreen();
    expect(screen.getByText('2 de 3 listos')).toBeOnTheScreen();
    expect(screen.getByLabelText('Foto cargada').props.source).toEqual({ uri: 'file:///tmp/dni.jpg' });
    expect(screen.getByRole('button', { name: 'Reemplazar' })).toBeOnTheScreen();
  });

  it('si ya la aceptó, la declaración queda tildada y fija', async () => {
    mockExpediente.mockResolvedValue(conDeclaracion);
    await renderPantalla(<DocumentosScreen />);
    const casilla = await screen.findByRole('checkbox', { name: DECLARACION });
    expect(casilla).toBeChecked();
    expect(casilla).toBeDisabled();
    expect(screen.getAllByRole('button', { name: 'Elegir foto' })[0]).not.toBeDisabled();
  });

  it('una imagen de más de 5 MB no se sube y se avisa', async () => {
    mockExpediente.mockResolvedValue(conDeclaracion);
    elegir('file:///tmp/grande.jpg', 5 * 1024 * 1024 + 1);
    await renderPantalla(<DocumentosScreen />);
    await fireEvent.press((await screen.findAllByRole('button', { name: 'Elegir foto' }))[1]);
    expect(await screen.findByText('La imagen pesa más de 5 MB. Elegí otra.')).toBeOnTheScreen();
    expect(mockSubir).not.toHaveBeenCalled();
  });

  it('un error del backend se avisa, por ejemplo el expediente cerrado', async () => {
    mockExpediente.mockResolvedValue(conDeclaracion);
    mockSubir.mockRejectedValue(new ApiError(409, 'EXPEDIENTE_CERRADO', 'Tu perfil ya fue revisado: no se pueden cargar documentos.'));
    elegir();
    await renderPantalla(<DocumentosScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Agregar certificación' }));
    expect(await screen.findByText('Tu perfil ya fue revisado: no se pueden cargar documentos.')).toBeOnTheScreen();
  });

  it('con 5 certificaciones ya no ofrece agregar', async () => {
    mockExpediente.mockResolvedValue({
      declaracionJuradaEn: fecha,
      documentos: [1, 2, 3, 4, 5].map((n) => ({ uuid: `c${n}`, tipo: 'CERTIFICACION', estado: 'PENDIENTE', creadoEn: fecha })),
    });
    await renderPantalla(<DocumentosScreen />);
    expect(await screen.findByText('Certificaciones (5 de 5)')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Agregar certificación' })).toBeNull();
  });

  it('si falla la carga muestra el error con reintento', async () => {
    mockExpediente.mockRejectedValueOnce(new Error('red')).mockResolvedValue(vacio);
    await renderPantalla(<DocumentosScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Certificaciones (0 de 5)')).toBeOnTheScreen();
  });
});
