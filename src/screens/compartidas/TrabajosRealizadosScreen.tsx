import { useNavigation } from '@react-navigation/native';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import type { ParametrosDePagina } from '../../api/paginacion';
import { listarMisPublicaciones, listarPublicacionesDePrestador, type Publicacion } from '../../api/reputacion';
import { Button, Card, EstadoVacio, ImagenProtegida, Stars } from '../../components';
import { useListaPaginada } from '../../hooks/useListaPaginada';
import { colores, espaciado, radios, tamanios, tipografia } from '../../theme';
import { formatearFechaSola } from '../../utils/formato';

interface Props {
  /**
   * true: lo ve el cliente en el perfil de un prestador (D3, /prestadores/{uuid}/publicaciones).
   * false: el prestador ve los suyos con editar y eliminar (D8, /prestadores/me/publicaciones).
   * Es un único componente, no dos pantallas copiadas (servife-ia/.ai/09-ux-ui.md).
   */
  soloLectura: boolean;
  /** Obligatorio si soloLectura; el prestador ve los propios. */
  uuidPrestador?: string;
}

type Navegacion = {
  navigate: (ruta: 'DetalleTrabajo' | 'NuevoTrabajo', params?: { publicacion: Publicacion }) => void;
};

const claveDe = (p: Publicacion) => p.uuid;

/** Trabajos realizados · CU10, CU11. Estrellas solo si el trabajo tiene solicitud valorada (D07). */
export function TrabajosRealizadosScreen({ soloLectura, uuidPrestador }: Props) {
  const navigation = useNavigation<Navegacion>();
  const cargarPagina = useCallback(
    (pagina: ParametrosDePagina) =>
      soloLectura ? listarPublicacionesDePrestador(uuidPrestador ?? '', pagina) : listarMisPublicaciones(pagina),
    [soloLectura, uuidPrestador],
  );
  const { items, cargando, cargandoMas, refrescando, error, errorMas, errorAlActualizar, cargarMas, refrescar, reintentar } =
    useListaPaginada(cargarPagina, claveDe);

  return (
    <View style={estilos.pantalla}>
      {cargando && !refrescando ? (
        <ActivityIndicator color={colores.verde} size="large" style={estilos.cargando} />
      ) : error && items.length === 0 ? (
        <View style={estilos.error}>
          <Text style={estilos.textoError}>No pudimos cargar los trabajos.</Text>
          <Button etiqueta="Reintentar" onPress={reintentar} />
        </View>
      ) : (
        <FlatList
          testID="lista-trabajos"
          data={items}
          keyExtractor={claveDe}
          renderItem={({ item }) => (
            <TarjetaDeTrabajo
              publicacion={item}
              onPress={() => navigation.navigate('DetalleTrabajo', { publicacion: item })}
            />
          )}
          contentContainerStyle={estilos.lista}
          onEndReached={cargarMas}
          onEndReachedThreshold={0.5}
          refreshing={refrescando}
          onRefresh={refrescar}
          ListHeaderComponent={
            <>
              {!soloLectura && (
                <View style={estilos.nuevo}>
                  <Button etiqueta="Publicar trabajo" onPress={() => navigation.navigate('NuevoTrabajo')} />
                </View>
              )}
              {errorAlActualizar && <Text style={estilos.textoError}>No pudimos actualizar los trabajos.</Text>}
            </>
          }
          ListEmptyComponent={
            <EstadoVacio
              mensaje={
                soloLectura ? 'Este prestador todavía no publicó trabajos.' : 'Todavía no publicaste trabajos.'
              }
            />
          }
          ListFooterComponent={
            errorMas ? (
              <View style={estilos.error}>
                <Text style={estilos.textoError}>No pudimos cargar más.</Text>
                <Button etiqueta="Reintentar" variante="terciario" onPress={cargarMas} />
              </View>
            ) : cargandoMas ? (
              <ActivityIndicator color={colores.verde} />
            ) : undefined
          }
        />
      )}
    </View>
  );
}

function TarjetaDeTrabajo({ publicacion: p, onPress }: { publicacion: Publicacion; onPress: () => void }) {
  return (
    <Card onPress={onPress}>
      {p.imagenIds.length > 0 && (
        <ImagenProtegida uuid={p.imagenIds[0]} estilo={estilos.foto} accessibilityLabel={`Foto de ${p.titulo}`} />
      )}
      <View style={estilos.datos}>
        <Text style={estilos.titulo}>{p.titulo}</Text>
        {p.puntaje !== null && <Stars valor={p.puntaje} />}
        {p.fechaTrabajo !== null && <Text style={estilos.secundario}>{formatearFechaSola(p.fechaTrabajo)}</Text>}
        {p.descripcion !== null && (
          <Text style={estilos.descripcion} numberOfLines={2}>
            {p.descripcion}
          </Text>
        )}
      </View>
    </Card>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  lista: { padding: espaciado.m, gap: espaciado.s },
  cargando: { marginTop: espaciado.xl },
  error: { padding: espaciado.l, gap: espaciado.m },
  textoError: { ...tipografia.cuerpo, color: colores.tinta, textAlign: 'center' },
  nuevo: { marginBottom: espaciado.s },
  foto: { width: tamanios.miniatura, height: tamanios.miniatura, borderRadius: radios.input },
  datos: { flex: 1, gap: espaciado.xs },
  titulo: { ...tipografia.cuerpo, fontWeight: '700', color: colores.tinta },
  secundario: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
  descripcion: { ...tipografia.cuerpo, color: colores.tinta },
});
