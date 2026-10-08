import { memoria } from '../../../__mocks__/expo-file-system';
import { descargarImagen, subirImagen, urlDeArchivo } from '../archivos';
import { URL_BASE } from '../cliente';
import { obtenerAccessToken } from '../tokens';
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

let anexado: [string, unknown][];

beforeEach(async () => {
  await prepararApi(mockAlmacen);
  memoria.reiniciar();
  anexado = [];
  // Node serializa los objetos al anexarlos; en React Native el objeto viaja tal cual hasta expo/fetch.
  jest.spyOn(FormData.prototype, 'append').mockImplementation((campo: string, valor: unknown) => {
    anexado.push([campo, valor]);
  });
});

afterEach(() => jest.restoreAllMocks());

describe('api/archivos · subir', () => {
  it('D7 subirImagen: POST /archivos multipart con el campo archivo y devuelve el archivo subido', async () => {
    fetchMock.mockResolvedValue(respuesta(201, { uuid: 'a-1', mime: 'image/jpeg', bytes: 10 }));
    const subido = await subirImagen('file:///tmp/foto.jpg', 'image/jpeg', 'foto.jpg');
    const { url, init } = ultimaLlamada();
    expect(subido).toEqual({ uuid: 'a-1', mime: 'image/jpeg', bytes: 10 });
    expect(init.method).toBe('POST');
    expect(url).toMatch(/\/archivos$/);
    expect(init.body).toBeInstanceOf(FormData);
    expect(anexado).toHaveLength(1);
    expect(anexado[0][0]).toBe('archivo');
    expect(init.headers['Content-Type']).toBeUndefined();
    expect(init.headers.Authorization).toBe('Bearer access-1');
  });

  it('la parte tiene name, type y bytes() (lo que acepta expo/fetch), no { uri }', async () => {
    memoria.archivos.set('file:///tmp/foto.jpg', new Uint8Array([7, 8]));
    await subirImagen('file:///tmp/foto.jpg', 'image/jpeg', 'foto.jpg');
    const parte = anexado[0][1] as { name: string; type: string; uri?: string; bytes: () => Promise<Uint8Array> };
    expect(parte.name).toBe('foto.jpg');
    expect(parte.type).toBe('image/jpeg');
    expect(parte.uri).toBeUndefined();
    expect(Array.from(await parte.bytes())).toEqual([7, 8]);
  });

  it('subirImagen sin nombre usa uno por defecto según el mime', async () => {
    await subirImagen('file:///tmp/x', 'image/png');
    expect(anexado[0][1]).toMatchObject({ name: 'imagen.png', type: 'image/png' });
  });

  it('si el access token vence renueva y reintenta (pasa por pedir)', async () => {
    fetchMock
      .mockResolvedValueOnce(respuesta(401))
      .mockResolvedValueOnce(respuesta(200, { accessToken: 'access-2', refreshToken: 'refresh-2' }))
      .mockResolvedValueOnce(respuesta(201, { uuid: 'a-1', mime: 'image/jpeg', bytes: 10 }));
    const subido = await subirImagen('file:///tmp/foto.jpg', 'image/jpeg');
    expect(subido.uuid).toBe('a-1');
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/auth\/refresh$/);
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe('Bearer access-2');
  });
});

describe('api/archivos · descargarImagen', () => {
  const destino = 'file:///cache/archivos/a-1';

  it('urlDeArchivo apunta a GET /archivos/{uuid}', () => {
    expect(urlDeArchivo('a-1')).toBe(`${URL_BASE}/archivos/a-1`);
  });

  it('descarga con Authorization a la caché y devuelve el uri local', async () => {
    const uri = await descargarImagen('a-1');
    expect(uri).toBe(destino);
    expect(memoria.descarga).toHaveBeenCalledTimes(1);
    const [url, , opciones] = memoria.descarga.mock.calls[0];
    expect(url).toBe(`${URL_BASE}/archivos/a-1`);
    expect(opciones).toMatchObject({ headers: { Authorization: 'Bearer access-1' } });
    expect(memoria.archivos.has(destino)).toBe(true);
    expect(memoria.archivos.has(`${destino}.tmp`)).toBe(false);
  });

  it('si ya está en la caché no descarga', async () => {
    memoria.archivos.set(destino, new Uint8Array([1]));
    expect(await descargarImagen('a-1')).toBe(destino);
    expect(memoria.descarga).not.toHaveBeenCalled();
  });

  it('pedidos simultáneos del mismo uuid comparten una sola descarga', async () => {
    const [a, b] = await Promise.all([descargarImagen('a-1'), descargarImagen('a-1')]);
    expect(a).toBe(b);
    expect(memoria.descarga).toHaveBeenCalledTimes(1);
  });

  it('ante un 401 renueva la sesión una vez y reintenta con el token nuevo', async () => {
    memoria.descarga.mockRejectedValueOnce(new Error('UnableToDownload: HTTP 401'));
    fetchMock.mockResolvedValueOnce(respuesta(200, { accessToken: 'access-2', refreshToken: 'refresh-2' }));
    expect(await descargarImagen('a-1')).toBe(destino);
    expect(memoria.descarga).toHaveBeenCalledTimes(2);
    expect(memoria.descarga.mock.calls[1][2]).toMatchObject({ headers: { Authorization: 'Bearer access-2' } });
    expect(obtenerAccessToken()).toBe('access-2');
  });

  it('si el reintento también da 401 falla sin renovar de nuevo', async () => {
    memoria.descarga.mockRejectedValue(new Error('UnableToDownload: HTTP 401'));
    fetchMock.mockResolvedValueOnce(respuesta(200, { accessToken: 'access-2', refreshToken: 'refresh-2' }));
    await expect(descargarImagen('a-1')).rejects.toThrow('401');
    expect(memoria.descarga).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('si no se puede renovar falla', async () => {
    memoria.descarga.mockRejectedValue(new Error('UnableToDownload: HTTP 401'));
    fetchMock.mockResolvedValueOnce(respuesta(401));
    await expect(descargarImagen('a-1')).rejects.toThrow();
    expect(memoria.descarga).toHaveBeenCalledTimes(1);
  });

  it('otro error (404, red) falla sin renovar y no deja archivos en la caché', async () => {
    memoria.descarga.mockRejectedValue(new Error('UnableToDownload: HTTP 404'));
    await expect(descargarImagen('a-1')).rejects.toThrow('404');
    expect(fetchMock).not.toHaveBeenCalled();
    expect([...memoria.archivos.keys()]).toEqual([]);
    memoria.descarga.mockResolvedValue(undefined);
    expect(await descargarImagen('a-1')).toBe(destino); // el fallo no quedó como "cacheado"
    expect(memoria.descarga).toHaveBeenCalledTimes(2);
  });
});
