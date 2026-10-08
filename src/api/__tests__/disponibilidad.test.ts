import { obtenerDisponibilidad, reemplazarMiDisponibilidad } from '../disponibilidad';
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

describe('api/disponibilidad', () => {
  it('C5 obtenerDisponibilidad: GET /prestadores/{uuid}/disponibilidad', async () => {
    await obtenerDisponibilidad('p-1');
    const { url, init } = ultimaLlamada();
    expect(init.method).toBe('GET');
    expect(url).toMatch(/\/prestadores\/p-1\/disponibilidad$/);
    expect(init.headers.Authorization).toBe('Bearer access-1');
  });

  it('B8 reemplazarMiDisponibilidad: PUT con { dias }', async () => {
    await reemplazarMiDisponibilidad([1, 2, 5]);
    const { url, init } = ultimaLlamada();
    expect(init.method).toBe('PUT');
    expect(url).toMatch(/\/prestadores\/me\/disponibilidad$/);
    expect(JSON.parse(init.body)).toEqual({ dias: [1, 2, 5] });
    expect(init.headers.Authorization).toBe('Bearer access-1');
  });
});
