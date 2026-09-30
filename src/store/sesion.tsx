import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { configurarAlExpirarSesion } from '../api/cliente';
import { guardarTokens, limpiarTokens, type ParDeTokens } from '../api/tokens';

export type Rol = 'CLIENTE' | 'PRESTADOR' | 'GESTOR';

export interface Sesion {
  rol: Rol;
}

interface ValorDeSesion {
  sesion: Sesion | null;
  /** Después del login (A2). Sin tokens solo se usa en desarrollo, para navegar con datos mock. */
  abrir: (sesion: Sesion, tokens?: ParDeTokens) => Promise<void>;
  cerrar: () => Promise<void>;
}

const ContextoDeSesion = createContext<ValorDeSesion | null>(null);

/**
 * Quién está logueado y con qué rol; decide qué navegación se muestra.
 * TODO(módulo A): al abrir la app, si hay refresh token, restaurar la sesión con A4 (GET /auth/me).
 */
export function ProveedorDeSesion({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(null);

  useEffect(() => {
    configurarAlExpirarSesion(() => setSesion(null));
  }, []);

  const abrir = useCallback(async (nueva: Sesion, tokens?: ParDeTokens) => {
    if (tokens) {
      await guardarTokens(tokens);
    }
    setSesion(nueva);
  }, []);

  const cerrar = useCallback(async () => {
    await limpiarTokens();
    setSesion(null);
  }, []);

  const valor = useMemo(() => ({ sesion, abrir, cerrar }), [sesion, abrir, cerrar]);
  return <ContextoDeSesion.Provider value={valor}>{children}</ContextoDeSesion.Provider>;
}

export function useSesion(): ValorDeSesion {
  const valor = useContext(ContextoDeSesion);
  if (!valor) {
    throw new Error('useSesion tiene que usarse dentro de ProveedorDeSesion');
  }
  return valor;
}
