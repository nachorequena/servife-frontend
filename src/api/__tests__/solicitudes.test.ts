import { cambiarEstadoDeSolicitud, crearSolicitud, listarMisSolicitudes, obtenerSolicitud } from '../solicitudes';
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

describe('api/solicitudes', () => {
  it('C1 crearSolicitud: POST /solicitudes con el cuerpo', async () => {
    const cuerpo = {
      uuidPrestador: 'p-1',
      fechaDeseada: '2026-09-18',
      direccion: 'Calle 1',
      descripcion: 'Pérdida de agua',
      imagenIds: ['i-1'],
    };
    await crearSolicitud(cuerpo);
    const { url, init } = ultimaLlamada();
    expect(init.method).toBe('POST');
    expect(url).toMatch(/\/solicitudes$/);
    expect(JSON.parse(init.body)).toEqual(cuerpo);
    expect(init.headers.Authorization).toBe('Bearer access-1');
  });

  it('C2 listarMisSolicitudes: GET con estado repetido, page y size', async () => {
    await listarMisSolicitudes({ estados: ['PENDIENTE', 'ACEPTADA'], page: 1, size: 20 });
    const { url, init } = ultimaLlamada();
    expect(init.method).toBe('GET');
    expect(url).toMatch(/\/solicitudes\?estado=PENDIENTE&estado=ACEPTADA&page=1&size=20$/);
    expect(init.headers.Authorization).toBe('Bearer access-1');
  });

  it('C2 listarMisSolicitudes: sin filtros no manda query', async () => {
    await listarMisSolicitudes();
    expect(ultimaLlamada().url).toMatch(/\/solicitudes$/);
  });

  it('C3 obtenerSolicitud: GET /solicitudes/{uuid}', async () => {
    await obtenerSolicitud('s-1');
    const { url, init } = ultimaLlamada();
    expect(init.method).toBe('GET');
    expect(url).toMatch(/\/solicitudes\/s-1$/);
  });

  it('C4 cambiarEstadoDeSolicitud: PATCH /solicitudes/{uuid}/estado con la acción', async () => {
    await cambiarEstadoDeSolicitud('s-1', { accion: 'ACEPTAR', precioAcordado: 800000 });
    const { url, init } = ultimaLlamada();
    expect(init.method).toBe('PATCH');
    expect(url).toMatch(/\/solicitudes\/s-1\/estado$/);
    expect(JSON.parse(init.body)).toEqual({ accion: 'ACEPTAR', precioAcordado: 800000 });
    expect(init.headers.Authorization).toBe('Bearer access-1');
  });
});
