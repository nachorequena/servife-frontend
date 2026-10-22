import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import type { NombreDeIcono } from '../navigation/iconos';
import { colores, espaciado, tamanios, tipografia } from '../theme';
import { Button } from './Button';

interface Props {
  mensaje: string;
  /** Ícono grande arriba del mensaje (opcional). */
  icono?: NombreDeIcono;
  /** Acción para salir del vacío (por ejemplo, "Limpiar filtros"). */
  accion?: { etiqueta: string; onPress: () => void };
}

/** Mensaje centrado para listas sin resultados, con ícono y acción opcionales. */
export function EstadoVacio({ mensaje, icono, accion }: Props) {
  return (
    <View style={estilos.contenedor}>
      {icono !== undefined && (
        <View style={estilos.circulo}>
          <Ionicons name={icono} size={tamanios.avatar / 2} color={colores.tintaSecundaria} />
        </View>
      )}
      <Text style={estilos.texto}>{mensaje}</Text>
      {accion !== undefined && (
        <Button etiqueta={accion.etiqueta} onPress={accion.onPress} variante="contorno" tamanio="chico" ancho="contenido" />
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { padding: espaciado.l, alignItems: 'center', gap: espaciado.m },
  circulo: {
    width: tamanios.avatar * 1.5,
    height: tamanios.avatar * 1.5,
    borderRadius: tamanios.avatar,
    backgroundColor: colores.bordeSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: { ...tipografia.cuerpo, color: colores.tintaSecundaria, textAlign: 'center' },
});
