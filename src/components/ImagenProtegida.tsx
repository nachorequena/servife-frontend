import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, View, type ImageStyle, type StyleProp } from 'react-native';

import { descargarImagen } from '../api/archivos';
import { colores, tamanios } from '../theme';

interface Props {
  uuid: string;
  estilo?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
}

type Estado = { fase: 'cargando' } | { fase: 'lista'; uri: string } | { fase: 'fallo' };

/**
 * Imagen de GET /archivos/{uuid}, que exige Authorization: Bearer. <Image> no manda headers en esta versión
 * de React Native, así que se descarga con descargarImagen (api/archivos.ts, con renovación del token ante
 * un 401) a la caché y se muestra el archivo local.
 */
export function ImagenProtegida({ uuid, estilo, accessibilityLabel }: Props) {
  const [estado, setEstado] = useState<Estado>({ fase: 'cargando' });

  useEffect(() => {
    let vigente = true; // se descarta el resultado si cambió el uuid o se desmontó
    setEstado({ fase: 'cargando' });
    descargarImagen(uuid).then(
      (uri) => vigente && setEstado({ fase: 'lista', uri }),
      () => vigente && setEstado({ fase: 'fallo' }),
    );
    return () => {
      vigente = false;
    };
  }, [uuid]);

  if (estado.fase === 'fallo') {
    return (
      <View style={[estilos.marco, estilo]} testID="imagen-protegida-error" accessibilityLabel={accessibilityLabel}>
        <Ionicons name="image-outline" size={tamanios.icono} color={colores.tintaSecundaria} />
      </View>
    );
  }
  if (estado.fase === 'cargando') {
    return <View style={[estilos.marco, estilo]} testID="imagen-protegida-espera" />;
  }
  return (
    <Image
      source={{ uri: estado.uri }}
      style={[estilos.imagen, estilo]}
      accessibilityLabel={accessibilityLabel}
      onError={() => setEstado({ fase: 'fallo' })}
    />
  );
}

const estilos = StyleSheet.create({
  marco: { backgroundColor: colores.tarjeta, alignItems: 'center', justifyContent: 'center' },
  imagen: { backgroundColor: colores.tarjeta },
});
