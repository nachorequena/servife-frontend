import { listarTiposServicio } from '../catalogo';
import {
  actualizarMiUsuario,
  cambiarContrasenia,
  confirmarRecuperacion,
  iniciarSesion,
  obtenerSesion,
  recuperarContrasenia,
  registrar,
} from '../identidad';
import { guardarTokens } from '../tokens';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

function respuesta(status: number, cuerpo?: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: () => null },
    json: () => Promise.resolve(cuerpo),
  } as unknown as Response;
}

describe('API de identidad', () => {
  const fetchMock = jest.fn();

  beforeEach(async () => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock;
    await guardarTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
  });

  const llamada = () => {
    const [url, init] = fetchMock.mock.calls[0];
    return { url: url as string, init };
  };

  it('registrar: POST /auth/registro sin Authorization', async () => {
    fetchMock.mockResolvedValueOnce(respuesta(201, { uuid: 'u1' }));
    const cuerpo = { rol: 'PRESTADOR' as const, nombreApellido: 'Ana', email: 'a@b.com', contrasenia: 'abcd1234', idTipoServicio: 't1' };

    await registrar(cuerpo);

    const { url, init } = llamada();
    expect(url).toMatch(/\/auth\/registro$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual(cuerpo);
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('iniciarSesion: POST /auth/login sin Authorization y devuelve los tokens con rol', async () => {
    const tokens = { accessToken: 'a', refreshToken: 'r', rol: 'CLIENTE' };
    fetchMock.mockResolvedValueOnce(respuesta(200, tokens));

    await expect(iniciarSesion({ email: 'a@b.com', contrasenia: 'abcd1234' })).resolves.toEqual(tokens);

    const { url, init } = llamada();
    expect(url).toMatch(/\/auth\/login$/);
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('obtenerSesion: GET /auth/me con Authorization', async () => {
    fetchMock.mockResolvedValueOnce(respuesta(200, { uuid: 'u1' }));

    await obtenerSesion();

    const { url, init } = llamada();
    expect(url).toMatch(/\/auth\/me$/);
    expect(init.method).toBe('GET');
    expect(init.headers.Authorization).toBe('Bearer access-1');
  });

  it('actualizarMiUsuario: PUT /usuarios/me con Authorization', async () => {
    fetchMock.mockResolvedValueOnce(respuesta(200, { uuid: 'u1' }));

    await actualizarMiUsuario({ nombreApellido: 'Ana Gómez', telefono: null });

    const { url, init } = llamada();
    expect(url).toMatch(/\/usuarios\/me$/);
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual({ nombreApellido: 'Ana Gómez', telefono: null });
    expect(init.headers.Authorization).toBe('Bearer access-1');
  });

  it('cambiarContrasenia: PATCH /usuarios/me/password con Authorization', async () => {
    fetchMock.mockResolvedValueOnce(respuesta(204));

    await cambiarContrasenia({ contraseniaActual: 'abcd1234', contraseniaNueva: 'nueva1234' });

    const { url, init } = llamada();
    expect(url).toMatch(/\/usuarios\/me\/password$/);
    expect(init.method).toBe('PATCH');
    expect(init.headers.Authorization).toBe('Bearer access-1');
  });

  it('recuperarContrasenia: POST /auth/recuperar sin Authorization', async () => {
    fetchMock.mockResolvedValueOnce(respuesta(204));

    await recuperarContrasenia({ email: 'a@b.com' });

    const { url, init } = llamada();
    expect(url).toMatch(/\/auth\/recuperar$/);
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('confirmarRecuperacion: POST /auth/recuperar/confirmar sin Authorization', async () => {
    fetchMock.mockResolvedValueOnce(respuesta(204));
    const cuerpo = { email: 'a@b.com', codigo: '123456', contraseniaNueva: 'nueva1234' };

    await confirmarRecuperacion(cuerpo);

    const { url, init } = llamada();
    expect(url).toMatch(/\/auth\/recuperar\/confirmar$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual(cuerpo);
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('listarTiposServicio: GET /tipos-servicio sin Authorization', async () => {
    fetchMock.mockResolvedValueOnce(respuesta(200, []));

    await listarTiposServicio();

    const { url, init } = llamada();
    expect(url).toMatch(/\/tipos-servicio$/);
    expect(init.method).toBe('GET');
    expect(init.headers.Authorization).toBeUndefined();
  });
});
