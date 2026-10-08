import { guardarTokens } from '../api/tokens';

/** Respuesta mínima de fetch para los tests de api/*. */
export function respuesta(status: number, cuerpo?: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: () => null },
    json: () => Promise.resolve(cuerpo),
  } as unknown as Response;
}

export const fetchMock = jest.fn();

/** Deja un token guardado y un fetch que responde 200 {}. Llamar en beforeEach. */
export async function prepararApi(almacen: Map<string, string>): Promise<void> {
  almacen.clear();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(respuesta(200, {}));
  globalThis.fetch = fetchMock;
  await guardarTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
}

/** Primera llamada hecha a fetch: URL completa e init. */
export function ultimaLlamada() {
  const [url, init] = fetchMock.mock.calls[0];
  return { url: url as string, init };
}
