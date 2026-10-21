import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { listarValidacionesPendientes, obtenerMetricas, type Metricas, type PrestadorPendiente } from '../../api/gestion';
import { Button, Card, EstadoVacio } from '../../components';
import type { GestorTabsParams } from '../../navigation/tipos';
import { colores, espaciado, tipografia } from '../../theme';

/** Cuántas validaciones pendientes muestra el dashboard; el resto está en la pestaña Validaciones. */
const VALIDACIONES_A_MOSTRAR = 3;

interface Datos {
  metricas: Metricas;
  pendientes: PrestadorPendiente[];
}

/**
 * Dashboard del gestor · CU12, CU14 · E9 y E5. Como el prototipo: arriba los servicios activos (más las
 * solicitudes esperando respuesta) y abajo las validaciones pendientes más viejas, que llevan a
 * Validaciones. Sin "Incidencias recientes" (D05). Se recarga al enfocar y con pull-to-refresh.
 */
export function DashboardScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<GestorTabsParams>>();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState(false);
  const [errorAlActualizar, setErrorAlActualizar] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const pedido = useRef(0);
  // Al volver a la pantalla con datos ya cargados, un fallo no los borra (como un pull-to-refresh).
  const datosCargados = useRef(false);
  datosCargados.current = datos !== null;

  const cargar = useCallback(async (refresco: boolean) => {
    const id = ++pedido.current;
    setError(false);
    setErrorAlActualizar(false);
    try {
      const [metricas, pagina] = await Promise.all([
        obtenerMetricas(),
        listarValidacionesPendientes({ page: 0, size: VALIDACIONES_A_MOSTRAR }),
      ]);
      if (id === pedido.current) setDatos({ metricas, pendientes: pagina.contenido });
    } catch {
      if (id !== pedido.current) return;
      if (refresco) {
        setErrorAlActualizar(true); // se conservan los datos
      } else {
        setDatos(null);
        setError(true);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void cargar(datosCargados.current);
    }, [cargar]),
  );

  async function refrescar() {
    setRefrescando(true);
    await cargar(true);
    setRefrescando(false);
  }

  if (error) {
    return (
      <View style={estilos.centro}>
        <Text style={estilos.texto}>No pudimos cargar el dashboard.</Text>
        <Button etiqueta="Reintentar" onPress={() => void cargar(false)} />
      </View>
    );
  }
  if (datos === null) {
    return <ActivityIndicator color={colores.lila} size="large" style={estilos.cargando} />;
  }

  const { metricas, pendientes } = datos;
  return (
    <ScrollView
      testID="dashboard"
      contentContainerStyle={estilos.contenedor}
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} />}
    >
      {errorAlActualizar && <Text style={estilos.texto}>No pudimos actualizar el dashboard.</Text>}
      <View style={estilos.contadores}>
        <View style={estilos.contador}>
          <Text style={estilos.numero}>{metricas.serviciosActivos}</Text>
          <Text style={estilos.etiqueta}>Servicios activos</Text>
        </View>
        <View style={estilos.contador}>
          <Text style={estilos.numero}>{metricas.solicitudesPendientes}</Text>
          <Text style={estilos.etiqueta}>Solicitudes sin responder</Text>
        </View>
      </View>

      <Text style={estilos.seccion}>Validaciones pendientes ({metricas.validacionesPendientes})</Text>
      {pendientes.length === 0 ? (
        <EstadoVacio mensaje="No hay prestadores pendientes." />
      ) : (
        <View style={estilos.lista}>
          {pendientes.map((p) => (
            <Card key={p.uuid} onPress={() => navigation.navigate('Validaciones')}>
              <View style={estilos.cuerpo}>
                <Text style={estilos.nombre}>{p.nombreApellido}</Text>
                <Text style={estilos.dato}>{p.tipoServicio.nombre}</Text>
              </View>
            </Card>
          ))}
          {metricas.validacionesPendientes > pendientes.length && (
            <Button etiqueta="Ver todas" variante="terciario" onPress={() => navigation.navigate('Validaciones')} />
          )}
        </View>
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { padding: espaciado.l, gap: espaciado.m },
  centro: { flex: 1, justifyContent: 'center', padding: espaciado.l, gap: espaciado.m },
  cargando: { marginTop: espaciado.xl },
  contadores: { flexDirection: 'row', gap: espaciado.m },
  contador: { flex: 1, alignItems: 'center', gap: espaciado.xs },
  numero: { ...tipografia.titulo, color: colores.lila },
  etiqueta: { ...tipografia.seccion, color: colores.tinta, textAlign: 'center' },
  seccion: { ...tipografia.seccion, color: colores.tinta, marginTop: espaciado.m },
  lista: { gap: espaciado.m },
  cuerpo: { flex: 1 },
  nombre: { ...tipografia.cuerpo, fontWeight: '700', color: colores.tinta },
  dato: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
  texto: { ...tipografia.cuerpo, color: colores.tintaSecundaria, textAlign: 'center' },
});
