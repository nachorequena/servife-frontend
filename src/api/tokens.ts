import * as SecureStore from 'expo-secure-store';

/**
 * Access token en memoria (dura 15 min); refresh token en expo-secure-store (7 días)
 * (servife-ia/.ai/07-security.md). Nunca loguear ninguno de los dos.
 */

const CLAVE_REFRESH = 'servife.refreshToken';

let accessToken: string | null = null;

export interface ParDeTokens {
  accessToken: string;
  refreshToken: string;
}

export function obtenerAccessToken(): string | null {
  return accessToken;
}

export function obtenerRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(CLAVE_REFRESH);
}

export async function guardarTokens(tokens: ParDeTokens): Promise<void> {
  accessToken = tokens.accessToken;
  await SecureStore.setItemAsync(CLAVE_REFRESH, tokens.refreshToken);
}

export async function limpiarTokens(): Promise<void> {
  accessToken = null;
  await SecureStore.deleteItemAsync(CLAVE_REFRESH);
}
