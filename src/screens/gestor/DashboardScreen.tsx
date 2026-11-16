import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useCallback, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  listarValidacionesPendientes,
  obtenerMetricas,
  obtenerMetricasDetalle,
  type Metricas,
  type MetricasDetalle,
  type PrestadorPendiente,
} from '../../api/gestion';
import type { EstadoSolicitud } from '../../api/solicitudes';
import { Avatar, Button, Card, Contador, EstadoVacio, Esqueleto, Etiqueta, TEXTOS_DE_ESTADO } from '../../components';
import {
  BarrasHorizontales,
  GraficoPorMes,
  SelectorDePeriodo,
  TarjetaDeGrafico,
  desdeHaceMeses,
  type MesesDePeriodo,
} from '../../components/graficos';
import type { GestorTabsParams } from '../../navigation/tipos';
import { useSesion } from '../../store/sesion';
import { colores, espaciado, radios, tamanios, tipografia } from '../../theme';
import { formatearFechaLarga, haceCuanto } from '../../utils/formato';

/** Cuántas validaciones pendientes muestra el dashboard; el resto está en la pestaña Validaciones. */
const VALIDACIONES_A_MOSTRAR = 3;

interface Datos {
  metricas: Metricas;
  pendientes: PrestadorPendiente[];
}

/**
 * Dashboard del gestor · CU12, CU14 · E9 y E5. Saludo con el nombre y la fecha; arriba los contadores en
 * tarjetas con ícono (servicios activos, solicitudes sin responder y validaciones pendientes, que lleva a
 * Validaciones), las validaciones más viejas y, abajo, la actividad del período (E9b): trabajo por servicio, por
 * mes, por estado y prestadores con más trabajos. Sin "Incidencias recientes" (D05). Esqueletos mientras
 * carga; se recarga al enfocar y con pull-to-refresh.
 */
export function DashboardScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<GestorTabsParams>>();
  const { sesion } = useSesion();
  const nombre = sesion?.usuario.nombreApellido.split(' ')[0] ?? '';
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState(false);
  const [errorAlActualizar, setErrorAlActualizar] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const pedido = useRef(0);
  // Al volver a la pantalla con datos ya cargados, un fallo no los borra (como un pull-to-refresh).
  const datosCargados = useRef(false);
  datosCargados.current = datos !== null;

  // Gráficos (E9b): se cargan aparte, así un fallo acá no tapa los contadores ni las validaciones.
  const [meses, setMeses] = useState<MesesDePeriodo>(6);
  const [detalle, setDetalle] = useState<MetricasDetalle | null>(null);
  const [errorDetalle, setErrorDetalle] = useState(false);
  const pedidoDetalle = useRef(0);
  const mesesActuales = useRef(meses);
  mesesActuales.current = meses;

  const cargarDetalle = useCallback(async (periodo: MesesDePeriodo) => {
    const id = ++pedidoDetalle.current;
    setErrorDetalle(false);
    try {
      const respuesta = await obtenerMetricasDetalle({ desde: desdeHaceMeses(periodo) });
      if (id === pedidoDetalle.current) setDetalle(respuesta);
    } catch {
      if (id === pedidoDetalle.current) setErrorDetalle(true);
    }
  }, []);

  function cambiarPeriodo(nuevo: MesesDePeriodo) {
    if (nuevo === meses) return;
    setMeses(nuevo);
    setDetalle(null);
    void cargarDetalle(nuevo);
  }

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
      void cargarDetalle(mesesActuales.current);
    }, [cargar, cargarDetalle]),
  );

  async function refrescar() {
    setRefrescando(true);
    await Promise.all([cargar(true), cargarDetalle(meses)]);
    setRefrescando(false);
  }

  if (error) {
    return (
      <View style={estilos.centro}>
        <EstadoVacio
          icono="cloud-offline-outline"
          mensaje="No pudimos cargar el dashboard."
          accion={{ etiqueta: 'Reintentar', onPress: () => void cargar(false) }}
        />
      </View>
    );
  }

  return (
    <ScrollView
      testID="dashboard"
      style={estilos.pantalla}
      contentContainerStyle={estilos.contenedor}
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} />}
    >
      <View>
        <Text style={estilos.saludo}>{nombre !== '' ? `Hola, ${nombre}` : 'Hola'}</Text>
        <Text style={estilos.fecha}>{formatearFechaLarga()}</Text>
      </View>
      {errorAlActualizar && <Text style={estilos.alerta}>No pudimos actualizar el dashboard. Deslizá para reintentar.</Text>}

      {datos === null ? (
        <View testID="cargando" style={estilos.contadores}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={estilos.esqueleto}>
              <Esqueleto alto={tamanios.avatarGrande - espaciado.xl} radio={radios.tarjeta} />
            </View>
          ))}
        </View>
      ) : (
        <View style={estilos.contadores}>
          <Contador icono="construct-outline" numero={datos.metricas.serviciosActivos} etiqueta="Servicios activos" />
          <Contador icono="time-outline" numero={datos.metricas.solicitudesPendientes} etiqueta="Sin responder" />
          <Contador
            icono="shield-checkmark-outline"
            numero={datos.metricas.validacionesPendientes}
            etiqueta="Por validar"
            destacado={datos.metricas.validacionesPendientes > 0}
            onPress={() => navigation.navigate('Validaciones')}
          />
        </View>
      )}

      <View style={estilos.filaSeccion}>
        <Text style={estilos.seccion}>Validaciones pendientes</Text>
        {datos !== null && datos.metricas.validacionesPendientes > datos.pendientes.length && (
          <Button etiqueta="Ver todas" variante="texto" tamanio="chico" ancho="contenido" onPress={() => navigation.navigate('Validaciones')} />
        )}
      </View>
      {datos === null ? (
        <Esqueleto alto={tamanios.avatar + espaciado.l} radio={radios.tarjeta} />
      ) : datos.pendientes.length === 0 ? (
        <EstadoVacio icono="checkmark-done-outline" mensaje="No hay prestadores pendientes." />
      ) : (
        <View>
          {datos.pendientes.map((p) => (
            <Card key={p.uuid} variante="blanca" onPress={() => navigation.navigate('Validaciones')} accessibilityLabel={p.nombreApellido}>
              <Avatar nombre={p.nombreApellido} tamanio={tamanios.avatarChico} />
              <View style={estilos.datos}>
                <Text style={estilos.nombre}>{p.nombreApellido}</Text>
                <Text style={estilos.dato}>Se postuló {haceCuanto(p.postuladoEn)}</Text>
              </View>
              <Etiqueta texto={p.tipoServicio.nombre} tono="lila" />
            </Card>
          ))}
        </View>
      )}

      <Text style={[estilos.seccion, estilos.separado]}>Actividad</Text>
      <SelectorDePeriodo meses={meses} onCambiar={cambiarPeriodo} />
      {errorDetalle ? (
        <EstadoVacio
          icono="cloud-offline-outline"
          mensaje="No pudimos cargar los gráficos."
          accion={{ etiqueta: 'Reintentar', onPress: () => void cargarDetalle(meses) }}
        />
      ) : detalle === null ? (
        <View testID="cargando-graficos" style={estilos.graficos}>
          <Esqueleto alto={tamanios.avatarGrande} radio={radios.tarjeta} />
          <Esqueleto alto={tamanios.avatarGrande} radio={radios.tarjeta} />
        </View>
      ) : (
        <GraficosDelPeriodo detalle={detalle} />
      )}
    </ScrollView>
  );
}

