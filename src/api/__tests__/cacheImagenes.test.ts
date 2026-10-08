import { memoria } from '../../../__mocks__/expo-file-system';
import { vaciarCacheDeImagenes } from '../cacheImagenes';
import { limpiarTokens } from '../tokens';

jest.mock('expo-secure-store', () => ({ deleteItemAsync: jest.fn(() => Promise.resolve()) }));

beforeEach(() => memoria.reiniciar());

function llenarCache() {
  memoria.carpetas.add('file:///cache/archivos');
  memoria.archivos.set('file:///cache/archivos/a-1', new Uint8Array([1]));
}

describe('cache de imágenes', () => {
  it('vaciarCacheDeImagenes borra la carpeta con las imágenes descargadas', () => {
    llenarCache();
    vaciarCacheDeImagenes();
    expect(memoria.carpetas.size).toBe(0);
    expect(memoria.archivos.size).toBe(0);
  });

  it('limpiarTokens (fin de sesión) vacía la caché', async () => {
    llenarCache();
    await limpiarTokens();
    expect(memoria.archivos.size).toBe(0);
  });

  it('un error al limpiar no rompe el cierre de sesión', async () => {
    llenarCache();
    jest.spyOn(memoria.carpetas, 'delete').mockImplementation(() => {
      throw new Error('boom');
    });
    await expect(limpiarTokens()).resolves.toBeUndefined();
  });
});
