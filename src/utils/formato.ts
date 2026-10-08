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
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_ARGENTINA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** "2026-09-18" → 5. 1 = lunes … 7 = domingo; se calcula con Date.UTC para no depender de la zona del dispositivo. */
export function diaDeSemana(fecha: string): number {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const diaJs = new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay(); // 0 = domingo
  return diaJs === 0 ? 7 : diaJs;
}
