import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { Rol } from '../store/sesion';

/**
 * Ingreso con huella (servife-ia/.ai/07-security.md). Correo y contraseña quedan en expo-secure-store:
 * la contraseña con requireAuthentication (clave del Keystore atada a la biometría; no se puede leer
 * sin huella), el correo sin protección para poder mostrarlo. Hay una huella por rol (una cuenta por rol).
 * Estas claves no las toca limpiarTokens():
 * cerrar sesión conserva la huella. Nunca loguear la contraseña.
 */

const claveCorreo = (rol: Rol) => `huella.${rol}.correo`;
const claveContrasenia = (rol: Rol) => `huella.${rol}.contrasenia`;

// Versión anterior: una sola cuenta por teléfono. No se migra (sin entrar no se sabe el rol): se borra.
const CLAVES_DE_UNA_CUENTA = ['huella.correo', 'huella.contrasenia'];
let limpiezaLegada: Promise<void> | null = null;

function borrarClavesLegadas(): Promise<void> {
  limpiezaLegada ??= (async () => {
    for (const clave of CLAVES_DE_UNA_CUENTA) {
      try {
        await SecureStore.deleteItemAsync(clave);
      } catch {
        // se reintenta al reiniciar la app
      }
    }
  })();
  return limpiezaLegada;
}

export type LecturaConHuella =
  | { estado: 'ok'; correo: string; contrasenia: string }
  /** El usuario canceló, falló la huella o no hay nada guardado. */
  | { estado: 'cancelado' }
  /** Cambiaron las huellas del teléfono: Android invalidó la clave. Ya se borró todo. */
  | { estado: 'invalidada' };

export async function huellaDisponible(): Promise<boolean> {
  // Expo Go en iOS no declara NSFaceIDUsageDescription: requireAuthentication falla. Solo en builds.
  if (Platform.OS === 'ios' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return false;
  }
  try {
    return SecureStore.canUseBiometricAuthentication();
  } catch {
    return false;
  }
}

export async function correoConHuella(rol: Rol): Promise<string | null> {
  await borrarClavesLegadas();
  try {
    return await SecureStore.getItemAsync(claveCorreo(rol));
  } catch {
    return null;
  }
}

/** Devuelve false (sin dejar nada a medias) si el usuario cancela o el guardado falla. */
export async function guardarConHuella(rol: Rol, correo: string, contrasenia: string): Promise<boolean> {
  try {
    await SecureStore.setItemAsync(claveContrasenia(rol), contrasenia, {
      requireAuthentication: true,
      authenticationPrompt: 'Confirmá con tu huella para activarla',
    });
    await SecureStore.setItemAsync(claveCorreo(rol), correo);
    return true;
  } catch {
    await olvidarHuella(rol);
    return false;
  }
}

export async function leerConHuella(rol: Rol): Promise<LecturaConHuella> {
  const correo = await correoConHuella(rol);
  if (correo === null) {
    return { estado: 'cancelado' };
  }
  let contrasenia: string | null;
  try {
    contrasenia = await SecureStore.getItemAsync(claveContrasenia(rol), {
      requireAuthentication: true,
      authenticationPrompt: 'Ingresá con tu huella',
    });
  } catch {
    return { estado: 'cancelado' };
  }
  if (contrasenia === null) {
    await olvidarHuella(rol);
    return { estado: 'invalidada' };
  }
  return { estado: 'ok', correo, contrasenia };
}

export async function olvidarHuella(rol: Rol): Promise<void> {
  for (const clave of [claveContrasenia(rol), claveCorreo(rol)]) {
    try {
      await SecureStore.deleteItemAsync(clave);
    } catch {
      // sigue con la otra clave
    }
  }
}
