import { useRoute, type RouteProp } from '@react-navigation/native';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import type { ParametrosDePagina } from '../../api/paginacion';
import { listarValoracionesDePrestador, type Resena } from '../../api/reputacion';
import { Button, Card, EstadoVacio, Stars } from '../../components';
import { useListaPaginada } from '../../hooks/useListaPaginada';
import type { ClienteStackParams } from '../../navigation/tipos';
import { colores, espaciado, tipografia } from '../../theme';
import { formatearFecha } from '../../utils/formato';

const claveDe = (r: Resena) => r.uuid;

/** CU05, CU08 · Reseñas del prestador (D2), más recientes primero. El prestador no puede borrarlas (D07). */
export function ResenasScreen() {
  const { uuidPrestador } = useRoute<RouteProp<ClienteStackParams, 'Resenas'>>().params;
  const cargarPagina = useCallback(
    (pagina: ParametrosDePagina) => listarValoracionesDePrestador(uuidPrestador, pagina),
    [uuidPrestador],
  );
  const { items, cargando, cargandoMas, refrescando, error, errorMas, errorAlActualizar, cargarMas, refrescar, reintentar } =
    useListaPaginada(cargarPagina, claveDe);

  return (
    <View style={estilos.pantalla}>
      {cargando && !refrescando ? (
        <ActivityIndicator color={colores.verde} size="large" style={estilos.cargando} />
      ) : error && items.length === 0 ? (
        <View style={estilos.error}>
          <Text style={estilos.textoError}>No pudimos cargar las reseñas.</Text>
          <Button etiqueta="Reintentar" onPress={reintentar} />
        </View>
      ) : (
        <FlatList
          testID="lista-resenas"
          data={items}
          keyExtractor={claveDe}
          renderItem={({ item }) => <TarjetaDeResena resena={item} />}
          contentContainerStyle={estilos.lista}
          onEndReached={cargarMas}
          onEndReachedThreshold={0.5}
          refreshing={refrescando}
          onRefresh={refrescar}
          ListHeaderComponent={
            errorAlActualizar ? <Text style={estilos.textoError}>No pudimos actualizar las reseñas.</Text> : null
          }
          ListEmptyComponent={<EstadoVacio mensaje="Este prestador todavía no tiene reseñas." />}
          ListFooterComponent={
            errorMas ? (
              <View style={estilos.error}>
                <Text style={estilos.textoError}>No pudimos cargar más.</Text>
                <Button etiqueta="Reintentar" variante="terciario" onPress={cargarMas} />
              </View>
            ) : cargandoMas ? (
              <ActivityIndicator color={colores.verde} />
            ) : null
          }
        />
      )}
    </View>
  );
}

function TarjetaDeResena({ resena: r }: { resena: Resena }) {
  return (
    <Card>
      <View style={estilos.datos}>
        <Stars valor={r.puntaje} />
        <Text style={estilos.nombre}>{r.nombreCliente}</Text>
        <Text style={estilos.secundario}>{formatearFecha(r.creadoEn)}</Text>
        {r.comentario !== null && <Text style={estilos.comentario}>{r.comentario}</Text>}
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
  datos: { flex: 1, gap: espaciado.xs },
  nombre: { ...tipografia.cuerpo, fontWeight: '700', color: colores.tinta },
  secundario: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
  comentario: { ...tipografia.cuerpo, color: colores.tinta },
});
