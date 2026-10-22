import { memoria } from '../../../__mocks__/expo-file-system';
import { descargarDocumento, obtenerExpediente, obtenerMiExpediente, subirDocumento } from '../gestion';
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
  memoria.reiniciar();
  anexado = [];
  jest.spyOn(FormData.prototype, 'append').mockImplementation((campo: string, valor: unknown) => {
    anexado.push([campo, valor]);
  });
});

afterEach(() => jest.restoreAllMocks());

describe('api/gestion (expediente)', () => {
  it('E7 subirDocumento: POST multipart con tipo, declaración jurada y archivo', async () => {
    fetchMock.mockResolvedValue(respuesta(201, { uuid: 'd-1', tipo: 'DNI_FRENTE', estado: 'PENDIENTE', creadoEn: 'x' }));
    const subido = await subirDocumento('file:///tmp/dni.jpg', 'image/jpeg', 'DNI_FRENTE', 'dni.jpg');
    const { url, init } = ultimaLlamada();
    expect(subido.uuid).toBe('d-1');
    expect(init.method).toBe('POST');
    expect(url).toMatch(/\/prestadores\/me\/documentos$/);
    expect(anexado.map(([campo]) => campo)).toEqual(['tipo', 'declaracionJurada', 'archivo']);
    expect(anexado[0][1]).toBe('DNI_FRENTE');
    expect(anexado[1][1]).toBe('true');
    expect(anexado[2][1]).toMatchObject({ name: 'dni.jpg', type: 'image/jpeg' });
  });

  it('E7b obtenerMiExpediente: GET /prestadores/me/documentos', async () => {
    await obtenerMiExpediente();
    const { url, init } = ultimaLlamada();
    expect(init.method).toBe('GET');
    expect(url).toMatch(/\/prestadores\/me\/documentos$/);
  });

  it('E8 obtenerExpediente: GET /admin/prestadores/{uuid}/documentos', async () => {
    await obtenerExpediente('p-1');
    expect(ultimaLlamada().url).toMatch(/\/admin\/prestadores\/p-1\/documentos$/);
  });

  it('E8b descargarDocumento: baja con Authorization a la carpeta de documentos, no a la de imágenes', async () => {
    const uri = await descargarDocumento('p-1', 'd-1');
    expect(uri).toBe('file:///cache/documentos/d-1');
    expect(memoria.descarga).toHaveBeenCalledWith(
      `${URL_BASE}/admin/prestadores/p-1/documentos/d-1`,
      'file:///cache/documentos/d-1.tmp',
      expect.objectContaining({ headers: { Authorization: 'Bearer access-1' } }),
    );
  });
});
