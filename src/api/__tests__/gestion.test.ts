import { listarValidacionesPendientes, validarPrestador } from '../gestion';
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

describe('api/gestion (validaciones)', () => {
  it('E5 listarValidacionesPendientes: GET /admin/validaciones con página', async () => {
    await listarValidacionesPendientes({ page: 0, size: 20 });
    const { url, init } = ultimaLlamada();
    expect(init.method).toBe('GET');
    expect(url).toMatch(/\/admin\/validaciones\?page=0&size=20$/);
    expect(init.headers.Authorization).toBe('Bearer access-1');
  });

  it('E6 validarPrestador: PATCH con decision y motivo', async () => {
    await validarPrestador('p-1', { decision: 'RECHAZAR', motivo: 'Matrícula ilegible' });
    const { url, init } = ultimaLlamada();
    expect(init.method).toBe('PATCH');
    expect(url).toMatch(/\/admin\/prestadores\/p-1\/validacion$/);
    expect(JSON.parse(init.body)).toEqual({ decision: 'RECHAZAR', motivo: 'Matrícula ilegible' });
    expect(init.headers.Authorization).toBe('Bearer access-1');
  });
});
