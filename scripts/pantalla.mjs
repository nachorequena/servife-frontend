// Mirar y manejar la pantalla del emulador para las pruebas end to end (../servife-ia/.ai/08-testing.md §6).
//
// Uso:
//   npm run pantalla                        lista los textos visibles y el punto donde tocar cada uno
//   npm run pantalla -- tocar "<texto>"     toca el elemento con ese texto (o descripción accesible)
//   npm run pantalla -- escribir "<texto>"  escribe en el campo que tiene el foco
//   npm run pantalla -- atras               botón Atrás de Android
//   npm run pantalla -- captura <archivo>   guarda una captura PNG (fuera del repo)

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { adb, emuladoresCorriendo, salir } from './android.mjs';

// Las capturas de pantalla pasan de 1 MB, el default de Node.
const MAX_SALIDA = 64 * 1024 * 1024;

const [serie] = emuladoresCorriendo();
if (!serie) salir('No hay ningún emulador corriendo. Levantalo con npm run emulador.');

function adbShell(...args) {
  return execFileSync(adb, ['-s', serie, ...args], { encoding: 'utf8', maxBuffer: MAX_SALIDA });
}

function elementos() {
  adbShell('shell', 'uiautomator', 'dump', '/sdcard/servife-ui.xml');
  const xml = adbShell('exec-out', 'cat', '/sdcard/servife-ui.xml');
  const atributo = (nodo, nombre) => nodo.match(new RegExp(`\\b${nombre}="([^"]*)"`))?.[1] ?? '';
  return [...xml.matchAll(/<node\b[^>]*>/g)]
    .map(([nodo]) => {
      const [x1, y1, x2, y2] = atributo(nodo, 'bounds').match(/\d+/g)?.map(Number) ?? [];
      return {
        texto: atributo(nodo, 'text') || atributo(nodo, 'content-desc'),
        tocable: atributo(nodo, 'clickable') === 'true',
        x: Math.round((x1 + x2) / 2),
        y: Math.round((y1 + y2) / 2),
      };
    })
    .filter((e) => e.texto);
}

const [accion, valor] = process.argv.slice(2);

switch (accion) {
  case undefined:
  case 'ver': {
    const vistos = new Set();
    for (const e of elementos()) {
      if (vistos.has(e.texto)) continue;
      vistos.add(e.texto);
      console.log(`${e.tocable ? '[tocable] ' : '          '}"${e.texto}"  (${e.x}, ${e.y})`);
    }
    break;
  }
  case 'tocar': {
    const todos = elementos();
    const elemento = todos.find((e) => e.texto === valor && e.tocable) ?? todos.find((e) => e.texto === valor);
    if (!elemento) salir(`No hay ningún elemento con el texto "${valor}" en pantalla. Mirá npm run pantalla.`);
    adbShell('shell', 'input', 'tap', String(elemento.x), String(elemento.y));
    console.log(`▸ Tocado "${valor}" en (${elemento.x}, ${elemento.y})`);
    break;
  }
  case 'escribir':
    // input text no acepta espacios: van como %s.
    adbShell('shell', 'input', 'text', valor.replaceAll(' ', '%s'));
    break;
  case 'atras':
    adbShell('shell', 'input', 'keyevent', 'KEYCODE_BACK');
    break;
  case 'captura':
    if (!valor) salir('Falta el archivo: npm run pantalla -- captura <archivo.png>');
    writeFileSync(valor, execFileSync(adb, ['-s', serie, 'exec-out', 'screencap', '-p'], { maxBuffer: MAX_SALIDA }));
    console.log(`▸ Captura en ${valor}`);
    break;
  default:
    salir(`Acción desconocida "${accion}". Ver el encabezado de scripts/pantalla.mjs.`);
}
