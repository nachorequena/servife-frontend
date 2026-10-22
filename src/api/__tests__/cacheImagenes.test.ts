import { memoria } from '../../../__mocks__/expo-file-system';
import { vaciarCacheDeImagenes, vaciarDocumentosDescargados } from '../cacheImagenes';
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

  it('vaciarDocumentosDescargados borra solo los documentos de validación', () => {
    llenarCache();
    memoria.carpetas.add('file:///cache/documentos');
    memoria.archivos.set('file:///cache/documentos/d-1', new Uint8Array([2]));
    vaciarDocumentosDescargados();
    expect(memoria.archivos.has('file:///cache/documentos/d-1')).toBe(false);
    expect(memoria.archivos.has('file:///cache/archivos/a-1')).toBe(true);
  });

  it('limpiarTokens (fin de sesión) vacía la caché, también los documentos', async () => {
    llenarCache();
    memoria.carpetas.add('file:///cache/documentos');
    memoria.archivos.set('file:///cache/documentos/d-1', new Uint8Array([2]));
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
