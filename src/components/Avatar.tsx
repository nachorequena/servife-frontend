import { Image, StyleSheet, Text, View } from 'react-native';

import { colores, radios, tamanios, tipografia } from '../theme';

interface Props {
  nombre: string;
  /** Con foto (listas del cliente) se muestra la imagen; sin foto, iniciales sobre lila. */
  uri?: string;
  tamanio?: number;
}

export function Avatar({ nombre, uri, tamanio = tamanios.avatar }: Props) {
  const dimension = { width: tamanio, height: tamanio, borderRadius: radios.pill };
  if (uri) {
    return <Image source={{ uri }} style={dimension} accessibilityLabel={nombre} />;
  }
  return (
    <View style={[estilos.iniciales, dimension]} accessibilityLabel={nombre}>
      <Text style={estilos.texto}>{iniciales(nombre)}</Text>
    </View>
  );
}

function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .map((palabra) => palabra[0].toUpperCase())
    .join('')
    .slice(0, 2);
}

const estilos = StyleSheet.create({
  iniciales: { backgroundColor: colores.lila, alignItems: 'center', justifyContent: 'center' },
  texto: { ...tipografia.seccion, color: colores.blanco },
});
