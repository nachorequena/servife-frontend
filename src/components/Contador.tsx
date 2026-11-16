import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { NombreDeIcono } from '../navigation/iconos';
import { bordes, colores, espaciado, radios, tamanios, tipografia } from '../theme';

interface Props {
  icono: NombreDeIcono;
  /** Número o texto ya formateado (por ejemplo, la valoración "4,5"). */
  numero: number | string;
  etiqueta: string;
  /** Resalta el contador cuando pide atención (por ejemplo, validaciones pendientes). */
  destacado?: boolean;
  onPress?: () => void;
}

/** Tarjeta de un indicador de dashboard: ícono, número grande y texto chico. Si se toca, lleva a la lista correspondiente. */
export function Contador({ icono, numero, etiqueta, destacado = false, onPress }: Props) {
  const contenido = (
    <>
      <View style={[estilos.icono, destacado && estilos.iconoDestacado]}>
        <Ionicons name={icono} size={tamanios.icono} color={destacado ? colores.advertencia : colores.lilaTexto} />
      </View>
      <Text style={estilos.numero}>{numero}</Text>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
    </>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" accessibilityLabel={`${etiqueta}: ${numero}`} onPress={onPress} style={estilos.contador}>
      {contenido}
    </Pressable>
  ) : (
    <View style={estilos.contador} accessible accessibilityLabel={`${etiqueta}: ${numero}`}>
      {contenido}
    </View>
  );
}

const estilos = StyleSheet.create({
  contador: {
    flex: 1,
    backgroundColor: colores.blanco,
    borderRadius: radios.tarjeta,
    borderWidth: bordes.fino,
    borderColor: colores.bordeSuave,
    padding: espaciado.m,
    gap: espaciado.xs,
  },
  icono: {
    width: tamanios.avatarChico,
    height: tamanios.avatarChico,
    borderRadius: radios.pill,
    backgroundColor: colores.lilaClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconoDestacado: { backgroundColor: colores.advertenciaClara },
  numero: { ...tipografia.titulo, color: colores.tinta },
  etiqueta: { ...tipografia.etiqueta, color: colores.tintaSecundaria },
});
