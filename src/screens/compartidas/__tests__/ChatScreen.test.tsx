import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { ApiError } from '../../../api/errores';
import type { Chat, Mensaje } from '../../../api/mensajeria';
import { ChatScreen } from '../ChatScreen';

let mockRecibir: (chat: Chat) => void = () => {};
let mockFallar: (error: unknown) => void = () => {};
const mockSuscribir = jest.fn();
const mockDesuscribir = jest.fn();
const mockEnviar = jest.fn();
jest.mock('../../../api/mensajeria', () => ({
  ...jest.requireActual('../../../api/mensajeria'),
  canalPorPolling: {
    suscribir: (uuid: string, alRecibir: (chat: Chat) => void, alFallar: (error: unknown) => void) => {
      mockSuscribir(uuid);
      mockRecibir = alRecibir;
      mockFallar = alFallar;
      return mockDesuscribir;
    },
    enviar: (uuid: string, texto: string) => mockEnviar(uuid, texto),
  },
}));

const mockSetOptions = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: { uuidChat: 'chat-1' } }),
  useNavigation: () => ({ setOptions: mockSetOptions }),
  useFocusEffect: (efecto: () => void | (() => void)) => require('react').useEffect(() => efecto(), [efecto]),
}));

const mensaje = (uuid: string, texto: string, propio: boolean, minuto: number): Mensaje => ({
  uuid,
  texto,
  propio,
  creadoEn: `2026-10-21T13:${String(minuto).padStart(2, '0')}:00Z`,
});

const chat = (mensajes: Mensaje[], cambios: Partial<Chat> = {}): Chat => ({
  uuidChat: 'chat-1',
  uuidSolicitud: 's1',
  estadoSolicitud: 'ACEPTADA',
  sePuedeEscribir: true,
  contraparte: { uuid: 'p1', nombreApellido: 'Pablo Prestador' },
  mensajes,
  ...cambios,
});

beforeEach(() => {
  mockSuscribir.mockReset();
  mockDesuscribir.mockReset();
  mockEnviar.mockReset();
  mockSetOptions.mockReset();
});

async function abrirCon(c: Chat) {
  await render(<ChatScreen />);
  await act(async () => mockRecibir(c));
}

describe('ChatScreen', () => {
  it('se suscribe al chat de la ruta, muestra los mensajes y pone el nombre de la contraparte en el título', async () => {
    await abrirCon(chat([mensaje('m1', '¿Viene mañana?', false, 0), mensaje('m2', 'Sí, a las 10', true, 1)]));
    expect(mockSuscribir).toHaveBeenCalledWith('chat-1');
    expect(screen.getByLabelText('Recibido: ¿Viene mañana?')).toBeOnTheScreen();
    expect(screen.getByLabelText('Vos: Sí, a las 10')).toBeOnTheScreen();
    expect(mockSetOptions).toHaveBeenCalledWith({ title: 'Pablo Prestador' });
  });

  it('suma lo que llega en el polling sin repetir', async () => {
    await abrirCon(chat([mensaje('m1', 'uno', false, 0)]));
    await act(async () => mockRecibir(chat([mensaje('m1', 'uno', false, 0), mensaje('m2', 'dos', false, 1)])));
    expect(screen.getAllByText('uno')).toHaveLength(1);
    expect(screen.getByText('dos')).toBeOnTheScreen();
  });

  it('envía el texto recortado, lo muestra y vacía el campo', async () => {
    mockEnviar.mockResolvedValue(mensaje('m9', 'Hola', true, 5));
    await abrirCon(chat([]));
    expect(screen.getByText('Todavía no hay mensajes. Escribí el primero.')).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Mensaje'), '  Hola  ');
    await fireEvent.press(screen.getByText('Enviar'));

    expect(mockEnviar).toHaveBeenCalledWith('chat-1', 'Hola');
    expect(await screen.findByLabelText('Vos: Hola')).toBeOnTheScreen();
    expect(screen.getByLabelText('Mensaje').props.value).toBe('');
  });

  it('el campo tiene el límite del backend', async () => {
    await abrirCon(chat([]));
    expect(screen.getByLabelText('Mensaje').props.maxLength).toBe(1000);
  });

  it('con la solicitud cerrada muestra los mensajes pero no el campo', async () => {
    await abrirCon(chat([mensaje('m1', 'Gracias', false, 0)], { sePuedeEscribir: false, estadoSolicitud: 'FINALIZADA' }));
    expect(screen.getByText('Gracias')).toBeOnTheScreen();
    expect(screen.getByText('El chat está cerrado: podés ver los mensajes, pero ya no escribir.')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Mensaje')).toBeNull();
  });

  it('si al enviar el chat se cerró, muestra el error y vuelve a suscribirse', async () => {
    mockEnviar.mockRejectedValue(new ApiError(409, 'CHAT_CERRADO', 'El chat está cerrado: la solicitud está finalizada.'));
    await abrirCon(chat([]));
    await fireEvent.changeText(screen.getByLabelText('Mensaje'), 'Hola');
    await fireEvent.press(screen.getByText('Enviar'));

    expect(await screen.findByText('El chat está cerrado: la solicitud está finalizada.')).toBeOnTheScreen();
    expect(mockDesuscribir).toHaveBeenCalled();
    expect(mockSuscribir).toHaveBeenCalledTimes(2);
  });

  it('si la primera carga falla ofrece reintentar', async () => {
    await render(<ChatScreen />);
    await act(async () => mockFallar(new Error('sin red')));
    expect(screen.getByText('No pudimos cargar el chat.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Reintentar'));
    expect(mockSuscribir).toHaveBeenCalledTimes(2);
  });

  it('si falla un ciclo con el chat ya cargado, conserva los mensajes y avisa', async () => {
    await abrirCon(chat([mensaje('m1', 'uno', false, 0)]));
    await act(async () => mockFallar(new Error('sin red')));
    expect(screen.getByText('uno')).toBeOnTheScreen();
    expect(screen.getByText('No pudimos actualizar el chat. Reintentamos en unos segundos.')).toBeOnTheScreen();
  });

  it('al salir de la pantalla deja de escuchar', async () => {
    const { unmount } = await render(<ChatScreen />);
    await unmount();
    expect(mockDesuscribir).toHaveBeenCalled();
  });
});
