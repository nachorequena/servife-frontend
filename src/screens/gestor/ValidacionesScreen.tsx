import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../../api/errores';
import { listarValidacionesPendientes, type PrestadorPendiente } from '../../api/gestion';
import { Avatar, Button, Card, EstadoVacio, Etiqueta, useAvisoFlotante } from '../../components';
import { useListaPaginada } from '../../hooks/useListaPaginada';
import type { GestorStackParams } from '../../navigation/tipos';
import { colores, espaciado, tamanios, tipografia } from '../../theme';
import { haceCuanto } from '../../utils/formato';
import { mensajeDe } from '../../utils/errores';
import { AccionesDeValidacion, type DecisionDeValidacion } from './AccionesDeValidacion';
import { TarjetasCargando } from './TarjetasCargando';

const claveDe = (p: PrestadorPendiente) => p.uuid;

/**
 * Validaciones pendientes · CU14 · E5 y E6. Sin maqueta propia (D10). Lista paginada de tarjetas blancas: tocar
 * una abre el expediente (E8); abajo, Rechazar y Aprobar (AccionesDeValidacion). El resultado se avisa con un
 * aviso flotante.
 */
export function ValidacionesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GestorStackParams>>();
  const { mostrar } = useAvisoFlotante();
  const { items, cargando, cargandoMas, refrescando, error, errorMas, errorAlActualizar, cargarMas, refrescar, reintentar, quitar } =
    useListaPaginada(listarValidacionesPendientes, claveDe);

  function decidido(p: PrestadorPendiente, decision: DecisionDeValidacion) {
    mostrar(decision === 'APROBAR' ? `${p.nombreApellido} fue aprobado.` : `${p.nombreApellido} fue rechazado.`);
    // Se saca de la lista ya y se vuelve a pedir la primera página, así entra el siguiente pendiente.
    quitar(p.uuid);
    refrescar();
  }

  function fallo(e: unknown) {
    mostrar(mensajeDe(e), 'error');
    if (e instanceof ApiError && e.codigo === 'VALIDACION_YA_RESUELTA') {
      refrescar();
    }
  }

  function abrirExpediente(p: PrestadorPendiente) {
    navigation.navigate('Expediente', {
      uuidPrestador: p.uuid,
      nombreApellido: p.nombreApellido,
      rubro: p.tipoServicio.nombre,
      requiereMatricula: p.tipoServicio.requiereMatricula,
    });
  }

  if (cargando && !refrescando) {
    return (
      <View style={estilos.pantalla}>
        <TarjetasCargando />
      </View>
    );
  }
  if (error && items.length === 0) {
    return (
      <View style={estilos.pantalla}>
        <EstadoVacio
          icono="cloud-offline-outline"
          mensaje="No pudimos cargar las validaciones."
          accion={{ etiqueta: 'Reintentar', onPress: reintentar }}
        />
      </View>
    );
  }
  return (
    <View style={estilos.pantalla}>
      <FlatList
        testID="lista-validaciones"
        data={items}
        keyExtractor={claveDe}
        renderItem={({ item: p }) => (
          <Card variante="blanca">
            <View style={estilos.cuerpo}>
              <View style={estilos.cabecera}>
                <Avatar nombre={p.nombreApellido} tamanio={tamanios.avatarChico} />
                <View style={estilos.datos}>
                  <Text style={estilos.nombre}>{p.nombreApellido}</Text>
                  <Text style={estilos.dato}>{p.email}</Text>
                </View>
              </View>
              <View style={estilos.etiquetas}>
                <Etiqueta texto={p.tipoServicio.nombre} tono="lila" />
                {p.tipoServicio.requiereMatricula && <Etiqueta texto="Requiere matrícula" tono="advertencia" icono="ribbon-outline" />}
              </View>
              <Text style={estilos.dato}>Se postuló {haceCuanto(p.postuladoEn)}</Text>
              <Button
                etiqueta="Ver expediente"
                variante="texto"
                tamanio="chico"
                icono="document-text-outline"
                ancho="contenido"
                onPress={() => abrirExpediente(p)}
              />
              <AccionesDeValidacion
                uuidPrestador={p.uuid}
                nombreApellido={p.nombreApellido}
                alDecidir={(decision) => decidido(p, decision)}
                alFallar={fallo}
              />
            </View>
          </Card>
        )}
        contentContainerStyle={estilos.lista}
        onEndReached={cargarMas}
        onEndReachedThreshold={0.5}
        refreshing={refrescando}
        onRefresh={refrescar}
        ListHeaderComponent={
          errorAlActualizar ? <Text style={estilos.aviso}>No pudimos actualizar la lista. Deslizá para reintentar.</Text> : null
        }
        ListEmptyComponent={<EstadoVacio icono="shield-checkmark-outline" mensaje="No hay prestadores pendientes de validación." />}
        ListFooterComponent={
          errorMas ? (
            <EstadoVacio mensaje="No pudimos cargar más." accion={{ etiqueta: 'Reintentar', onPress: cargarMas }} />
          ) : cargandoMas ? (
            <ActivityIndicator color={colores.lila} />
          ) : null
        }
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  lista: { padding: espaciado.l, gap: espaciado.s, flexGrow: 1 },
  aviso: { ...tipografia.cuerpo, color: colores.rojo, marginBottom: espaciado.s },
  cuerpo: { flex: 1, gap: espaciado.s },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: espaciado.m },
  datos: { flex: 1 },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.xs },
  nombre: { ...tipografia.seccion, color: colores.tinta },
  dato: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
});
