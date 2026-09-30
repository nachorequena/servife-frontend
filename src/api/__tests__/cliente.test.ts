import { configurarAlExpirarSesion, pedir } from '../cliente';
import { ApiError } from '../errores';
import { guardarTokens, obtenerAccessToken } from '../tokens';

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

function respuesta(status: number, cuerpo?: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: () => null },
    json: () => Promise.resolve(cuerpo),
  } as unknown as Response;
}

const error401 = { status: 401, codigo: 'NO_AUTENTICADO', mensaje: 'Falta el token o está vencido.', errores: [] };

describe('cliente HTTP', () => {
  const fetchMock = jest.fn();
  const alExpirar = jest.fn();

  beforeEach(async () => {
    mockAlmacen.clear();
    fetchMock.mockReset();
    alExpirar.mockReset();
    globalThis.fetch = fetchMock;
    configurarAlExpirarSesion(alExpirar);
    await guardarTokens({ accessToken: 'access-viejo', refreshToken: 'refresh-1' });
  });

  it('manda el access token como Bearer', async () => {
    fetchMock.mockResolvedValueOnce(respuesta(200, { ok: true }));

    await pedir('/tipos-servicio');

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer access-viejo');
  });

  it('ante un 401 renueva el token una sola vez y reintenta', async () => {
    fetchMock
      .mockResolvedValueOnce(respuesta(401, error401))
      .mockResolvedValueOnce(respuesta(200, { accessToken: 'access-nuevo', refreshToken: 'refresh-2' }))
      .mockResolvedValueOnce(respuesta(200, { dato: 1 }));

    const resultado = await pedir('/solicitudes');

    expect(resultado).toEqual({ dato: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toContain('/auth/refresh');
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe('Bearer access-nuevo');
    expect(obtenerAccessToken()).toBe('access-nuevo');
    expect(alExpirar).not.toHaveBeenCalled();
  });

  it('si el refresh falla, cierra la sesión y no reintenta', async () => {
    fetchMock
      .mockResolvedValueOnce(respuesta(401, error401))
      .mockResolvedValueOnce(respuesta(401, error401));

    await expect(pedir('/solicitudes')).rejects.toBeInstanceOf(ApiError);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(alExpirar).toHaveBeenCalledTimes(1);
    expect(obtenerAccessToken()).toBeNull();
  });

  it('si el reintento vuelve a dar 401, no entra en loop', async () => {
    fetchMock
      .mockResolvedValueOnce(respuesta(401, error401))
      .mockResolvedValueOnce(respuesta(200, { accessToken: 'access-nuevo', refreshToken: 'refresh-2' }))
      .mockResolvedValueOnce(respuesta(401, error401));

    await expect(pedir('/solicitudes')).rejects.toBeInstanceOf(ApiError);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(alExpirar).toHaveBeenCalledTimes(1);
  });

  it('los endpoints públicos no mandan Bearer ni intentan refresh', async () => {
    fetchMock.mockResolvedValueOnce(respuesta(401, error401));

    await expect(pedir('/auth/login', { metodo: 'POST', cuerpo: {}, publico: true })).rejects.toBeInstanceOf(ApiError);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
    expect(alExpirar).not.toHaveBeenCalled();
  });

  it('convierte el formato único de error en ApiError', async () => {
    fetchMock.mockResolvedValueOnce(
      respuesta(400, {
        status: 400,
        codigo: 'VALIDACION',
        mensaje: 'Hay campos con errores.',
        errores: [{ campo: 'email', detalle: 'ya existe' }],
      }),
    );

    const error = (await pedir('/auth/registro', { metodo: 'POST', cuerpo: {}, publico: true }).catch(
      (e: unknown) => e,
    )) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.codigo).toBe('VALIDACION');
    expect(error.errorDe('email')).toBe('ya existe');
  });

  it('arma la query string salteando los valores vacíos', async () => {
    fetchMock.mockResolvedValueOnce(respuesta(200, {}));

    await pedir('/prestadores', { consulta: { radioKm: 10, dias: [1, 3], orden: undefined } });

    expect(fetchMock.mock.calls[0][0]).toMatch(/\/prestadores\?radioKm=10&dias=1&dias=3$/);
  });
});
