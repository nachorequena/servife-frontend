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
  verdeClaro: '#E6F8F2', // fondo de un aviso sin leer
  // Estados y superficies (bloque A de diseño, 2026-10-22). Todos pasan WCAG AA (4.5:1) sobre su fondo.
  verdeTexto: '#1B6E4F', // texto o ícono de éxito, sobre blanco o verdeClaro
  rojo: '#C62828', // error y acciones destructivas (botón peligro: texto blanco)
  rojoClaro: '#FDECEA', // fondo de un error
  advertencia: '#7A4F00', // texto de advertencia
  advertenciaClara: '#FFF4D6', // fondo de una advertencia
  lilaTexto: '#5B43D6', // texto lila chico (el lila de marca no llega a 4.5:1 en texto chico)
  lilaClaro: '#EFEBFF', // fondo de una etiqueta lila
  borde: '#8C8C8C', // borde de botón contorno (3:1 contra blanco)
  bordeSuave: '#E3E3E3', // borde de tarjeta blanca y separadores
  esqueleto: '#E6E6E6', // marcador animado mientras carga
  velo: 'rgba(0, 0, 0, 0.45)', // fondo detrás de una hoja inferior o un diálogo
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
  globo: { fontSize: 11, fontWeight: '700' },
  etiqueta: { fontSize: 12, fontWeight: '600' },
  botonChico: { fontSize: 14, fontWeight: '700' },
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
  avatarChico: 36, // tarjetas de solicitudes del prestador (.reqcard)
  avatarGrande: 132,
  icono: 22,
  celdaIcono: 48,
  globo: 18, // globo de la campana
  punto: 10, // punto de aviso sin leer
  puntoCarrusel: 6, // indicador de la foto actual en un carrusel
  miniatura: 72, // miniatura de imagen adjunta
  iconoChico: 18, // ícono dentro de un botón chico, una etiqueta o un input
  botonFlotante: 56, // botón redondo flotante (acción principal de una lista)
} as const;

/** Elevación de superficies que flotan (aviso flotante, botón flotante, hoja inferior). */
export const elevaciones = {
  flotante: { elevation: 6, shadowColor: '#000000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  tarjeta: { elevation: 1, shadowColor: '#000000', shadowOpacity: 0.06, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
} as const;

/** Duraciones de animación y del aviso flotante (ms). */
export const duraciones = {
  aviso: 3000,
  animacion: 200,
  pulso: 800,
} as const;

/** Opacidad de un botón presionado o deshabilitado. */
export const opacidades = {
  atenuado: 0.6,
} as const;
