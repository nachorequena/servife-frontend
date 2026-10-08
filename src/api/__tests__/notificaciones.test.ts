import { contarAvisosNoLeidos, listarAvisos, marcarAvisoLeido } from '../notificaciones';
import { prepararApi, ultimaLlamada } from '../../testing/api';

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

beforeEach(() => prepararApi(mockAlmacen));

describe('api/notificaciones', () => {
  it('E11 listarAvisos: GET /notificaciones con página', async () => {
    await listarAvisos({ page: 1, size: 10 });
    const { url, init } = ultimaLlamada();
    expect(init.method).toBe('GET');
    expect(url).toMatch(/\/notificaciones\?page=1&size=10$/);
    expect(init.headers.Authorization).toBe('Bearer access-1');
  });

  it('listarAvisos sin página no manda query', async () => {
    await listarAvisos();
    expect(ultimaLlamada().url).toMatch(/\/notificaciones$/);
  });

  it('marcarAvisoLeido: PATCH /notificaciones/{uuid}/leida', async () => {
    await marcarAvisoLeido('n-1');
    const { url, init } = ultimaLlamada();
    expect(init.method).toBe('PATCH');
    expect(url).toMatch(/\/notificaciones\/n-1\/leida$/);
    expect(init.headers.Authorization).toBe('Bearer access-1');
  });

  it('contarAvisosNoLeidos: GET /notificaciones/no-leidas', async () => {
    await contarAvisosNoLeidos();
    const { url, init } = ultimaLlamada();
    expect(init.method).toBe('GET');
    expect(url).toMatch(/\/notificaciones\/no-leidas$/);
    expect(init.headers.Authorization).toBe('Bearer access-1');
  });
});
