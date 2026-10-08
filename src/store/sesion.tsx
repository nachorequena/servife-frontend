import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { configurarAlExpirarSesion } from '../api/cliente';
import { ApiError } from '../api/errores';
import { iniciarSesion, obtenerSesion, type Usuario } from '../api/identidad';
import { guardarTokens, limpiarTokens, obtenerRefreshToken } from '../api/tokens';

export type Rol = 'CLIENTE' | 'PRESTADOR' | 'GESTOR';

export interface Sesion {
  rol: Rol;
  usuario: Usuario;
}

interface ValorDeSesion {
  sesion: Sesion | null;
  /** true hasta resolver el refresh token guardado (restauración al abrir la app). */
  restaurando: boolean;
  /** A2 → guardar tokens → A4 → sesión. Devuelve el rol real de la cuenta. Relanza el error para que la pantalla lo muestre. */
  ingresar: (email: string, contrasenia: string) => Promise<Rol>;
  /** Tras A6 (editar perfil). */
  actualizarUsuario: (usuario: Usuario) => void;
  cerrar: () => Promise<void>;
}

const ContextoDeSesion = createContext<ValorDeSesion | null>(null);

/**
 * Quién está logueado y con qué rol; decide qué navegación se muestra.
 * Al abrir la app, si hay refresh token, restaura la sesión con A4 (GET /auth/me): el cliente HTTP
 * renueva el access ante un 401. Solo un 401/403 limpia los tokens; un fallo de red los conserva.
 */
export function ProveedorDeSesion({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [restaurando, setRestaurando] = useState(true);

  useEffect(() => {
    configurarAlExpirarSesion(() => setSesion(null));
  }, []);

  useEffect(() => {
    let vigente = true;
    async function restaurar() {
      try {
        if ((await obtenerRefreshToken()) === null) {
          return;
        }
        const usuario = await obtenerSesion();
        if (vigente) {
          setSesion({ rol: usuario.rol, usuario });
        }
      } catch (error) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          await limpiarTokens();
        }
      } finally {
        if (vigente) {
          setRestaurando(false);
        }
      }
    }
    void restaurar();
    return () => {
      vigente = false;
    };
  }, []);

  const ingresar = useCallback(async (email: string, contrasenia: string): Promise<Rol> => {
    const { accessToken, refreshToken } = await iniciarSesion({ email, contrasenia });
    await guardarTokens({ accessToken, refreshToken });
    try {
      const usuario = await obtenerSesion();
      setSesion({ rol: usuario.rol, usuario });
      return usuario.rol;
    } catch (error) {
      await limpiarTokens().catch(() => {});
      throw error;
    }
  }, []);

  const actualizarUsuario = useCallback((usuario: Usuario) => {
    setSesion((actual) => (actual ? { ...actual, usuario } : actual));
  }, []);

  const cerrar = useCallback(async () => {
    await limpiarTokens();
    setSesion(null);
  }, []);

  const valor = useMemo(
    () => ({ sesion, restaurando, ingresar, actualizarUsuario, cerrar }),
    [sesion, restaurando, ingresar, actualizarUsuario, cerrar],
  );
  return <ContextoDeSesion.Provider value={valor}>{children}</ContextoDeSesion.Provider>;
}

export function useSesion(): ValorDeSesion {
  const valor = useContext(ContextoDeSesion);
  if (!valor) {
    throw new Error('useSesion tiene que usarse dentro de ProveedorDeSesion');
  }
  return valor;
}
