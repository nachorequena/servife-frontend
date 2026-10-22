import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import type { NombreDeIcono } from '../navigation/iconos';
import { colores, espaciado, radios, tamanios, tipografia } from '../theme';

export type TonoDeEtiqueta = 'neutro' | 'exito' | 'advertencia' | 'error' | 'lila';

const TONOS: Record<TonoDeEtiqueta, { fondo: string; texto: string }> = {
  neutro: { fondo: colores.fondo, texto: colores.tinta },
  exito: { fondo: colores.verdeClaro, texto: colores.verdeTexto },
  advertencia: { fondo: colores.advertenciaClara, texto: colores.advertencia },
  error: { fondo: colores.rojoClaro, texto: colores.rojo },
  lila: { fondo: colores.lilaClaro, texto: colores.lilaTexto },
};

interface Props {
  texto: string;
  tono?: TonoDeEtiqueta;
  icono?: NombreDeIcono;
}

/** Etiqueta chica de estado o categoría (Pendiente, Aprobado, Suspendida, Gestor...). Contraste AA en todos los tonos. */
export function Etiqueta({ texto, tono = 'neutro', icono }: Props) {
  const { fondo, texto: color } = TONOS[tono];
  return (
    <View style={[estilos.base, { backgroundColor: fondo }]}>
      {icono !== undefined && <Ionicons name={icono} size={tamanios.iconoChico - 4} color={color} />}
      <Text style={[estilos.texto, { color }]}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: espaciado.xs,
    paddingVertical: espaciado.xs / 2,
    paddingHorizontal: espaciado.s,
    borderRadius: radios.pill,
  },
  texto: tipografia.etiqueta,
});
