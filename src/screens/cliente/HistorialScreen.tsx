import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';

import { type EstadoSolicitud } from '../../api/solicitudes';
import { Avatar, Button, Card, Chip, EstadoVacio, EtiquetaDeEstado } from '../../components';
import { useAvisoDeRuta } from '../../hooks/useAvisoDeRuta';
import { useListaDeSolicitudes } from '../../hooks/useListaDeSolicitudes';
import type { ClienteStackParams } from '../../navigation/tipos';
import { colores, espaciado, tipografia } from '../../theme';
import { formatearFechaSola } from '../../utils/formato';

const FILTROS: { etiqueta: string; estados?: EstadoSolicitud[] }[] = [
  { etiqueta: 'Todas' },
  { etiqueta: 'Pendientes', estados: ['PENDIENTE'] },
  { etiqueta: 'Aceptadas', estados: ['ACEPTADA'] },
  { etiqueta: 'En curso', estados: ['EN_CURSO'] },
  { etiqueta: 'Finalizadas', estados: ['FINALIZADA', 'VALORADA'] },
  { etiqueta: 'Canceladas', estados: ['CANCELADA', 'RECHAZADA'] },
];

/** Solicitudes del cliente (CU06); desde acá se completa una valoración pospuesta (D07). */
export function HistorialScreen() {
  const aviso = useAvisoDeRuta();
  const navigation = useNavigation<NativeStackNavigationProp<ClienteStackParams>>();

  const [filtro, setFiltro] = useState(0);
  const estados = FILTROS[filtro].estados;
  const { items, cargando, cargandoMas, refrescando, error, errorMas, errorAlActualizar, cargarMas, refrescar, reintentar } =
    useListaDeSolicitudes(estados);

  return (
    <View style={estilos.pantalla}>
      {aviso !== undefined && <Text style={estilos.aviso}>{aviso}</Text>}
      <Text style={estilos.titulo}>Historial</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={estilos.filtros}
        contentContainerStyle={estilos.filtrosContenido}
      >
        {FILTROS.map((f, i) => (
          <Chip key={f.etiqueta} etiqueta={f.etiqueta} seleccionado={i === filtro} onPress={() => setFiltro(i)} />
        ))}
      </ScrollView>

      {cargando && !refrescando ? (
        <ActivityIndicator color={colores.verde} size="large" style={estilos.cargando} />
      ) : error && items.length === 0 ? (
        <View style={estilos.error}>
          <Text style={estilos.textoError}>No pudimos cargar tus solicitudes.</Text>
          <Button etiqueta="Reintentar" onPress={reintentar} />
        </View>
      ) : (
        <FlatList
          testID="lista-solicitudes"
          data={items}
          keyExtractor={(s) => s.uuid}
          renderItem={({ item }) => (
            <Card onPress={() => navigation.navigate('DetalleSolicitud', { uuidSolicitud: item.uuid })}>
              <Avatar nombre={item.contraparte.nombreApellido} />
              <View style={estilos.datos}>
                <Text style={estilos.nombre}>{item.contraparte.nombreApellido}</Text>
                <Text style={estilos.rubro}>{item.tipoServicio.nombre}</Text>
                <EtiquetaDeEstado estado={item.estado} />
              </View>
              <Text style={estilos.rubro}>{formatearFechaSola(item.fechaDeseada)}</Text>
            </Card>
          )}
          contentContainerStyle={estilos.lista}
          onEndReached={cargarMas}
          onEndReachedThreshold={0.5}
          refreshing={refrescando}
          onRefresh={refrescar}
          ListHeaderComponent={
            errorAlActualizar ? <Text style={estilos.textoError}>No pudimos actualizar la lista.</Text> : null
          }
          ListEmptyComponent={
            <EstadoVacio
              mensaje={estados === undefined ? 'Todavía no pediste ningún servicio.' : 'No hay solicitudes en este estado.'}
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
            ) : null
          }
        />
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  aviso: { ...tipografia.cuerpo, color: colores.tinta, backgroundColor: colores.verdeClaro, padding: espaciado.m },
  titulo: { ...tipografia.titulo, color: colores.tinta, textAlign: 'center', marginTop: espaciado.m },
  filtros: { flexGrow: 0, marginVertical: espaciado.m },
  filtrosContenido: { paddingHorizontal: espaciado.m, gap: espaciado.s },
  lista: { paddingHorizontal: espaciado.m, paddingBottom: espaciado.l },
  cargando: { marginTop: espaciado.xl },
  error: { padding: espaciado.l, gap: espaciado.m },
  textoError: { ...tipografia.cuerpo, color: colores.tinta, textAlign: 'center' },
  datos: { flex: 1, gap: espaciado.xs },
  nombre: { ...tipografia.cuerpo, fontWeight: '700', color: colores.tinta },
  rubro: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
});
