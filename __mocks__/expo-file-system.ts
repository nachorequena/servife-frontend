/** Sistema de archivos en memoria para los tests (expo-file-system real necesita el módulo nativo). */
export const memoria = {
  archivos: new Map<string, Uint8Array>(),
  carpetas: new Set<string>(),
  /** Simula el servidor: recibe (url, uri destino, opciones); si lanza, la descarga falla. */
  descarga: jest.fn<Promise<void>, [string, string, unknown]>(),
  reiniciar() {
    this.archivos.clear();
    this.carpetas.clear();
    this.descarga.mockReset();
    this.descarga.mockResolvedValue(undefined);
  },
};

type Parte = string | { uri: string };
const unir = (partes: Parte[]) =>
  partes.map((p, i) => (typeof p === 'string' ? p : p.uri).replace(i === 0 ? /\/+$/ : /^\/+|\/+$/g, '')).join('/');

export class Directory {
  uri: string;
  constructor(...partes: Parte[]) {
    this.uri = unir(partes);
  }
  get exists() {
    return memoria.carpetas.has(this.uri);
  }
  create() {
    memoria.carpetas.add(this.uri);
  }
  delete() {
    memoria.carpetas.delete(this.uri);
    for (const uri of [...memoria.archivos.keys()]) {
      if (uri.startsWith(`${this.uri}/`)) memoria.archivos.delete(uri);
    }
  }
}

export class File {
  uri: string;
  constructor(...partes: Parte[]) {
    this.uri = unir(partes);
  }
  get exists() {
    return memoria.archivos.has(this.uri);
  }
  get name() {
    return this.uri.split('/').pop() ?? '';
  }
  bytes() {
    return Promise.resolve(memoria.archivos.get(this.uri) ?? new Uint8Array());
  }
  delete() {
    memoria.archivos.delete(this.uri);
  }
  async move(destino: File) {
    memoria.archivos.set(destino.uri, memoria.archivos.get(this.uri) ?? new Uint8Array());
    memoria.archivos.delete(this.uri);
    this.uri = destino.uri;
  }
  static async downloadFileAsync(url: string, destino: File, opciones?: unknown) {
    try {
      await memoria.descarga(url, destino.uri, opciones);
    } catch (error) {
      memoria.archivos.set(destino.uri, new Uint8Array([9])); // en Android puede quedar un archivo parcial
      throw error;
    }
    memoria.archivos.set(destino.uri, new Uint8Array([1, 2, 3]));
    return destino;
  }
}

export const Paths = { cache: new Directory('file:///cache') };
