import {
  actualizarPublicacion,
  crearPublicacion,
  eliminarPublicacion,
  listarMisPublicaciones,
  listarPublicacionesDePrestador,
  listarValoracionesDePrestador,
} from '../reputacion';
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

beforeEach(() => prepararApi(mockAlmacen));

describe('api/reputacion', () => {
  it('D2 listarValoracionesDePrestador: GET con page y size', async () => {
    await listarValoracionesDePrestador('p-1', { page: 1, size: 10 });
    const { url, init } = ultimaLlamada();
    expect(init.method).toBe('GET');
    expect(url).toMatch(/\/prestadores\/p-1\/valoraciones\?page=1&size=10$/);
  });

  it('D3 listarPublicacionesDePrestador: GET paginado del prestador', async () => {
    await listarPublicacionesDePrestador('p-1', { page: 0, size: 20 });
    expect(ultimaLlamada().url).toMatch(/\/prestadores\/p-1\/publicaciones\?page=0&size=20$/);
  });

  it('D8 listarMisPublicaciones: GET /prestadores/me/publicaciones', async () => {
    await listarMisPublicaciones({ page: 2, size: 20 });
    const { url, init } = ultimaLlamada();
    expect(init.method).toBe('GET');
    expect(url).toMatch(/\/prestadores\/me\/publicaciones\?page=2&size=20$/);
  });

  it('D4 crearPublicacion: POST /publicaciones con el cuerpo', async () => {
    const cuerpo = { titulo: 'Baño nuevo', uuidSolicitud: 's-1', imagenIds: ['i-1'] };
    await crearPublicacion(cuerpo);
    const { url, init } = ultimaLlamada();
    expect(init.method).toBe('POST');
    expect(url).toMatch(/\/publicaciones$/);
    expect(JSON.parse(init.body)).toEqual(cuerpo);
    expect(init.headers.Authorization).toBe('Bearer access-1');
  });

  it('D5 actualizarPublicacion: PUT /publicaciones/{uuid}', async () => {
    await actualizarPublicacion('pub-1', { titulo: 'Otro' });
    const { url, init } = ultimaLlamada();
    expect(init.method).toBe('PUT');
    expect(url).toMatch(/\/publicaciones\/pub-1$/);
    expect(JSON.parse(init.body)).toEqual({ titulo: 'Otro' });
  });

  it('D6 eliminarPublicacion: DELETE /publicaciones/{uuid} acepta el 204 sin cuerpo', async () => {
    fetchMock.mockResolvedValue(respuesta(204));
    await expect(eliminarPublicacion('pub-1')).resolves.toBeUndefined();
    const { url, init } = ultimaLlamada();
    expect(init.method).toBe('DELETE');
    expect(url).toMatch(/\/publicaciones\/pub-1$/);
  });
});
