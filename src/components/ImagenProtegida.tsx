import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, View, type ImageStyle, type StyleProp } from 'react-native';

import { urlDeArchivo } from '../api/archivos';
import { renovarSesionParaRecursos } from '../api/cliente';
import { obtenerAccessToken } from '../api/tokens';
import { colores, tamanios } from '../theme';

interface Props {
  uuid: string;
  estilo?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
}

/** normal: primer intento · renovando: pidiendo un token nuevo · reintento: segundo y último intento · fallo: ícono. */
type Estado = 'normal' | 'renovando' | 'reintento' | 'fallo';

/**
 * Imagen de GET /archivos/{uuid}, que exige Authorization: Bearer (por eso no alcanza con un uri pelado).
 * <Image> no pasa por el cliente HTTP, así que ante el primer error renueva el token y reintenta una vez.
 */
export function ImagenProtegida({ uuid, estilo, accessibilityLabel }: Props) {
  const [estado, setEstado] = useState<Estado>('normal');
  const token = obtenerAccessToken();

  const uuidVigente = useRef(uuid);

  useEffect(() => {
    uuidVigente.current = uuid;
    setEstado('normal');
  }, [uuid]);

  const alFallar = () => {
    if (estado !== 'normal') {
      setEstado('fallo');
      return;
    }
    const actual = obtenerAccessToken();
    if (actual && actual !== token) {
      setEstado('reintento'); // otro componente ya renovó: alcanza con reintentar con el token vigente
      return;
    }
    const uuidDelIntento = uuid;
    setEstado('renovando');
    void renovarSesionParaRecursos().then((renovado) => {
      if (uuidVigente.current === uuidDelIntento) {
        setEstado(renovado ? 'reintento' : 'fallo');
      }
    });
  };

  if (estado === 'fallo') {
    return (
      <View style={[estilos.marco, estilo]} testID="imagen-protegida-error" accessibilityLabel={accessibilityLabel}>
        <Ionicons name="image-outline" size={tamanios.icono} color={colores.tintaSecundaria} />
      </View>
    );
  }
  if (!token || estado === 'renovando') {
    return <View style={[estilos.marco, estilo]} testID="imagen-protegida-espera" />;
  }
  return (
    <Image
      key={`${uuid}:${token}`}
      source={{ uri: urlDeArchivo(uuid), headers: { Authorization: `Bearer ${token}` } }}
      style={[estilos.imagen, estilo]}
      accessibilityLabel={accessibilityLabel}
      onError={alFallar}
    />
  );
}

const estilos = StyleSheet.create({
  marco: { backgroundColor: colores.tarjeta, alignItems: 'center', justifyContent: 'center' },
  imagen: { backgroundColor: colores.tarjeta },
});
