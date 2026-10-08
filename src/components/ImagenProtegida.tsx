import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Image, StyleSheet, View, type StyleProp, type ImageStyle } from 'react-native';

import { urlDeArchivo } from '../api/archivos';
import { obtenerAccessToken } from '../api/tokens';
import { colores, tamanios } from '../theme';

interface Props {
  uuid: string;
  estilo?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
}

/** Imagen de GET /archivos/{uuid}, que exige Authorization: Bearer (por eso no alcanza con un uri pelado). */
export function ImagenProtegida({ uuid, estilo, accessibilityLabel }: Props) {
  const [fallo, setFallo] = useState(false);
  const token = obtenerAccessToken();

  if (fallo) {
    return (
      <View style={[estilos.marco, estilo]} testID="imagen-protegida-error" accessibilityLabel={accessibilityLabel}>
        <Ionicons name="image-outline" size={tamanios.icono} color={colores.tintaSecundaria} />
      </View>
    );
  }
  if (!token) {
    return <View style={[estilos.marco, estilo]} testID="imagen-protegida-espera" />;
  }
  return (
    <Image
      source={{ uri: urlDeArchivo(uuid), headers: { Authorization: `Bearer ${token}` } }}
      style={[estilos.imagen, estilo]}
      accessibilityLabel={accessibilityLabel}
      onError={() => setFallo(true)}
    />
  );
}

const estilos = StyleSheet.create({
  marco: { backgroundColor: colores.tarjeta, alignItems: 'center', justifyContent: 'center' },
  imagen: { backgroundColor: colores.tarjeta },
});
