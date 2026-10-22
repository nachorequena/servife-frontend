import { AppState, type AppStateStatus } from 'react-native';

import {
  agregarMensajes,
  canalPorPolling,
  enviarMensaje,
  listarConversaciones,
  listarMensajes,
  type Chat,
  type Mensaje,
} from '../mensajeria';
import { fetchMock, prepararApi, respuesta, ultimaLlamada } from '../../testing/api';

const mockAlmacen = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn((clave: string) => Promise.resolve(mockAlmacen.get(clave) ?? null)),
  setItemAsync: jest.fn((clave: string, valor: string) => {
    mockAlmacen.set(clave, valor);
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((clave: string) => {
    mockAlmacen.delete(clave);
    return Promise.resolve();
  }),
}));

const mensaje = (uuid: string, creadoEn: string, propio = false): Mensaje => ({ uuid, texto: uuid, propio, creadoEn });

const chat = (mensajes: Mensaje[]): Chat => ({
  uuidChat: 'chat-1',
  uuidSolicitud: 's1',
  estadoSolicitud: 'PENDIENTE',
  sePuedeEscribir: true,
  contraparte: { uuid: 'p1', nombreApellido: 'Pablo' },
  mensajes,
});

beforeEach(() => prepararApi(mockAlmacen));
afterEach(() => jest.useRealTimers());

describe('api/mensajeria', () => {
  it('E12 listarConversaciones: GET /conversaciones con página', async () => {
    await listarConversaciones({ page: 1, size: 20 });
    const { url, init } = ultimaLlamada();
    expect(init.method).toBe('GET');
    expect(url).toMatch(/\/conversaciones\?page=1&size=20$/);
    expect(init.headers.Authorization).toBe('Bearer access-1');
  });

  it('E1 listarMensajes: GET /chats/{uuid}/mensajes, con desde solo si se pasa', async () => {
    await listarMensajes('chat-1');
    expect(ultimaLlamada().url).toMatch(/\/chats\/chat-1\/mensajes$/);
    fetchMock.mockClear();
    await listarMensajes('chat-1', 'm-9');
    expect(ultimaLlamada().url).toMatch(/\/chats\/chat-1\/mensajes\?desde=m-9$/);
  });

  it('E2 enviarMensaje: POST /chats/{uuid}/mensajes con el texto', async () => {
    await enviarMensaje('chat-1', 'Hola');
    const { url, init } = ultimaLlamada();
    expect(init.method).toBe('POST');
    expect(url).toMatch(/\/chats\/chat-1\/mensajes$/);
    expect(JSON.parse(init.body)).toEqual({ texto: 'Hola' });
  });

  it('agregarMensajes no repite y ordena por fecha', () => {
    const a = mensaje('a', '2026-10-21T10:00:00Z');
    const b = mensaje('b', '2026-10-21T10:01:00Z');
    const c = mensaje('c', '2026-10-21T10:02:00Z', true);
    expect(agregarMensajes([a, c], [b, c]).map((m) => m.uuid)).toEqual(['a', 'b', 'c']);
    const sinCambios = [a];
    expect(agregarMensajes(sinCambios, [a])).toBe(sinCambios);
  });

  describe('canalPorPolling', () => {
    it('trae el chat completo, después cada 8 s solo lo nuevo, y deja de pedir al desuscribirse', async () => {
      jest.useFakeTimers();
      const recibidos: Chat[] = [];
      fetchMock
        .mockResolvedValueOnce(respuesta(200, chat([mensaje('m1', '2026-10-21T10:00:00Z')])))
        .mockResolvedValue(respuesta(200, chat([])));

      const desuscribir = canalPorPolling.suscribir('chat-1', (c) => recibidos.push(c));
      await jest.advanceTimersByTimeAsync(0);
      expect(recibidos).toHaveLength(1);
      expect(fetchMock.mock.calls[0][0]).toMatch(/\/chats\/chat-1\/mensajes$/);

      await jest.advanceTimersByTimeAsync(8000);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[1][0]).toMatch(/\?desde=m1$/);

      desuscribir();
      await jest.advanceTimersByTimeAsync(24_000);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('en segundo plano no pide y al volver pide en el momento', async () => {
      jest.useFakeTimers();
      let cambiarEstado: (estado: AppStateStatus) => void = () => {};
      // Solo para esta suscripción: el preset ya simula AppState y un mockRestore le borraría la implementación.
      jest.spyOn(AppState, 'addEventListener').mockImplementationOnce((_tipo, oyente) => {
        cambiarEstado = oyente as (estado: AppStateStatus) => void;
        return { remove: jest.fn() };
      });
      fetchMock.mockResolvedValue(respuesta(200, chat([])));

      const desuscribir = canalPorPolling.suscribir('chat-1', () => undefined);
      await jest.advanceTimersByTimeAsync(0);
      cambiarEstado('background');
      await jest.advanceTimersByTimeAsync(24_000);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      cambiarEstado('active');
      await jest.advanceTimersByTimeAsync(0);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      desuscribir();
    });

    it('un fallo avisa pero sigue intentando', async () => {
      jest.useFakeTimers();
      const alFallar = jest.fn();
      const recibidos: Chat[] = [];
      fetchMock.mockRejectedValueOnce(new TypeError('Network request failed')).mockResolvedValue(respuesta(200, chat([])));

      const desuscribir = canalPorPolling.suscribir('chat-1', (c) => recibidos.push(c), alFallar);
      await jest.advanceTimersByTimeAsync(0);
      expect(alFallar).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(8000);
      expect(recibidos).toHaveLength(1);
      desuscribir();
    });
  });
});
