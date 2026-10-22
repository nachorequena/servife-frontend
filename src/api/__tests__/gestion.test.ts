import {
  actualizarUsuario,
  cambiarEstadoDeUsuario,
  crearGestor,
  eliminarUsuario,
  listarUsuarios,
  listarValidacionesPendientes,
  obtenerMetricas,
  validarPrestador,
} from '../gestion';
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

describe('api/gestion (usuarios)', () => {
  it('E3 listarUsuarios: GET /admin/usuarios con filtros y página', async () => {
    await listarUsuarios({ rol: 'PRESTADOR', estado: 'SUSPENDIDA', texto: 'ana', page: 1, size: 20 });
    const { url, init } = ultimaLlamada();
    expect(init.method).toBe('GET');
    expect(url).toMatch(/\/admin\/usuarios\?rol=PRESTADOR&estado=SUSPENDIDA&texto=ana&page=1&size=20$/);
  });

  it('E3 sin filtros no manda parámetros', async () => {
    await listarUsuarios();
    expect(ultimaLlamada().url).toMatch(/\/admin\/usuarios$/);
  });

  it('E13 crearGestor: POST con nombre, email y contraseña', async () => {
    await crearGestor({ nombreApellido: 'Gestora', email: 'g@mail.com', contrasenia: 'clave1234' });
    const { url, init } = ultimaLlamada();
    expect(init.method).toBe('POST');
    expect(url).toMatch(/\/admin\/usuarios$/);
    expect(JSON.parse(init.body)).toEqual({ nombreApellido: 'Gestora', email: 'g@mail.com', contrasenia: 'clave1234' });
  });

  it('E14 actualizarUsuario: PUT con nombre, email y teléfono', async () => {
    await actualizarUsuario('u-1', { nombreApellido: 'Ana', email: 'a@mail.com', telefono: '342' });
    const { url, init } = ultimaLlamada();
    expect(init.method).toBe('PUT');
    expect(url).toMatch(/\/admin\/usuarios\/u-1$/);
    expect(JSON.parse(init.body)).toEqual({ nombreApellido: 'Ana', email: 'a@mail.com', telefono: '342' });
  });

  it('E4 cambiarEstadoDeUsuario: PATCH con estado y motivo', async () => {
    await cambiarEstadoDeUsuario('u-1', { estado: 'SUSPENDIDA', motivo: 'Reclamos' });
    const { url, init } = ultimaLlamada();
    expect(init.method).toBe('PATCH');
    expect(url).toMatch(/\/admin\/usuarios\/u-1\/estado$/);
    expect(JSON.parse(init.body)).toEqual({ estado: 'SUSPENDIDA', motivo: 'Reclamos' });
  });

  it('E15 eliminarUsuario: DELETE', async () => {
    await eliminarUsuario('u-1');
    const { url, init } = ultimaLlamada();
    expect(init.method).toBe('DELETE');
    expect(url).toMatch(/\/admin\/usuarios\/u-1$/);
  });
});

describe('api/gestion (métricas)', () => {
  it('E9 obtenerMetricas: GET /admin/metricas', async () => {
    await obtenerMetricas();
    const { url, init } = ultimaLlamada();
    expect(init.method).toBe('GET');
    expect(url).toMatch(/\/admin\/metricas$/);
  });
});
