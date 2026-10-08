import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';

import { subirImagen } from '../../../api/archivos';
import { obtenerDisponibilidad } from '../../../api/disponibilidad';
import { ApiError } from '../../../api/errores';
import { crearSolicitud } from '../../../api/solicitudes';
import { FormularioSolicitudScreen } from '../FormularioSolicitudScreen';

jest.mock('../../../api/solicitudes', () => ({ crearSolicitud: jest.fn() }));
jest.mock('../../../api/archivos', () => ({ subirImagen: jest.fn() }));
jest.mock('../../../api/disponibilidad', () => ({ obtenerDisponibilidad: jest.fn() }));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('../../../utils/formato', () => ({
  ...jest.requireActual('../../../utils/formato'),
  hoyEnArgentina: () => '2026-10-08', // jueves
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: { uuidPrestador: 'p1' } }),
}));
jest.mock('../../../store/sesion', () => ({
  useSesion: () => ({ sesion: { rol: 'CLIENTE', usuario: { direccion: 'Calle 1, Santa Fe' } } }),
}));

const mockCrear = crearSolicitud as jest.Mock;
const mockSubir = subirImagen as jest.Mock;
const mockDisp = obtenerDisponibilidad as jest.Mock;
const mockElegir = ImagePicker.launchImageLibraryAsync as jest.Mock;

const viernes = '2026-10-09';

async function abrir() {
  await render(<FormularioSolicitudScreen />);
  await screen.findByText('Trabaja: Lun, Mié, Vie');
}

async function completar(fecha = viernes) {
  await fireEvent.changeText(screen.getByLabelText('Fecha deseada (AAAA-MM-DD)'), fecha);
  await fireEvent.changeText(screen.getByLabelText('Descripción del trabajo'), 'Tomas que no funcionan');
}

function imagen(extra: object = {}) {
  return {
    canceled: false,
    assets: [{ uri: 'file:///a.jpg', mimeType: 'image/png', fileName: 'a.png', fileSize: 1000, ...extra }],
  };
}

beforeEach(() => {
  [mockCrear, mockSubir, mockDisp, mockElegir, mockNavigate, mockGoBack].forEach((m) => m.mockReset());
  mockDisp.mockResolvedValue({ dias: [5, 1, 3] });
});

