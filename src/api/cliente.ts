import { ApiError } from './errores';
import {
  guardarTokens,
  limpiarTokens,
  obtenerAccessToken,
  obtenerRefreshToken,
} from './tokens';
import type { TokensDeSesion } from './identidad';

/**
 * Cliente HTTP compartido. Las pantallas nunca llaman a fetch directo: usan las funciones de
 * api/<modulo>.ts, que pasan por acá (servife-ia/.ai/03-architecture.md).
 *
 * - Agrega Authorization: Bearer <access>.
 * - Ante un 401 intenta renovar el token una sola vez y reintenta; si falla, limpia la sesión
 *   y avisa para mandar a login (.ai/07-security.md).
 * - Cada request tiene un tope de 10 s; al vencer falla como un error de red (no ApiError) y no toca los tokens.
 * - Cualquier respuesta no 2xx se lanza como ApiError con el formato único de error.
 */

export const URL_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

/** Tiempo máximo de cada request. Al vencer se cancela y se trata como un fallo de red (no es un ApiError). */
const TIEMPO_MAXIMO_MS = 10_000;

type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type ValorDeConsulta = string | number | boolean | undefined | null;

export interface Opciones {
  metodo?: Metodo;
  cuerpo?: unknown;
  consulta?: Record<string, ValorDeConsulta | ValorDeConsulta[]>;
  /** Endpoints públicos (/auth/login, /auth/registro...): sin Bearer y sin refresh. */
  publico?: boolean;
}

let alExpirarSesion: () => void = () => {};

/** La registra el store de sesión para volver a login cuando el refresh falla. */
export function configurarAlExpirarSesion(fn: () => void): void {
  alExpirarSesion = fn;
}

let renovacionEnCurso: Promise<boolean> | null = null;

export async function pedir<T = unknown>(ruta: string, opciones: Opciones = {}): Promise<T> {
  let respuesta = await enviar(ruta, opciones);

  if (respuesta.status === 401 && !opciones.publico) {
    const renovado = await renovarUnaVez();
    if (renovado) {
      respuesta = await enviar(ruta, opciones);
    }
    if (!renovado || respuesta.status === 401) {
      await expirarSesion();
      throw await ApiError.desde(respuesta);
    }
  }

  if (!respuesta.ok) {
    throw await ApiError.desde(respuesta);
  }
  if (respuesta.status === 204 || respuesta.headers.get('content-length') === '0') {
    return undefined as T;
  }
  return (await respuesta.json()) as T;
}

async function enviar(ruta: string, { metodo = 'GET', cuerpo, consulta, publico }: Opciones): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const esArchivo = typeof FormData !== 'undefined' && cuerpo instanceof FormData;
  if (cuerpo !== undefined && !esArchivo) {
    headers['Content-Type'] = 'application/json';
  }
  const token = obtenerAccessToken();
  if (token && !publico) {
    headers.Authorization = `Bearer ${token}`;
  }
  const cancelador = new AbortController();
  const temporizador = setTimeout(() => cancelador.abort(), TIEMPO_MAXIMO_MS);
  try {
    return await fetch(URL_BASE + ruta + armarConsulta(consulta), {
      method: metodo,
      headers,
      body: cuerpo === undefined ? undefined : esArchivo ? (cuerpo as FormData) : JSON.stringify(cuerpo),
      signal: cancelador.signal,
    });
  } finally {
    clearTimeout(temporizador);
  }
}

/** Si varias requests reciben 401 a la vez, comparten una sola renovación. */
function renovarUnaVez(): Promise<boolean> {
  renovacionEnCurso ??= renovar().finally(() => {
    renovacionEnCurso = null;
  });
  return renovacionEnCurso;
}

/**
 * Para recursos que no pasan por pedir() (p. ej. <Image> con Authorization): renueva el access token una sola vez.
 * Devuelve true si se obtuvo uno nuevo; si la sesión está muerta la expira (como pedir()); ante red caída o error del servidor devuelve false sin tocar la sesión.
 */
export async function renovarSesionParaRecursos(): Promise<boolean> {
  try {
    const renovado = await renovarUnaVez();
    if (!renovado) {
      await expirarSesion(); // refresh vencido, revocado o inexistente: igual que en pedir()
    }
    return renovado;
  } catch {
    return false; // error de red o del servidor: la sesión queda como estaba
  }
}

async function expirarSesion(): Promise<void> {
  await limpiarTokens();
  alExpirarSesion();
}

async function renovar(): Promise<boolean> {
  const refreshToken = await obtenerRefreshToken();
  if (!refreshToken) {
    return false;
  }
  // A3 · POST /auth/refresh. Rota el refresh token en cada uso: se guarda el par nuevo.
  const respuesta = await enviar('/auth/refresh', { metodo: 'POST', cuerpo: { refreshToken }, publico: true });
  if (respuesta.status === 401 || respuesta.status === 403) {
    return false; // refresh vencido, revocado o cuenta suspendida: la sesión está muerta
  }
  if (!respuesta.ok) {
    throw await ApiError.desde(respuesta); // error del servidor: no se borra la sesión
  }
  await guardarTokens((await respuesta.json()) as TokensDeSesion);
  return true;
}

function armarConsulta(consulta: Opciones['consulta']): string {
  if (!consulta) {
    return '';
  }
  const partes: string[] = [];
  for (const [clave, valor] of Object.entries(consulta)) {
    const valores = Array.isArray(valor) ? valor : [valor];
    for (const v of valores) {
      if (v !== undefined && v !== null) {
        partes.push(`${encodeURIComponent(clave)}=${encodeURIComponent(String(v))}`);
      }
    }
  }
  return partes.length ? `?${partes.join('&')}` : '';
}
