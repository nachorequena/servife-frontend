/**
 * Formatos de datos que llegan del backend (servife-ia/.ai/09-ux-ui.md §Datos):
 * fechas en UTC que se muestran en hora de Argentina, y montos en centavos.
 */

const ZONA_ARGENTINA = 'America/Argentina/Buenos_Aires';
const LOCALE = 'es-AR';

/** "2026-09-18T13:12:04Z" → "18/09/2026, 10:12" (hora de Argentina). */
export function formatearFechaHora(isoUtc: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: ZONA_ARGENTINA,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(isoUtc));
}

/**
 * Cuánto pasó desde una fecha, contado en días de Argentina: "hoy", "ayer", "hace 3 días", "hace 2 semanas";
 * más de 8 semanas, la fecha ("18/09/2026").
 */
export function haceCuanto(isoUtc: string, ahora: Date = new Date()): string {
  const dia = (d: Date) => Date.parse(
    new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_ARGENTINA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d),
  );
  const dias = Math.round((dia(ahora) - dia(new Date(isoUtc))) / 86_400_000);
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias < 14) return `hace ${dias} días`;
  if (dias < 56) return `hace ${Math.floor(dias / 7)} semanas`;
  return formatearFecha(isoUtc);
}

/** Fecha de hoy para un saludo: "miércoles 22 de octubre" (hora de Argentina). */
export function formatearFechaLarga(fecha: Date = new Date()): string {
  return new Intl.DateTimeFormat(LOCALE, { timeZone: ZONA_ARGENTINA, weekday: 'long', day: 'numeric', month: 'long' })
    .format(fecha)
    .replace(',', '');
}

/** "2026-09-18T13:12:04Z" → "18/09/2026" (fecha en Argentina). */
export function formatearFecha(isoUtc: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: ZONA_ARGENTINA,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(isoUtc));
}

/** 800000 centavos → "$ 8.000". Los montos siempre viajan en centavos (INTEGER). */
export function formatearCentavos(centavos: number): string {
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: centavos % 100 === 0 ? 0 : 2,
  }).format(centavos / 100);
}

const NOMBRES_DE_DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/** [1, 3, 5] → "Lun, Mié, Vie" (1 = lunes … 7 = domingo; se ordenan). */
export function nombresDeDias(dias: number[]): string {
  return [...dias]
    .sort((a, b) => a - b)
    .map((dia) => NOMBRES_DE_DIAS[dia - 1])
    .join(', ');
}

/** "2026-09-18" → "18/09/2026". Fecha sola: se parte el texto, nunca pasa por Date ni por zona horaria. */
export function formatearFechaSola(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}

/** Hoy en Argentina como "AAAA-MM-DD" (a las 22:30 ART sigue siendo el día argentino aunque en UTC ya sea mañana). */
export function hoyEnArgentina(): string {
  const ahora = new Date();
  try {
    const partes = new Intl.DateTimeFormat('en-US', {
      timeZone: ZONA_ARGENTINA,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(ahora);
    const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value;
    const [anio, mes, dia] = [valor('year'), valor('month'), valor('day')];
    if (anio && mes && dia) {
      return `${anio}-${mes}-${dia}`;
    }
  } catch {
    // Intl sin soporte de zonas horarias: se cae al cálculo manual.
  }
  // Argentina es UTC-3 todo el año (sin horario de verano).
  return new Date(ahora.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** "AAAA-MM-DD" que además es una fecha real del calendario (descarta 2026-02-31). */
export function esFechaReal(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const f = new Date(Date.UTC(anio, mes - 1, dia));
  return f.getUTCFullYear() === anio && f.getUTCMonth() === mes - 1 && f.getUTCDate() === dia;
}

/** "2026-09-18" → 5. 1 = lunes … 7 = domingo; se calcula con Date.UTC para no depender de la zona del dispositivo. */
export function diaDeSemana(fecha: string): number {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const diaJs = new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay(); // 0 = domingo
  return diaJs === 0 ? 7 : diaJs;
}

/**
 * Pesos escritos a mano → centavos enteros, o null si el formato no es válido.
 * Acepta "8000", "8.000" (miles), "1.234,56", "8000,5" y "1500.50" (punto decimal si no es un grupo de 3).
 */
export function pesosACentavos(texto: string): number | null {
  const t = texto.trim();
  let entera: string;
  let decimales = '';
  let m: RegExpExecArray | null;
  if ((m = /^(\d{1,3}(?:\.\d{3})+)(?:,(\d{1,2}))?$/.exec(t))) {
    entera = m[1].replace(/\./g, '');
    decimales = m[2] ?? '';
  } else if ((m = /^(\d+)(?:[,.](\d{1,2}))?$/.exec(t))) {
    entera = m[1];
    decimales = m[2] ?? '';
  } else {
    return null;
  }
  const centavos = Number(entera) * 100 + Number(decimales.padEnd(2, '0'));
  return Number.isSafeInteger(centavos) ? centavos : null;
}

const dosDigitos = (n: number) => String(n).padStart(2, '0');

/** "2026-09-18" → Date del 18/09/2026 a las 12:00 locales (mediodía: ninguna zona del dispositivo corre el día). Para el selector. */
export function fechaADate(fecha: string): Date {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Date(anio, mes - 1, dia, 12);
}

/** Date elegido en el selector → "AAAA-MM-DD" con el día que el usuario vio en el calendario (sin pasar por UTC). */
export function dateAFechaSola(fecha: Date): string {
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;
}

/** "14:30" → Date de hoy a esa hora, para abrir el selector en ese valor. */
export function horaADate(hora: string): Date {
  const [horas, minutos] = hora.split(':').map(Number);
  const d = new Date();
  d.setHours(horas, minutos, 0, 0);
  return d;
}

/** Date elegido en el selector → "HH:mm" (24 h). */
export function dateAHora(fecha: Date): string {
  return `${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;
}

/** "2026-10-08" → "2026-10-07". Se calcula con Date.UTC, sin depender de la zona del dispositivo. */
export function diaAnterior(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia - 1)).toISOString().slice(0, 10);
}
