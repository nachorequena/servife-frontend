import { configurarAlExpirarSesion, renovarSesionParaRecursos } from '../cliente';
import { guardarTokens, obtenerAccessToken, obtenerRefreshToken } from '../tokens';
import { fetchMock, respuesta } from '../../testing/api';

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

const alExpirar = jest.fn();

beforeEach(async () => {
  mockAlmacen.clear();
  fetchMock.mockReset();
  alExpirar.mockReset();
  globalThis.fetch = fetchMock;
  configurarAlExpirarSesion(alExpirar);
  await guardarTokens({ accessToken: 'viejo', refreshToken: 'refresh-1' });
});

describe('renovarSesionParaRecursos', () => {
  it('renovado: guarda el par nuevo y devuelve true', async () => {
    fetchMock.mockResolvedValue(respuesta(200, { accessToken: 'nuevo', refreshToken: 'refresh-2' }));
    expect(await renovarSesionParaRecursos()).toBe(true);
    expect(obtenerAccessToken()).toBe('nuevo');
    expect(alExpirar).not.toHaveBeenCalled();
  });

  it.each([401, 403])('refresh rechazado con %i: limpia los tokens, avisa y devuelve false', async (status) => {
    fetchMock.mockResolvedValue(respuesta(status, {}));
    expect(await renovarSesionParaRecursos()).toBe(false);
    expect(obtenerAccessToken()).toBeNull();
    expect(await obtenerRefreshToken()).toBeNull();
    expect(alExpirar).toHaveBeenCalledTimes(1);
  });

  it('sin refresh token: expira la sesión', async () => {
    mockAlmacen.clear();
    expect(await renovarSesionParaRecursos()).toBe(false);
    expect(obtenerAccessToken()).toBeNull();
    expect(alExpirar).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('error 500: conserva los tokens y no avisa', async () => {
    fetchMock.mockResolvedValue(respuesta(500, {}));
    expect(await renovarSesionParaRecursos()).toBe(false);
    expect(obtenerAccessToken()).toBe('viejo');
    expect(await obtenerRefreshToken()).toBe('refresh-1');
    expect(alExpirar).not.toHaveBeenCalled();
  });

  it('red caída: conserva los tokens y no avisa', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    expect(await renovarSesionParaRecursos()).toBe(false);
    expect(obtenerAccessToken()).toBe('viejo');
    expect(alExpirar).not.toHaveBeenCalled();
  });

  it('llamadas concurrentes comparten un solo refresh', async () => {
    fetchMock.mockResolvedValue(respuesta(200, { accessToken: 'nuevo', refreshToken: 'refresh-2' }));
    const resultados = await Promise.all([renovarSesionParaRecursos(), renovarSesionParaRecursos()]);
    expect(resultados).toEqual([true, true]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
