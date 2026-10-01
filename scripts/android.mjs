// Ubicación del Android SDK y de sus herramientas, compartido por los scripts del emulador.

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const ES_WINDOWS = process.platform === 'win32';

export function salir(mensaje) {
  console.error(`\n✖ ${mensaje}\n`);
  process.exit(1);
}

function rutaSdk() {
  const candidatas = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    ES_WINDOWS && process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Android', 'Sdk'),
    process.platform === 'darwin' && join(homedir(), 'Library', 'Android', 'sdk'),
    process.platform === 'linux' && join(homedir(), 'Android', 'Sdk'),
  ].filter(Boolean);
  const sdk = candidatas.find((ruta) => existsSync(join(ruta, 'platform-tools')));
  if (!sdk) {
    salir('No encontré el Android SDK (ANDROID_HOME). Instalalo siguiendo el README, sección "Emulador de Android".');
  }
  return sdk;
}

export const sdk = rutaSdk();
export const adb = join(sdk, 'platform-tools', ES_WINDOWS ? 'adb.exe' : 'adb');
export const emulador = join(sdk, 'emulator', ES_WINDOWS ? 'emulator.exe' : 'emulator');

/** Corre un comando y devuelve su salida; '' si falla. */
export function correr(comando, args) {
  try {
    return execFileSync(comando, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

export function emuladoresCorriendo() {
  return correr(adb, ['devices'])
    .split('\n')
    .filter((linea) => /^emulator-\d+\s+device$/.test(linea.trim()))
    .map((linea) => linea.split(/\s+/)[0]);
}
