import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { correoConHuella, guardarConHuella, huellaDisponible, leerConHuella, olvidarHuella } from '../huella';
import { limpiarTokens } from '../tokens';

const mockAlmacen = new Map<string, string>();
const mockEntorno = { actual: 'standalone' };

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get executionEnvironment() {
      return mockEntorno.actual;
    },
  },
  ExecutionEnvironment: { Bare: 'bare', Standalone: 'standalone', StoreClient: 'storeClient' },
}));

jest.mock('expo-secure-store', () => ({
  canUseBiometricAuthentication: jest.fn(() => true),
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

const mocks = SecureStore as jest.Mocked<typeof SecureStore>;

function lecturaSinHuella(clave: string) {
  return Promise.resolve(mockAlmacen.get(clave) ?? null);
}

beforeEach(() => {
  mockAlmacen.clear();
  jest.clearAllMocks();
  mocks.canUseBiometricAuthentication.mockReturnValue(true);
  mocks.getItemAsync.mockImplementation(lecturaSinHuella);
  mockEntorno.actual = 'standalone';
});

describe('huellaDisponible', () => {
  it('es true si el teléfono permite guardar con biometría', async () => {
    expect(await huellaDisponible()).toBe(true);
  });

  it('es false si no la permite', async () => {
    mocks.canUseBiometricAuthentication.mockReturnValue(false);
    expect(await huellaDisponible()).toBe(false);
  });

  it('es false si la consulta falla (p. ej. Expo Go en iOS)', async () => {
    mocks.canUseBiometricAuthentication.mockImplementation(() => {
      throw new Error('no soportado');
    });
    expect(await huellaDisponible()).toBe(false);
  });
});

describe('huellaDisponible en iOS', () => {
  afterEach(() => jest.restoreAllMocks());

  it('es false en Expo Go sobre iOS (no soporta requireAuthentication)', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    mockEntorno.actual = 'storeClient';
    expect(await huellaDisponible()).toBe(false);
  });

  it('es true en un build de iOS', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    expect(await huellaDisponible()).toBe(true);
  });

  it('es true en Expo Go sobre Android', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    mockEntorno.actual = 'storeClient';
    expect(await huellaDisponible()).toBe(true);
  });
});

describe('una huella por rol', () => {
  it('guarda cada rol por separado y no se mezclan', async () => {
    await guardarConHuella('CLIENTE', 'cli@mail.com', 'ClaveCli1');
    await guardarConHuella('PRESTADOR', 'pre@mail.com', 'ClavePre1');

    expect(await correoConHuella('CLIENTE')).toBe('cli@mail.com');
    expect(await correoConHuella('PRESTADOR')).toBe('pre@mail.com');
    expect(await correoConHuella('GESTOR')).toBeNull();
    expect(await leerConHuella('PRESTADOR')).toEqual({ estado: 'ok', correo: 'pre@mail.com', contrasenia: 'ClavePre1' });
  });

  it('olvidar un rol no toca los otros', async () => {
    await guardarConHuella('CLIENTE', 'cli@mail.com', 'ClaveCli1');
    await guardarConHuella('PRESTADOR', 'pre@mail.com', 'ClavePre1');
    await olvidarHuella('CLIENTE');
    expect(await correoConHuella('CLIENTE')).toBeNull();
    expect(await correoConHuella('PRESTADOR')).toBe('pre@mail.com');
  });

  it('las claves solo usan caracteres permitidos por SecureStore', async () => {
    await guardarConHuella('GESTOR', 'g@mail.com', 'ClaveGes1');
    for (const [clave] of mocks.setItemAsync.mock.calls) {
      expect(clave).toMatch(/^[A-Za-z0-9._-]+$/);
    }
  });

  it('borra una sola vez las claves de la versión anterior (una cuenta por teléfono)', async () => {
    jest.resetModules();
    mockAlmacen.set('huella.correo', 'viejo@mail.com');
    mockAlmacen.set('huella.contrasenia', 'vieja');
    const modulo = require('../huella') as typeof import('../huella');

    await modulo.correoConHuella('CLIENTE');

    expect(mockAlmacen.has('huella.correo')).toBe(false);
    expect(mockAlmacen.has('huella.contrasenia')).toBe(false);
    const borrados = mocks.deleteItemAsync.mock.calls.length;
    await modulo.correoConHuella('CLIENTE');
    expect(mocks.deleteItemAsync.mock.calls.length).toBe(borrados);
  });
});

