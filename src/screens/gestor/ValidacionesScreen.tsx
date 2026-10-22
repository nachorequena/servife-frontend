import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../../api/errores';
import { listarValidacionesPendientes, type PrestadorPendiente } from '../../api/gestion';
import { Button, Card, EstadoVacio } from '../../components';
import { useListaPaginada } from '../../hooks/useListaPaginada';
import type { GestorStackParams } from '../../navigation/tipos';
import { colores, espaciado, tipografia } from '../../theme';
import { formatearFecha } from '../../utils/formato';
import { mensajeDe } from '../../utils/errores';
import { AccionesDeValidacion, type DecisionDeValidacion } from './AccionesDeValidacion';

const claveDe = (p: PrestadorPendiente) => p.uuid;

/**
 * Validaciones pendientes · CU14 · E5 y E6. Sin maqueta propia: lista paginada con acentos lilas del
 * gestor. Cada tarjeta abre el expediente (E8) y permite aprobar o rechazar con confirmación
 * (AccionesDeValidacion); el rechazo admite un motivo que le llega al prestador.
 */
export function ValidacionesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GestorStackParams>>();
  const { items, cargando, cargandoMas, refrescando, error, errorMas, errorAlActualizar, cargarMas, refrescar, reintentar, quitar } =
    useListaPaginada(listarValidacionesPendientes, claveDe);
  const [aviso, setAviso] = useState<string>();
  const [errorDeDecision, setErrorDeDecision] = useState<string>();

  function decidido(uuid: string, decision: DecisionDeValidacion) {
    setErrorDeDecision(undefined);
    setAviso(decision === 'APROBAR' ? 'Prestador aprobado.' : 'Prestador rechazado.');
    // Se saca de la lista ya y se vuelve a pedir la primera página, así entra el siguiente pendiente.
    quitar(uuid);
    refrescar();
  }

  function fallo(e: unknown) {
    setAviso(undefined);
    setErrorDeDecision(mensajeDe(e));
    if (e instanceof ApiError && e.codigo === 'VALIDACION_YA_RESUELTA') {
      refrescar();
    }
  }

  return (
    <View style={estilos.pantalla}>
      <Text style={estilos.titulo}>Validaciones</Text>
      {aviso !== undefined && <Text style={estilos.mensaje}>{aviso}</Text>}
      {errorDeDecision !== undefined && <Text style={estilos.mensaje}>{errorDeDecision}</Text>}
      {cargando && !refrescando ? (
        <ActivityIndicator color={colores.lila} size="large" style={estilos.cargando} />
      ) : error && items.length === 0 ? (
        <View style={estilos.error}>
          <Text style={estilos.textoError}>No pudimos cargar las validaciones.</Text>
          <Button etiqueta="Reintentar" onPress={reintentar} />
        </View>
      ) : (
        <FlatList
          testID="lista-validaciones"
          data={items}
          keyExtractor={(p) => p.uuid}
          renderItem={({ item: p }) => (
            <Card>
              <View style={estilos.cuerpo}>
                <Text style={estilos.nombre}>{p.nombreApellido}</Text>
                <Text style={estilos.dato}>{p.email}</Text>
                <Text style={estilos.dato}>{p.tipoServicio.nombre}</Text>
                <Text style={estilos.dato}>Postulado el {formatearFecha(p.postuladoEn)}</Text>
                <View style={estilos.expediente}>
                  <Button
                    etiqueta="Ver expediente"
                    variante="terciario"
                    onPress={() => navigation.navigate('Expediente', { uuidPrestador: p.uuid, nombreApellido: p.nombreApellido })}
                  />
                </View>
                <AccionesDeValidacion
                  uuidPrestador={p.uuid}
                  nombreApellido={p.nombreApellido}
                  alDecidir={(decision) => decidido(p.uuid, decision)}
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
            errorAlActualizar ? <Text style={estilos.textoError}>No pudimos actualizar la lista.</Text> : null
          }
          ListEmptyComponent={<EstadoVacio mensaje="No hay prestadores pendientes." />}
          ListFooterComponent={
            errorMas ? (
              <View style={estilos.error}>
                <Text style={estilos.textoError}>No pudimos cargar más.</Text>
                <Button etiqueta="Reintentar" variante="terciario" onPress={cargarMas} />
              </View>
            ) : cargandoMas ? (
              <ActivityIndicator color={colores.lila} />
            ) : null
          }
        />
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  titulo: { ...tipografia.titulo, color: colores.lila, margin: espaciado.l, marginBottom: espaciado.m },
  mensaje: { ...tipografia.cuerpo, color: colores.tinta, marginHorizontal: espaciado.l, marginBottom: espaciado.m },
  lista: { paddingHorizontal: espaciado.l, paddingBottom: espaciado.l, gap: espaciado.m },
  cargando: { marginTop: espaciado.xl },
  error: { padding: espaciado.l, gap: espaciado.m },
  textoError: { ...tipografia.cuerpo, color: colores.tinta, textAlign: 'center' },
  cuerpo: { flex: 1 },
  nombre: { ...tipografia.seccion, color: colores.tinta },
  dato: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
  expediente: { marginTop: espaciado.m },
});
