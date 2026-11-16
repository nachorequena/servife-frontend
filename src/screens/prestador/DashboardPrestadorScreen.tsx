import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { obtenerMisMetricas, type MetricasDePrestador } from '../../api/gestion';
import type { EstadoSolicitud } from '../../api/solicitudes';
import { Contador, EstadoVacio, Esqueleto, TEXTOS_DE_ESTADO } from '../../components';
import {
  BarrasHorizontales,
  GraficoPorMes,
  SelectorDePeriodo,
  TarjetaDeGrafico,
  desdeHaceMeses,
  type MesesDePeriodo,
} from '../../components/graficos';
import { useSesion } from '../../store/sesion';
import { colores, espaciado, radios, tamanios, tipografia } from '../../theme';

const EN_CURSO: EstadoSolicitud[] = ['ACEPTADA', 'EN_CURSO'];
const REALIZADOS: EstadoSolicitud[] = ['FINALIZADA', 'VALORADA'];

function sumar(metricas: MetricasDePrestador, estados: EstadoSolicitud[]): number {
  return metricas.porEstado
    .filter((e) => estados.includes(e.nombre as EstadoSolicitud))
    .reduce((total, e) => total + e.cantidad, 0);
}

/** 4.5 → "4,5"; sin valoraciones, una raya. */
function formatearValoracion(valor: number | null): string {
  return valor === null ? '—' : valor.toFixed(1).replace('.', ',');
}

/**
 * Dashboard del prestador · E16. Solo sus solicitudes del período elegido (3, 6 o 12 meses): indicadores
 * (solicitudes, en curso, realizados y valoración), trabajo por cliente, por servicio, por mes y por estado.
 * Se recarga al enfocar y con pull-to-refresh; si falla al refrescar conserva los datos.
 */
export function DashboardPrestadorScreen() {
  const { sesion } = useSesion();
  const nombre = sesion?.usuario.nombreApellido.split(' ')[0] ?? '';
  const [meses, setMeses] = useState<MesesDePeriodo>(6);
  const [metricas, setMetricas] = useState<MetricasDePrestador | null>(null);
  const [error, setError] = useState(false);
  const [errorAlActualizar, setErrorAlActualizar] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const pedido = useRef(0);
  const cargadas = useRef(false);
  cargadas.current = metricas !== null;
  const mesesActuales = useRef(meses);
  mesesActuales.current = meses;

  const cargar = useCallback(async (periodo: MesesDePeriodo, refresco: boolean) => {
    const id = ++pedido.current;
    setError(false);
    setErrorAlActualizar(false);
    try {
      const respuesta = await obtenerMisMetricas({ desde: desdeHaceMeses(periodo) });
      if (id === pedido.current) setMetricas(respuesta);
    } catch {
      if (id !== pedido.current) return;
      if (refresco) {
        setErrorAlActualizar(true);
      } else {
        setMetricas(null);
        setError(true);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void cargar(mesesActuales.current, cargadas.current);
    }, [cargar]),
  );

  function cambiarPeriodo(nuevo: MesesDePeriodo) {
    if (nuevo === meses) return;
    setMeses(nuevo);
    setMetricas(null);
    void cargar(nuevo, false);
  }

  async function refrescar() {
    setRefrescando(true);
    await cargar(meses, true);
    setRefrescando(false);
  }

  return (
    <ScrollView
      testID="dashboard-prestador"
      style={estilos.pantalla}
      contentContainerStyle={estilos.contenedor}
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} />}
    >
      <View>
        <Text style={estilos.saludo}>{nombre !== '' ? `Hola, ${nombre}` : 'Hola'}</Text>
        <Text style={estilos.subtitulo}>Así viene tu trabajo</Text>
      </View>
      <SelectorDePeriodo meses={meses} onCambiar={cambiarPeriodo} />
      {errorAlActualizar && <Text style={estilos.alerta}>No pudimos actualizar tus números. Deslizá para reintentar.</Text>}

      {error ? (
        <EstadoVacio
          icono="cloud-offline-outline"
          mensaje="No pudimos cargar tus números."
          accion={{ etiqueta: 'Reintentar', onPress: () => void cargar(meses, false) }}
        />
      ) : metricas === null ? (
        <View testID="cargando" style={estilos.seccion}>
          <View style={estilos.contadores}>
            {[0, 1].map((i) => (
              <View key={i} style={estilos.esqueleto}>
                <Esqueleto alto={tamanios.avatarGrande - espaciado.xl} radio={radios.tarjeta} />
              </View>
            ))}
          </View>
          <Esqueleto alto={tamanios.avatarGrande} radio={radios.tarjeta} />
        </View>
      ) : (
        <Contenido metricas={metricas} />
      )}
    </ScrollView>
  );
}

function Contenido({ metricas }: { metricas: MetricasDePrestador }) {
  const vacio = 'Todavía no recibiste solicitudes en este período.';
  return (
    <View style={estilos.seccion}>
      <View style={estilos.contadores}>
        <Contador icono="clipboard-outline" numero={metricas.totalSolicitudes} etiqueta="Solicitudes" />
        <Contador icono="construct-outline" numero={sumar(metricas, EN_CURSO)} etiqueta="En curso" />
      </View>
      <View style={estilos.contadores}>
        <Contador icono="checkmark-done-outline" numero={sumar(metricas, REALIZADOS)} etiqueta="Realizados" />
        <Contador icono="star-outline" numero={formatearValoracion(metricas.valoracionPromedio)} etiqueta="Valoración" />
      </View>

      <TarjetaDeGrafico titulo="Trabajo por cliente" subtitulo="Tus clientes con más solicitudes">
        <BarrasHorizontales
          testID="por-cliente"
          vacio={vacio}
          barras={metricas.porCliente.map((c, i) => ({ clave: `${i}-${c.nombre}`, etiqueta: c.nombre, valor: c.cantidad }))}
        />
      </TarjetaDeGrafico>
      <TarjetaDeGrafico titulo="Trabajo por servicio">
        <BarrasHorizontales
          testID="por-servicio"
          vacio={vacio}
          barras={metricas.porServicio.map((s) => ({
            clave: s.servicio,
            etiqueta: s.servicio,
            valor: s.solicitudes,
            detalle: `${s.realizados} ${s.realizados === 1 ? 'realizado' : 'realizados'}`,
          }))}
        />
      </TarjetaDeGrafico>
      <TarjetaDeGrafico titulo="Solicitudes por mes">
        <GraficoPorMes testID="por-mes" puntos={metricas.porMes} />
      </TarjetaDeGrafico>
      <TarjetaDeGrafico titulo="Solicitudes por estado">
        <BarrasHorizontales
          testID="por-estado"
          vacio={vacio}
          barras={metricas.porEstado.map((e) => ({
            clave: e.nombre,
            etiqueta: TEXTOS_DE_ESTADO[e.nombre as EstadoSolicitud] ?? e.nombre,
            valor: e.cantidad,
          }))}
        />
      </TarjetaDeGrafico>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenedor: { padding: espaciado.l, gap: espaciado.m },
  saludo: { ...tipografia.titulo, color: colores.tinta },
  subtitulo: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
  alerta: { ...tipografia.cuerpo, color: colores.rojo },
  seccion: { gap: espaciado.m },
  contadores: { flexDirection: 'row', gap: espaciado.s },
  esqueleto: { flex: 1 },
});