describe('guardarConHuella', () => {
  it('guarda la contraseña exigiendo huella y después el correo sin exigirla', async () => {
    expect(await guardarConHuella('CLIENTE', 'ana@mail.com', 'Clave123')).toBe(true);

    const [claveContrasenia, valor, opciones] = mocks.setItemAsync.mock.calls[0];
    expect(valor).toBe('Clave123');
    expect(opciones).toEqual({
      requireAuthentication: true,
      authenticationPrompt: 'Confirmá con tu huella para activarla',
    });
    expect(claveContrasenia).not.toBe(mocks.setItemAsync.mock.calls[1][0]);
    expect(mocks.setItemAsync.mock.calls[1][1]).toBe('ana@mail.com');
    expect(mocks.setItemAsync.mock.calls[1][2]).toBeUndefined();
    expect(await correoConHuella('CLIENTE')).toBe('ana@mail.com');
  });

  it('si el usuario cancela, devuelve false y no deja nada guardado', async () => {
    mocks.setItemAsync.mockRejectedValueOnce(new Error('cancelado'));

    expect(await guardarConHuella('CLIENTE', 'ana@mail.com', 'Clave123')).toBe(false);

    expect(mockAlmacen.size).toBe(0);
    expect(await correoConHuella('CLIENTE')).toBeNull();
  });

  it('si falla al guardar el correo, deshace la contraseña', async () => {
    mocks.setItemAsync.mockImplementationOnce((clave, valor) => {
      mockAlmacen.set(clave, valor);
      return Promise.resolve();
    });
    mocks.setItemAsync.mockRejectedValueOnce(new Error('falló'));

    expect(await guardarConHuella('CLIENTE', 'ana@mail.com', 'Clave123')).toBe(false);

    expect(mockAlmacen.size).toBe(0);
  });
});

describe('leerConHuella', () => {
  it('devuelve correo y contraseña pidiendo la huella', async () => {
    await guardarConHuella('CLIENTE', 'ana@mail.com', 'Clave123');
    mocks.getItemAsync.mockClear();

    expect(await leerConHuella('CLIENTE')).toEqual({ estado: 'ok', correo: 'ana@mail.com', contrasenia: 'Clave123' });

    const conAutenticacion = mocks.getItemAsync.mock.calls.find(([, opciones]) => opciones !== undefined);
    expect(conAutenticacion?.[1]).toEqual({
      requireAuthentication: true,
      authenticationPrompt: 'Ingresá con tu huella',
    });
  });

  it('si el usuario cancela, devuelve cancelado y conserva lo guardado', async () => {
    await guardarConHuella('CLIENTE', 'ana@mail.com', 'Clave123');
    mocks.getItemAsync.mockImplementation((clave, opciones) =>
      opciones?.requireAuthentication ? Promise.reject(new Error('cancelado')) : lecturaSinHuella(clave),
    );

    expect(await leerConHuella('CLIENTE')).toEqual({ estado: 'cancelado' });
    expect(await correoConHuella('CLIENTE')).toBe('ana@mail.com');
  });

  it('si la clave se invalidó (hay correo pero no contraseña), borra todo y devuelve invalidada', async () => {
    await guardarConHuella('CLIENTE', 'ana@mail.com', 'Clave123');
    mocks.getItemAsync.mockImplementation((clave, opciones) =>
      opciones?.requireAuthentication ? Promise.resolve(null) : lecturaSinHuella(clave),
    );

    expect(await leerConHuella('CLIENTE')).toEqual({ estado: 'invalidada' });
    expect(mockAlmacen.size).toBe(0);
  });

  it('sin nada guardado, devuelve cancelado sin pedir la huella', async () => {
    expect(await leerConHuella('CLIENTE')).toEqual({ estado: 'cancelado' });
    expect(mocks.getItemAsync).toHaveBeenCalledTimes(1);
  });
});

describe('olvidarHuella', () => {
  it('borra correo y contraseña', async () => {
    await guardarConHuella('CLIENTE', 'ana@mail.com', 'Clave123');
    await olvidarHuella('CLIENTE');
    expect(mockAlmacen.size).toBe(0);
  });

  it('borra el correo aunque falle borrar la contraseña', async () => {
    await guardarConHuella('CLIENTE', 'ana@mail.com', 'Clave123');
    mocks.deleteItemAsync.mockRejectedValueOnce(new Error('falló'));

    await expect(olvidarHuella('CLIENTE')).resolves.toBeUndefined();

    expect(await correoConHuella('CLIENTE')).toBeNull();
  });
});

describe('cierre de sesión', () => {
  it('limpiarTokens no borra la huella', async () => {
    await guardarConHuella('CLIENTE', 'ana@mail.com', 'Clave123');
    await limpiarTokens();
    expect(await correoConHuella('CLIENTE')).toBe('ana@mail.com');
  });
});
