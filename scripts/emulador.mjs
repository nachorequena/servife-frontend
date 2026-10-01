// Levanta la app en el emulador de Android: arranca un dispositivo virtual (AVD) si no hay ninguno
// corriendo, espera a que bootee y abre la app con Expo Go (expo start --android).
//
// Uso: npm run emulador [-- --avd <nombre>] [-- <flags de expo start, ej. --clear>]
// Setup del emulador (una vez por máquina): README.md, sección "Emulador de Android".

import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ES_WINDOWS, adb, correr, emulador, emuladoresCorriendo, salir, sdk } from './android.mjs';

const ESPERA_BOOT_MS = 180_000;

// Separa --avd <nombre> del resto, que va derecho a expo start.
function leerArgumentos() {
  const args = process.argv.slice(2);
  const i = args.indexOf('--avd');
  if (i === -1) return { avd: process.env.SERVIFE_AVD, paraExpo: args };
  return { avd: args[i + 1], paraExpo: [...args.slice(0, i), ...args.slice(i + 2)] };
}

async function arrancarEmulador(avdPedido) {
  if (!existsSync(emulador)) {
    salir(`Falta el paquete "emulator" del SDK en ${sdk}. Ver README, sección "Emulador de Android".`);
  }
  const avds = correr(emulador, ['-list-avds']).split('\n').map((l) => l.trim()).filter(Boolean);
  if (avds.length === 0) {
    salir('No hay ningún dispositivo virtual creado. Ver README, sección "Emulador de Android".');
  }
  const avd = avdPedido ?? avds[0];
  if (!avds.includes(avd)) {
    salir(`No existe el AVD "${avd}". Disponibles: ${avds.join(', ')}`);
  }

  console.log(`▸ Arrancando el emulador "${avd}"…`);
  spawn(emulador, ['-avd', avd, '-no-boot-anim'], { detached: true, stdio: 'ignore' }).unref();

  const limite = Date.now() + ESPERA_BOOT_MS;
  while (Date.now() < limite) {
    const [serie] = emuladoresCorriendo();
    if (serie && correr(adb, ['-s', serie, 'shell', 'getprop', 'sys.boot_completed']) === '1') {
      console.log('▸ Emulador listo.');
      return;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  salir(`El emulador no terminó de bootear en ${ESPERA_BOOT_MS / 1000} s.`);
}

// La URL de la API sale de la variable de entorno o del .env, igual que en Expo.
function urlApi() {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (!existsSync('.env')) {
    console.warn('⚠ No hay .env: copialo de .env.example (ver README).');
    return undefined;
  }
  const linea = readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .find((l) => l.startsWith('EXPO_PUBLIC_API_URL='));
  return linea?.slice('EXPO_PUBLIC_API_URL='.length).trim();
}

async function avisarSiNoHayBackend(url) {
  try {
    await fetch(url, { signal: AbortSignal.timeout(3000) });
  } catch {
    console.warn(`⚠ El backend no responde en ${url}. Levantalo en servife-backend: docker compose up -d --build`);
  }
}

const cliExpo = join('node_modules', 'expo', 'bin', 'cli');
if (!existsSync(cliExpo)) salir('Faltan las dependencias: corré npm install.');

const { avd, paraExpo } = leerArgumentos();

if (emuladoresCorriendo().length > 0) {
  console.log('▸ Ya hay un emulador corriendo; uso ese.');
} else {
  await arrancarEmulador(avd);
}

// En Windows la variable puede llamarse Path; se reusa la clave existente para no duplicarla.
const clavePath = Object.keys(process.env).find((k) => k.toUpperCase() === 'PATH') ?? 'PATH';
const env = {
  ...process.env,
  ANDROID_HOME: sdk,
  [clavePath]: `${join(sdk, 'platform-tools')}${ES_WINDOWS ? ';' : ':'}${process.env[clavePath]}`,
};

// Dentro del emulador, localhost es el propio emulador; la PC se ve como 10.0.2.2.
const url = urlApi();
if (url) {
  await avisarSiNoHayBackend(url);
  const urlEmulador = url.replace(/\/\/(localhost|127\.0\.0\.1)(?=[:/])/, '//10.0.2.2');
  if (urlEmulador !== url) {
    console.log(`▸ EXPO_PUBLIC_API_URL para el emulador: ${urlEmulador}`);
    env.EXPO_PUBLIC_API_URL = urlEmulador;
  }
}

console.log('▸ Abriendo la app con Expo Go…');
const expo = spawn(process.execPath, [cliExpo, 'start', '--android', ...paraExpo], { stdio: 'inherit', env });
expo.on('exit', (codigo) => process.exit(codigo ?? 0));
