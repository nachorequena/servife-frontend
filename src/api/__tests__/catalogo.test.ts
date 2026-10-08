import {
  actualizarMiPerfilDePrestador,
  actualizarTipoServicio,
  buscarPrestadores,
  crearTipoServicio,
  eliminarTipoServicio,
  listarTiposServicio,
  obtenerMiPerfilDeServicio,
  obtenerPrestador,
} from '../catalogo';
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

describe('api/catalogo', () => {
  it('B1 listarTiposServicio es público: GET sin Bearer', async () => {
    await listarTiposServicio();
    const { url, init } = ultimaLlamada();
    expect(init.method).toBe('GET');
    expect(url).toMatch(/\/tipos-servicio$/);
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('B2 crearTipoServicio: POST con cuerpo y Bearer', async () => {
    const cuerpo = { nombre: 'Gasista', icono: 'flame', requiereMatricula: true };
    await crearTipoServicio(cuerpo);
    const { url, init } = ultimaLlamada();
    expect(init.method).toBe('POST');
    expect(url).toMatch(/\/tipos-servicio$/);
    expect(JSON.parse(init.body)).toEqual(cuerpo);
    expect(init.headers.Authorization).toBe('Bearer access-1');
  });

  it('B3 actualizarTipoServicio: PUT a /tipos-servicio/{uuid}', async () => {
    await actualizarTipoServicio('t-1', { nombre: 'Gas', icono: 'flame', requiereMatricula: false });
    const { url, init } = ultimaLlamada();
    expect(init.method).toBe('PUT');
    expect(url).toMatch(/\/tipos-servicio\/t-1$/);
    expect(init.headers.Authorization).toBe('Bearer access-1');
  });

  it('B4 eliminarTipoServicio: DELETE a /tipos-servicio/{uuid}', async () => {
    await eliminarTipoServicio('t-1');
    const { url, init } = ultimaLlamada();
    expect(init.method).toBe('DELETE');
    expect(url).toMatch(/\/tipos-servicio\/t-1$/);
    expect(init.headers.Authorization).toBe('Bearer access-1');
  });

  it('B5 buscarPrestadores repite dias y manda q, orden y filtros', async () => {
    await buscarPrestadores({
      q: 'plomero',
      tipoServicioId: 'ts-1',
      lat: -31.6,
      lng: -60.7,
      puntajeMin: 4,
      dias: [1, 3],
      orden: 'valoracion',
      page: 0,
      size: 20,
    });
    const { url, init } = ultimaLlamada();
    expect(init.method).toBe('GET');
    const [ruta, consulta] = url.split('?');
    expect(ruta).toMatch(/\/prestadores$/);
    const partes = consulta.split('&');
    expect(partes).toEqual(
      expect.arrayContaining(['q=plomero', 'tipoServicioId=ts-1', 'puntajeMin=4', 'orden=valoracion', 'page=0', 'size=20']),
    );
    expect(partes.filter((p) => p.startsWith('dias='))).toEqual(['dias=1', 'dias=3']);
    expect(init.headers.Authorization).toBe('Bearer access-1');
  });

  it('B5 sin filtros no manda query', async () => {
    await buscarPrestadores();
    expect(ultimaLlamada().url).toMatch(/\/prestadores$/);
  });

  it('B6 obtenerPrestador: GET /prestadores/{uuid}', async () => {
    await obtenerPrestador('p-1');
    const { url, init } = ultimaLlamada();
    expect(init.method).toBe('GET');
    expect(url).toMatch(/\/prestadores\/p-1$/);
    expect(init.headers.Authorization).toBe('Bearer access-1');
  });

  it('obtenerMiPerfilDeServicio: GET /prestadores/me/perfil', async () => {
    await obtenerMiPerfilDeServicio();
    const { url, init } = ultimaLlamada();
    expect(init.method).toBe('GET');
    expect(url).toMatch(/\/prestadores\/me\/perfil$/);
    expect(init.headers.Authorization).toBe('Bearer access-1');
  });

  it('B7 actualizarMiPerfilDePrestador: PUT /prestadores/me/perfil con cuerpo', async () => {
    const cuerpo = { idTipoServicio: 'ts-1', zona: 'Centro', radioKm: 10 };
    await actualizarMiPerfilDePrestador(cuerpo);
    const { url, init } = ultimaLlamada();
    expect(init.method).toBe('PUT');
    expect(url).toMatch(/\/prestadores\/me\/perfil$/);
    expect(JSON.parse(init.body)).toEqual(cuerpo);
    expect(init.headers.Authorization).toBe('Bearer access-1');
  });
});
