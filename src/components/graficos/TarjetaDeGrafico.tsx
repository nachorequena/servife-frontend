import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { bordes, colores, espaciado, radios, tipografia } from '../../theme';

interface Props {
  /** Nombra lo que muestra el gráfico (con una sola serie, el título reemplaza a la leyenda). */
  titulo: string;
  subtitulo?: string;
  children: ReactNode;
}

/** Tarjeta blanca con título para un gráfico de dashboard. */
export function TarjetaDeGrafico({ titulo, subtitulo, children }: Props) {
  return (
    <View style={estilos.tarjeta}>
      <Text style={estilos.titulo} accessibilityRole="header">
        {titulo}
      </Text>
      {subtitulo !== undefined && <Text style={estilos.subtitulo}>{subtitulo}</Text>}
      <View style={estilos.cuerpo}>{children}</View>
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    backgroundColor: colores.blanco,
    borderRadius: radios.tarjeta,
    borderWidth: bordes.fino,
    borderColor: colores.bordeSuave,
    padding: espaciado.m,
  },
  titulo: { ...tipografia.seccion, color: colores.tinta },
  subtitulo: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
  cuerpo: { marginTop: espaciado.m },
});
