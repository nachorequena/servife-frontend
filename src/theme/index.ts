/**
 * Tokens de diseño: la única fuente de colores, radios, tipografía y espaciados
 * (servife-ia/.ai/09-ux-ui.md). Nada de valores escritos a mano en pantallas o componentes.
 */

export const colores = {
  verde: '#00C48C', // acción principal
  verdeOscuro: '#00A87A',
  tinta: '#2E2E2E', // botón secundario y texto
  tintaSecundaria: '#5A5A5A',
  fondo: '#F2F2F2', // fondo de pantalla
  tarjeta: '#C9C9C9', // tarjetas de listado
  blanco: '#FFFFFF',
  lila: '#7B61FF', // navegación del gestor
  fondoLila: '#FBF2FF',
  estrella: '#F5C518',
} as const;

export const radios = {
  input: 8,
  boton: 8,
  tarjeta: 13,
  hoja: 18,
  pill: 999,
} as const;

export const tipografia = {
  logo: { fontSize: 40, fontWeight: '800', letterSpacing: -1.2 },
  titulo: { fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  seccion: { fontSize: 17, fontWeight: '700' },
  cuerpo: { fontSize: 14, fontWeight: '400' },
  boton: { fontSize: 16, fontWeight: '700' },
} as const;

/** Escala de márgenes y paddings. No está en la maqueta: se agregó para no escribir números sueltos. */
export const espaciado = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
} as const;

/** Grosor de bordes (inputs: 1 px oscuro, según la maqueta). */
export const bordes = {
  fino: 1,
} as const;

/** Tamaños fijos de elementos. No están en la maqueta con número: se agregaron como punto de partida. */
export const tamanios = {
  avatar: 48,
  avatarGrande: 132,
  icono: 22,
  celdaIcono: 48,
} as const;

/** Opacidad de un botón presionado o deshabilitado. */
export const opacidades = {
  atenuado: 0.6,
} as const;
