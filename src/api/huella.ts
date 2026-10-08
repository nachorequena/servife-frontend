import * as SecureStore from 'expo-secure-store';

/**
 * Ingreso con huella (servife-ia/.ai/07-security.md). Correo y contraseña quedan en expo-secure-store:
 * la contraseña con requireAuthentication (clave del Keystore atada a la biometría; no se puede leer
 * sin huella), el correo sin protección para poder mostrarlo. Estas claves no las toca limpiarTokens():
 * cerrar sesión conserva la huella. Nunca loguear la contraseña.
 */

const CLAVE_CORREO = 'huella.correo';
const CLAVE_CONTRASENIA = 'huella.contrasenia';

export type LecturaConHuella =
  | { estado: 'ok'; correo: string; contrasenia: string }
  /** El usuario canceló, falló la huella o no hay nada guardado. */
  | { estado: 'cancelado' }
  /** Cambiaron las huellas del teléfono: Android invalidó la clave. Ya se borró todo. */
  | { estado: 'invalidada' };

export async function huellaDisponible(): Promise<boolean> {
  try {
    return SecureStore.canUseBiometricAuthentication();
  } catch {
    return false;
  }
}

export async function correoConHuella(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(CLAVE_CORREO);
  } catch {
    return null;
  }
}

/** Devuelve false (sin dejar nada a medias) si el usuario cancela o el guardado falla. */
export async function guardarConHuella(correo: string, contrasenia: string): Promise<boolean> {
  try {
    await SecureStore.setItemAsync(CLAVE_CONTRASENIA, contrasenia, {
      requireAuthentication: true,
      authenticationPrompt: 'Confirmá con tu huella para activarla',
    });
    await SecureStore.setItemAsync(CLAVE_CORREO, correo);
    return true;
  } catch {
    await olvidarHuella();
    return false;
  }
}

export async function leerConHuella(): Promise<LecturaConHuella> {
  const correo = await correoConHuella();
  if (correo === null) {
    return { estado: 'cancelado' };
  }
  let contrasenia: string | null;
  try {
    contrasenia = await SecureStore.getItemAsync(CLAVE_CONTRASENIA, {
      requireAuthentication: true,
      authenticationPrompt: 'Ingresá con tu huella',
    });
  } catch {
    return { estado: 'cancelado' };
  }
  if (contrasenia === null) {
    await olvidarHuella();
    return { estado: 'invalidada' };
  }
  return { estado: 'ok', correo, contrasenia };
}

export async function olvidarHuella(): Promise<void> {
  for (const clave of [CLAVE_CONTRASENIA, CLAVE_CORREO]) {
    try {
      await SecureStore.deleteItemAsync(clave);
    } catch {
      // sigue con la otra clave
    }
  }
}
