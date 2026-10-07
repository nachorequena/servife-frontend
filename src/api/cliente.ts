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
 * - Cualquier respuesta no 2xx se lanza como ApiError con el formato único de error.
 */

export const URL_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

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
      await limpiarTokens();
      alExpirarSesion();
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

function enviar(ruta: string, { metodo = 'GET', cuerpo, consulta, publico }: Opciones): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const esArchivo = typeof FormData !== 'undefined' && cuerpo instanceof FormData;
  if (cuerpo !== undefined && !esArchivo) {
    headers['Content-Type'] = 'application/json';
  }
  const token = obtenerAccessToken();
  if (token && !publico) {
    headers.Authorization = `Bearer ${token}`;
  }
  return fetch(URL_BASE + ruta + armarConsulta(consulta), {
    method: metodo,
    headers,
    body: cuerpo === undefined ? undefined : esArchivo ? (cuerpo as FormData) : JSON.stringify(cuerpo),
  });
}

/** Si varias requests reciben 401 a la vez, comparten una sola renovación. */
function renovarUnaVez(): Promise<boolean> {
  renovacionEnCurso ??= renovar().finally(() => {
    renovacionEnCurso = null;
  });
  return renovacionEnCurso;
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
