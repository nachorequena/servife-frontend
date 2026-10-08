import { StyleSheet, Text, View } from 'react-native';

import { colores, espaciado, tipografia } from '../theme';

/** Mensaje centrado para listas sin resultados. */
export function EstadoVacio({ mensaje }: { mensaje: string }) {
  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.texto}>{mensaje}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { padding: espaciado.l, alignItems: 'center' },
  texto: { ...tipografia.cuerpo, color: colores.tintaSecundaria, textAlign: 'center' },
});
