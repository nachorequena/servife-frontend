// Levanta la app en un celular Android conectado por cable USB, sin depender del WiFi, y espeja su
// pantalla en la PC con scrcpy (para presentar). Todo viaja por el cable: adb reverse lleva el
// puerto de Metro y el del backend del celular a la PC.
//
// Uso: npm run celular [-- --sin-espejo] [-- <flags de expo start, ej. --offline o --clear>]
// Setup del celular (una vez): README.md, sección "Celular por cable".

import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ES_WINDOWS, adb, avisarSiNoHayBackend, correr, salir, sdk, urlApi } from './android.mjs';

const PUERTO_METRO = 8081;
const ESPERA_METRO_MS = 120_000;
const EXPO_GO = 'host.exp.exponent';

// Separa --sin-espejo del resto, que va derecho a expo start.
function leerArgumentos() {
  const args = process.argv.slice(2);
  return { espejo: !args.includes('--sin-espejo'), paraExpo: args.filter((a) => a !== '--sin-espejo') };
}

// El primer celular conectado por USB (los emuladores se ignoran). SERVIFE_CELULAR elige uno.
function buscarCelular() {
  const lineas = correr(adb, ['devices'])
    .split('\n')
    .slice(1)
    .map((l) => l.trim().split(/\s+/))
    .filter(([serie, estado]) => serie && estado && !serie.startsWith('emulator-'));
  const pedido = process.env.SERVIFE_CELULAR;
  const [serie, estado] = (pedido ? lineas.find(([s]) => s === pedido) : lineas[0]) ?? [];
  if (!serie) {
    salir(
      'No encontré ningún celular por USB. Revisá: depuración USB activada, cable de datos (no solo ' +
        'de carga) y, en Samsung, el "Bloqueador automático" desactivado. README, sección "Celular por cable".',
    );
  }
  if (estado === 'unauthorized') {
    salir('El celular no autorizó a esta PC: aceptá "¿Permitir depuración USB?" en la pantalla del celular.');
  }
  if (estado !== 'device') salir(`El celular ${serie} está en estado "${estado}". Desenchufalo y volvé a enchufarlo.`);
  return serie;
}

function puertoDe(url) {
  const u = new URL(url);
  return Number(u.port || (u.protocol === 'https:' ? 443 : 80));
}

// adb reverse: en el celular, 127.0.0.1:<puerto> es el mismo puerto de la PC.
function reenviar(serie, puerto) {
  correr(adb, ['-s', serie, 'reverse', `tcp:${puerto}`, `tcp:${puerto}`]);
  if (!correr(adb, ['-s', serie, 'reverse', '--list']).includes(`tcp:${puerto} tcp:${puerto}`)) {
    salir(`No pude reenviar el puerto ${puerto} al celular.`);
  }
}

async function metroCorriendo() {
  try {
    const r = await fetch(`http://127.0.0.1:${PUERTO_METRO}/status`, { signal: AbortSignal.timeout(1000) });
    return (await r.text()).includes('packager-status:running');
  } catch {
    return false;
  }
}

// scrcpy del PATH o, en Windows, el que deja winget.
function buscarScrcpy() {
  const enPath = correr(ES_WINDOWS ? 'where' : 'which', ['scrcpy']).split(/\r?\n/)[0];
  if (enPath) return enPath;
  const paquetes = ES_WINDOWS && process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Packages');
  if (!paquetes || !existsSync(paquetes)) return undefined;
  for (const paquete of readdirSync(paquetes).filter((d) => d.startsWith('Genymobile.scrcpy'))) {
    for (const version of readdirSync(join(paquetes, paquete))) {
      const exe = join(paquetes, paquete, version, 'scrcpy.exe');
      if (existsSync(exe)) return exe;
    }
  }
  return undefined;
}

const cliExpo = join('node_modules', 'expo', 'bin', 'cli');
if (!existsSync(cliExpo)) salir('Faltan las dependencias: corré npm install.');

const { espejo, paraExpo } = leerArgumentos();
const serie = buscarCelular();
console.log(`▸ Celular conectado: ${correr(adb, ['-s', serie, 'shell', 'getprop', 'ro.product.model']) || serie}`);

if (await metroCorriendo()) {
  salir(`Ya hay un Expo corriendo en el puerto ${PUERTO_METRO}. Cerralo (Ctrl+C en esa terminal) y volvé a probar.`);
}

// La API se pide a 127.0.0.1 con el puerto y la ruta del .env; el .env queda igual.
const url = urlApi();
if (!url) salir('Falta EXPO_PUBLIC_API_URL (en el .env o en la variable de entorno).');
const urlCelular = `http://127.0.0.1:${puertoDe(url)}${new URL(url).pathname.replace(/\/$/, '')}`;
await avisarSiNoHayBackend(urlCelular);

reenviar(serie, PUERTO_METRO);
reenviar(serie, puertoDe(url));
console.log(`▸ Puertos ${PUERTO_METRO} y ${puertoDe(url)} reenviados por el cable. API: ${urlCelular}`);

if (!correr(adb, ['-s', serie, 'shell', 'pm', 'list', 'packages', '--user', '0', EXPO_GO]).includes(EXPO_GO)) {
  console.warn('⚠ El celular no tiene Expo Go: instalalo desde Play Store y volvé a correr npm run celular.');
}

// En Windows la variable puede llamarse Path; se reusa la clave existente para no duplicarla.
const clavePath = Object.keys(process.env).find((k) => k.toUpperCase() === 'PATH') ?? 'PATH';
const env = {
  ...process.env,
  ANDROID_HOME: sdk,
  [clavePath]: `${join(sdk, 'platform-tools')}${ES_WINDOWS ? ';' : ':'}${process.env[clavePath]}`,
  EXPO_PUBLIC_API_URL: urlCelular,
  // Con --localhost Metro escucha solo en IPv6 (::1) y adb reverse llega por IPv4: se usa --lan
  // (escucha en todas las interfaces) anunciando 127.0.0.1.
  REACT_NATIVE_PACKAGER_HOSTNAME: '127.0.0.1',
};

console.log('▸ Arrancando Expo…');
const expo = spawn(process.execPath, [cliExpo, 'start', '--lan', ...paraExpo], { stdio: 'inherit', env });
let scrcpy;
expo.on('exit', (codigo) => {
  scrcpy?.kill();
  process.exit(codigo ?? 0);
});

const limite = Date.now() + ESPERA_METRO_MS;
while (!(await metroCorriendo())) {
  if (Date.now() > limite) salir(`Expo no arrancó en ${ESPERA_METRO_MS / 1000} s.`);
  await new Promise((r) => setTimeout(r, 1000));
}

console.log('▸ Abriendo la app en el celular…');
correr(adb, ['-s', serie, 'shell', 'am', 'start', '--user', '0', '-a', 'android.intent.action.VIEW',
  '-d', `exp://127.0.0.1:${PUERTO_METRO}`, EXPO_GO]);

if (espejo) {
  const exe = buscarScrcpy();
  if (!exe) {
    console.warn('⚠ No encontré scrcpy, así que no hay espejo de pantalla. Instalalo: winget install Genymobile.scrcpy');
  } else {
    console.log('▸ Espejando la pantalla con scrcpy (cerrá la ventana para dejar de espejar)…');
    // ADB: que scrcpy use el adb del SDK y no levante otro servidor que corte los reenvíos.
    scrcpy = spawn(exe, ['-s', serie, '--stay-awake', '--window-title', 'ServiFe'], {
      stdio: 'ignore',
      env: { ...env, ADB: adb },
    });
  }
}