/** Los cuatro gráficos de E9b, cada uno en su tarjeta con título. */
function GraficosDelPeriodo({ detalle }: { detalle: MetricasDetalle }) {
  return (
    <View style={estilos.graficos}>
      <TarjetaDeGrafico titulo="Trabajo por servicio" subtitulo={`${detalle.totalSolicitudes} solicitudes en el período`}>
        <BarrasHorizontales
          testID="por-servicio"
          vacio="Todavía no hay solicitudes en este período."
          barras={detalle.porServicio.map((s) => ({
            clave: s.servicio,
            etiqueta: s.servicio,
            valor: s.solicitudes,
            detalle: `${s.realizados} ${s.realizados === 1 ? 'realizado' : 'realizados'}`,
          }))}
        />
      </TarjetaDeGrafico>
      <TarjetaDeGrafico titulo="Solicitudes por mes">
        <GraficoPorMes testID="por-mes" puntos={detalle.porMes} />
      </TarjetaDeGrafico>
      <TarjetaDeGrafico titulo="Solicitudes por estado">
        <BarrasHorizontales
          testID="por-estado"
          vacio="Todavía no hay solicitudes en este período."
          barras={detalle.porEstado.map((e) => ({
            clave: e.nombre,
            etiqueta: TEXTOS_DE_ESTADO[e.nombre as EstadoSolicitud] ?? e.nombre,
            valor: e.cantidad,
          }))}
        />
      </TarjetaDeGrafico>
      <TarjetaDeGrafico titulo="Prestadores con más trabajos realizados">
        <BarrasHorizontales
          testID="top-prestadores"
          vacio="Ningún prestador terminó trabajos en este período."
          barras={detalle.topPrestadores.map((p, i) => ({ clave: `${i}-${p.nombre}`, etiqueta: p.nombre, valor: p.cantidad }))}
        />
      </TarjetaDeGrafico>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenedor: { padding: espaciado.l, gap: espaciado.m },
  centro: { flex: 1, justifyContent: 'center', backgroundColor: colores.fondo },
  saludo: { ...tipografia.titulo, color: colores.tinta },
  fecha: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
  alerta: { ...tipografia.cuerpo, color: colores.rojo },
  contadores: { flexDirection: 'row', gap: espaciado.s },
  esqueleto: { flex: 1 },
  filaSeccion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: espaciado.s },
  seccion: { ...tipografia.seccion, color: colores.tinta },
  datos: { flex: 1 },
  nombre: { ...tipografia.cuerpo, fontWeight: '700', color: colores.tinta },
  dato: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
  separado: { marginTop: espaciado.s },
  graficos: { gap: espaciado.m },
});