describe('FormularioSolicitudScreen', () => {
  it('precarga la dirección y muestra los días del prestador', async () => {
    await abrir();
    expect(screen.getByText('Solicitar servicio')).toBeOnTheScreen();
    expect(screen.getByLabelText('Dirección').props.value).toBe('Calle 1, Santa Fe');
    expect(mockDisp).toHaveBeenCalledWith('p1');
  });

  it('sin días cargados avisa y deshabilita el envío', async () => {
    mockDisp.mockResolvedValue({ dias: [] });
    await render(<FormularioSolicitudScreen />);
    expect(await screen.findByText('El prestador no cargó sus días.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Enviar solicitud' })).toBeDisabled();
  });

  it.each([
    ['2026/10/09', 'Usá el formato AAAA-MM-DD'],
    ['2026-02-31', 'Usá el formato AAAA-MM-DD'],
    ['2026-10-07', 'Tiene que ser hoy o una fecha futura.'],
    ['2026-10-10', 'Ese día el prestador no trabaja.'],
  ])('valida la fecha %s', async (fecha, mensaje) => {
    await abrir();
    await completar(fecha);
    await fireEvent.press(screen.getByText('Enviar solicitud'));
    expect(screen.getByText(mensaje)).toBeOnTheScreen();
    expect(mockCrear).not.toHaveBeenCalled();
  });

  it('dirección y descripción son obligatorias', async () => {
    await abrir();
    await fireEvent.changeText(screen.getByLabelText('Dirección'), '');
    await fireEvent.press(screen.getByText('Enviar solicitud'));
    expect(screen.getAllByText('Es obligatoria.')).toHaveLength(2);
    expect(mockCrear).not.toHaveBeenCalled();
  });

  it('envía el payload con imagenIds y vuelve al Historial con aviso', async () => {
    mockElegir.mockResolvedValue(imagen());
    mockSubir.mockResolvedValue({ uuid: 'img-1', mime: 'image/png', bytes: 1000 });
    mockCrear.mockResolvedValue({});
    await abrir();
    await completar();
    await fireEvent.changeText(screen.getByLabelText('Hora preferida'), 'a la mañana');
    await fireEvent.press(screen.getByText('Adjuntar imágenes'));
    await waitFor(() => expect(mockSubir).toHaveBeenCalledWith('file:///a.jpg', 'image/png', 'a.png'));
    await fireEvent.press(screen.getByText('Enviar solicitud'));
    await waitFor(() =>
      expect(mockCrear).toHaveBeenCalledWith({
        uuidPrestador: 'p1',
        fechaDeseada: viernes,
        horaPreferida: 'a la mañana',
        direccion: 'Calle 1, Santa Fe',
        descripcion: 'Tomas que no funcionan',
        imagenIds: ['img-1'],
      }),
    );
    expect(mockNavigate).toHaveBeenCalledWith('Tabs', {
      screen: 'Historial',
      params: { aviso: 'Solicitud enviada.' },
    });
  });

  it('sin hora ni imágenes no manda esos campos', async () => {
    mockCrear.mockResolvedValue({});
    await abrir();
    await completar();
    await fireEvent.press(screen.getByText('Enviar solicitud'));
    await waitFor(() => expect(mockCrear).toHaveBeenCalled());
    expect(mockCrear.mock.calls[0][0]).toEqual({
      uuidPrestador: 'p1',
      fechaDeseada: viernes,
      direccion: 'Calle 1, Santa Fe',
      descripcion: 'Tomas que no funcionan',
    });
  });

  it('el error del backend sale bajo Fecha', async () => {
    mockCrear.mockRejectedValue(
      new ApiError(400, 'VALIDACION', 'Datos inválidos', [
        { campo: 'fechaDeseada', detalle: 'el prestador no trabaja ese día' },
      ]),
    );
    await abrir();
    await completar();
    await fireEvent.press(screen.getByText('Enviar solicitud'));
    expect(await screen.findByText('el prestador no trabaja ese día')).toBeOnTheScreen();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('un error sin campo se muestra como mensaje general', async () => {
    mockCrear.mockRejectedValue(new ApiError(500, 'ERROR', 'Falló el servidor.'));
    await abrir();
    await completar();
    await fireEvent.press(screen.getByText('Enviar solicitud'));
    expect(await screen.findByText('Falló el servidor.')).toBeOnTheScreen();
  });

  it('rechaza imágenes de más de 5 MB sin subirlas', async () => {
    mockElegir.mockResolvedValue(imagen({ fileSize: 6 * 1024 * 1024 }));
    await abrir();
    await fireEvent.press(screen.getByText('Adjuntar imágenes'));
    expect(await screen.findByText('La imagen pesa más de 5 MB. Elegí otra.')).toBeOnTheScreen();
    expect(mockSubir).not.toHaveBeenCalled();
  });

  it('si la subida falla permite reintentar y quitar', async () => {
    mockElegir.mockResolvedValue(imagen({ mimeType: undefined }));
    mockSubir.mockRejectedValueOnce(new ApiError(413, 'ARCHIVO_DEMASIADO_GRANDE', 'Pesa demasiado.'));
    await abrir();
    await fireEvent.press(screen.getByText('Adjuntar imágenes'));
    expect(await screen.findByText('Reintentar')).toBeOnTheScreen();
    expect(mockSubir).toHaveBeenCalledWith('file:///a.jpg', 'image/jpeg', 'a.png');
    mockSubir.mockResolvedValueOnce({ uuid: 'img-2', mime: 'image/jpeg', bytes: 1 });
    await fireEvent.press(screen.getByText('Reintentar'));
    await waitFor(() => expect(screen.queryByText('Reintentar')).toBeNull());
    await fireEvent.press(screen.getByText('Quitar'));
    expect(screen.queryByText('Quitar')).toBeNull();
  });

  it('bloquea el envío mientras sube y limita a 5 imágenes', async () => {
    mockElegir.mockResolvedValue(imagen());
    let resolver: (v: unknown) => void = () => undefined;
    mockSubir.mockReturnValueOnce(new Promise((r) => (resolver = r)));
    await abrir();
    await fireEvent.press(screen.getByText('Adjuntar imágenes'));
    expect(screen.getByRole('button', { name: 'Enviar solicitud' })).toBeDisabled();
    resolver({ uuid: 'i0', mime: 'image/png', bytes: 1 });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Enviar solicitud' })).toBeEnabled());
    mockSubir.mockResolvedValue({ uuid: 'ix', mime: 'image/png', bytes: 1 });
    for (let i = 0; i < 4; i++) {
      await fireEvent.press(screen.getByText('Adjuntar imágenes'));
    }
    await waitFor(() => expect(screen.getAllByText('Quitar')).toHaveLength(5));
    await fireEvent.press(screen.getByText('Adjuntar imágenes'));
    expect(screen.getByText('Podés adjuntar hasta 5 imágenes.')).toBeOnTheScreen();
    expect(mockElegir).toHaveBeenCalledTimes(5);
  });

  it('cancelar vuelve atrás', async () => {
    await abrir();
    await fireEvent.press(screen.getByText('Cancelar'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});
