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
