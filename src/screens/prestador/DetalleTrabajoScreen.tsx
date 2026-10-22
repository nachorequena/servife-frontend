import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { eliminarPublicacion, type Publicacion } from '../../api/reputacion';
import { Button, ImagenProtegida, Stars } from '../../components';
import type { PrestadorStackParams } from '../../navigation/tipos';
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

/** Detalle de un trabajo realizado · CU10, CU11. Los datos llegan por la ruta (no hay GET de una sola publicación). */
export function DetalleTrabajoScreen({ soloLectura }: Props) {
  const navigation = useNavigation<Navegacion>();
  const { publicacion: p } = useRoute<RouteProp<PrestadorStackParams, 'DetalleTrabajo'>>().params;
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
      <Text style={estilos.titulo}>{p.titulo}</Text>
      {p.puntaje !== null && <Stars valor={p.puntaje} />}
      {p.fechaTrabajo !== null && (
        <Text style={estilos.secundario}>Fecha del trabajo: {formatearFechaSola(p.fechaTrabajo)}</Text>
      )}
      {p.descripcion !== null && <Text style={estilos.descripcion}>{p.descripcion}</Text>}

      {p.imagenIds.length > 0 && (
        <View style={estilos.fotos}>
          {p.imagenIds.map((uuid, i) => (
            <ImagenProtegida key={uuid} uuid={uuid} estilo={estilos.foto} accessibilityLabel={`Foto ${i + 1}`} />
          ))}
        </View>
      )}

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

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenedor: { padding: espaciado.m, paddingBottom: espaciado.xl, gap: espaciado.s },
  titulo: { ...tipografia.seccion, color: colores.tinta },
  secundario: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
  descripcion: { ...tipografia.cuerpo, color: colores.tinta },
  fotos: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.s, marginTop: espaciado.s },
  foto: { width: tamanios.miniatura, height: tamanios.miniatura, borderRadius: radios.input },
  acciones: { gap: espaciado.s, marginTop: espaciado.l },
  pregunta: { ...tipografia.cuerpo, color: colores.tinta, textAlign: 'center' },
  error: { ...tipografia.cuerpo, color: colores.tinta, textAlign: 'center' },
});
