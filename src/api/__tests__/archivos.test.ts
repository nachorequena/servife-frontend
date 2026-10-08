import { subirImagen, urlDeArchivo } from '../archivos';
import { URL_BASE } from '../cliente';
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
  anexado = [];
  // Node serializa los objetos al anexarlos; en React Native el objeto { uri, name, type } viaja tal cual.
  jest.spyOn(FormData.prototype, 'append').mockImplementation((campo: string, valor: unknown) => {
    anexado.push([campo, valor]);
  });
});

afterEach(() => jest.restoreAllMocks());

describe('api/archivos', () => {
  it('D7 subirImagen: POST /archivos multipart con el campo archivo y devuelve el archivo subido', async () => {
    fetchMock.mockResolvedValue(respuesta(201, { uuid: 'a-1', mime: 'image/jpeg', bytes: 10 }));
    const subido = await subirImagen('file:///tmp/foto.jpg', 'image/jpeg', 'foto.jpg');
    const { url, init } = ultimaLlamada();
    expect(subido).toEqual({ uuid: 'a-1', mime: 'image/jpeg', bytes: 10 });
    expect(init.method).toBe('POST');
    expect(url).toMatch(/\/archivos$/);
    expect(init.body).toBeInstanceOf(FormData);
    expect(anexado).toEqual([['archivo', { uri: 'file:///tmp/foto.jpg', name: 'foto.jpg', type: 'image/jpeg' }]]);
    expect(init.headers['Content-Type']).toBeUndefined();
    expect(init.headers.Authorization).toBe('Bearer access-1');
  });

  it('subirImagen sin nombre usa uno por defecto según el mime', async () => {
    await subirImagen('file:///tmp/x', 'image/png');
    expect(anexado[0][1]).toMatchObject({ name: 'imagen.png', type: 'image/png' });
  });

  it('urlDeArchivo apunta a GET /archivos/{uuid}', () => {
    expect(urlDeArchivo('a-1')).toBe(`${URL_BASE}/archivos/a-1`);
  });
});
