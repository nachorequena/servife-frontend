import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { eliminarPublicacion, type Publicacion } from '../../api/reputacion';
import { Avatar, Button, ImagenProtegida, Stars } from '../../components';
import type { ClienteStackParams } from '../../navigation/tipos';
import { colores, espaciado, radios, tamanios, tipografia } from '../../theme';
import { mensajeDe } from '../../utils/errores';
import { formatearFechaSola } from '../../utils/formato';

interface Props {
  /** true: lo ve el cliente (D3), sin editar ni eliminar. false: el prestador dueño (D5, D6). */
  soloLectura: boolean;
}

type Navegacion = {
  navigate: (ruta: 'NuevoTrabajo', params: { publicacion: Publicacion }) => void;
  goBack: () => void;
};

/**
 * Detalle de un trabajo realizado · CU10, CU11, como una publicación de Instagram: quién lo hizo (si
 * viene de su perfil), las fotos a todo el ancho que se deslizan de a una, y abajo estrellas, título,
 * descripción y fecha. Los datos llegan por la ruta (no hay GET de una sola publicación).
 */
export function DetalleTrabajoScreen({ soloLectura }: Props) {
  const navigation = useNavigation<Navegacion>();
  // El prestador no manda nombrePrestador: el tipo del cliente es el más amplio.
  const { publicacion: p, nombrePrestador } = useRoute<RouteProp<ClienteStackParams, 'DetalleTrabajo'>>().params;
  const [confirmando, setConfirmando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState<string>();
  const enVuelo = useRef(false);

  const eliminar = async () => {
    if (enVuelo.current) return;
    enVuelo.current = true;
    setEliminando(true);
    setError(undefined);
    try {
      await eliminarPublicacion(p.uuid);
      navigation.goBack(); // la lista se recarga al volver
    } catch (e) {
      setError(mensajeDe(e));
      enVuelo.current = false;
      setEliminando(false);
    }
  };

  return (
    <ScrollView style={estilos.pantalla} contentContainerStyle={estilos.contenedor}>
      {nombrePrestador !== undefined && (
        <View style={estilos.autor}>
          <Avatar nombre={nombrePrestador} tamanio={tamanios.avatarChico} />
          <Text style={estilos.nombreAutor}>{nombrePrestador}</Text>
        </View>
      )}

      {p.imagenIds.length > 0 && <Carrusel imagenIds={p.imagenIds} />}

      <View style={estilos.texto}>
        {p.puntaje !== null && <Stars valor={p.puntaje} />}
        <Text style={estilos.titulo}>{p.titulo}</Text>
        {p.descripcion !== null && <Text style={estilos.descripcion}>{p.descripcion}</Text>}
        {p.fechaTrabajo !== null && (
          <Text style={estilos.secundario}>Fecha del trabajo: {formatearFechaSola(p.fechaTrabajo)}</Text>
        )}
      </View>

      {!soloLectura && (
        <View style={estilos.acciones}>
          {error !== undefined && <Text style={estilos.error}>{error}</Text>}
          {confirmando ? (
            <>
              <Text style={estilos.pregunta}>¿Eliminar este trabajo? No se puede deshacer.</Text>
              <Button etiqueta="Sí, eliminar" onPress={eliminar} deshabilitado={eliminando} />
              <Button etiqueta="Volver" variante="terciario" onPress={() => setConfirmando(false)} deshabilitado={eliminando} />
            </>
          ) : (
            <>
              <Button etiqueta="Editar" onPress={() => navigation.navigate('NuevoTrabajo', { publicacion: p })} />
              <Button etiqueta="Eliminar" variante="terciario" onPress={() => setConfirmando(true)} />
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

/** Fotos cuadradas a todo el ancho; con más de una se deslizan de a una, con puntos y contador. */
function Carrusel({ imagenIds }: { imagenIds: string[] }) {
  const { width } = useWindowDimensions();
  const [actual, setActual] = useState(0);
  const varias = imagenIds.length > 1;
  const foto = { width, height: width };

  const alDeslizar = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setActual(Math.round(e.nativeEvent.contentOffset.x / width));

  return (
    <View>
      <ScrollView
        testID="carrusel-fotos"
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={alDeslizar}
      >
        {imagenIds.map((uuid, i) => (
          <ImagenProtegida key={uuid} uuid={uuid} estilo={foto} accessibilityLabel={`Foto ${i + 1}`} />
        ))}
      </ScrollView>
      {varias && (
        <>
          <View style={estilos.contador}>
            <Text style={estilos.textoContador}>
              {actual + 1}/{imagenIds.length}
            </Text>
          </View>
          <View style={estilos.puntos}>
            {imagenIds.map((uuid, i) => (
              <View key={uuid} style={[estilos.punto, i === actual && estilos.puntoActual]} />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.blanco },
  contenedor: { paddingBottom: espaciado.xl },
  autor: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s, padding: espaciado.m },
  nombreAutor: { ...tipografia.cuerpo, fontWeight: '700', color: colores.tinta },
  contador: {
    position: 'absolute',
    top: espaciado.m,
    right: espaciado.m,
    backgroundColor: colores.tinta,
    borderRadius: radios.pill,
    paddingHorizontal: espaciado.s,
    paddingVertical: espaciado.xs,
  },
  textoContador: { ...tipografia.globo, color: colores.blanco },
  puntos: { flexDirection: 'row', justifyContent: 'center', gap: espaciado.xs, marginTop: espaciado.s },
  punto: { width: tamanios.puntoCarrusel, height: tamanios.puntoCarrusel, borderRadius: radios.pill, backgroundColor: colores.tarjeta },
  puntoActual: { backgroundColor: colores.verde },
  texto: { paddingHorizontal: espaciado.m, paddingTop: espaciado.m, gap: espaciado.s },
  titulo: { ...tipografia.seccion, color: colores.tinta },
  descripcion: { ...tipografia.cuerpo, color: colores.tinta },
  secundario: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
  acciones: { gap: espaciado.s, marginTop: espaciado.l, paddingHorizontal: espaciado.m },
  pregunta: { ...tipografia.cuerpo, color: colores.tinta, textAlign: 'center' },
  error: { ...tipografia.cuerpo, color: colores.tinta, textAlign: 'center' },
});
