import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View, type ImageStyle, type StyleProp } from 'react-native';

import { descargarImagen } from '../api/archivos';
import { colores, tamanios } from '../theme';

interface Props {
  uuid: string;
  /**
   * Cómo bajarla, si no es una imagen de GET /archivos/{uuid}: por ejemplo un documento de validación del
   * gestor (E8b). Devuelve el uri local. Se vuelve a llamar cuando cambia el uuid o al reintentar.
   */
  descargar?: () => Promise<string>;
  estilo?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
}

type Estado = { fase: 'cargando' } | { fase: 'lista'; uri: string } | { fase: 'fallo' };

/**
 * Imagen de GET /archivos/{uuid}, que exige Authorization: Bearer. <Image> no manda headers en esta versión
 * de React Native, así que se descarga con descargarImagen (api/archivos.ts, con renovación del token ante
 * un 401) a la caché y se muestra el archivo local. Mientras descarga muestra un indicador; si falla, tocarla
 * reintenta.
 */
export function ImagenProtegida({ uuid, descargar, estilo, accessibilityLabel }: Props) {
  const [estado, setEstado] = useState<Estado>({ fase: 'cargando' });
  const [intento, setIntento] = useState(0);
  const descargarRef = useRef(descargar);
  descargarRef.current = descargar;

  useEffect(() => {
    let vigente = true; // se descarta el resultado si cambió el uuid o se desmontó
    setEstado({ fase: 'cargando' });
    (descargarRef.current ?? (() => descargarImagen(uuid)))().then(
      (uri) => vigente && setEstado({ fase: 'lista', uri }),
      () => vigente && setEstado({ fase: 'fallo' }),
    );
    return () => {
      vigente = false;
    };
  }, [uuid, intento]);

  if (estado.fase === 'fallo') {
    return (
      <Pressable
        style={[estilos.marco, estilo]}
        testID="imagen-protegida-error"
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="No se pudo cargar. Tocá para reintentar."
        onPress={() => setIntento((n) => n + 1)}
      >
        <Ionicons name="refresh-outline" size={tamanios.icono} color={colores.tintaSecundaria} />
      </Pressable>
    );
  }
  if (estado.fase === 'cargando') {
    return (
      <View style={[estilos.marco, estilo]} testID="imagen-protegida-espera">
        <ActivityIndicator color={colores.verde} />
      </View>
    );
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
