import type { NombreDeIcono } from '../navigation/iconos';

/** Íconos permitidos para un tipo de servicio. Idéntica a la lista del backend (B2/B3). */
export const ICONOS_DE_SERVICIO = [
  'water',
  'flash',
  'sparkles',
  'flame',
  'hammer',
  'leaf',
  'construct',
  'brush',
  'car',
  'home',
  'paw',
  'laptop',
] as const satisfies readonly NombreDeIcono[];
