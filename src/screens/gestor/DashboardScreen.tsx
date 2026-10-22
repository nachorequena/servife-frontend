import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useCallback, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { listarValidacionesPendientes, obtenerMetricas, type Metricas, type PrestadorPendiente } from '../../api/gestion';
import { Avatar, Button, Card, EstadoVacio, Esqueleto, Etiqueta } from '../../components';
import type { NombreDeIcono } from '../../navigation/iconos';
import type { GestorTabsParams } from '../../navigation/tipos';
import { useSesion } from '../../store/sesion';
import { bordes, colores, espaciado, radios, tamanios, tipografia } from '../../theme';
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
 * Validaciones) y abajo las validaciones más viejas. Sin "Incidencias recientes" (D05). Esqueletos mientras
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
    </ScrollView>
  );
}

interface PropsDeContador {
  icono: NombreDeIcono;
  numero: number;
  etiqueta: string;
  destacado?: boolean;
  onPress?: () => void;
}

/** Tarjeta de un contador: ícono, número grande y texto chico. Si se toca, lleva a la lista correspondiente. */
function Contador({ icono, numero, etiqueta, destacado = false, onPress }: PropsDeContador) {
  const contenido = (
    <>
      <View style={[estilos.icono, destacado && estilos.iconoDestacado]}>
        <Ionicons name={icono} size={tamanios.icono} color={destacado ? colores.advertencia : colores.lilaTexto} />
      </View>
      <Text style={estilos.numero}>{numero}</Text>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
    </>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" accessibilityLabel={`${etiqueta}: ${numero}`} onPress={onPress} style={estilos.contador}>
      {contenido}
    </Pressable>
  ) : (
    <View style={estilos.contador} accessible accessibilityLabel={`${etiqueta}: ${numero}`}>
      {contenido}
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
  contador: {
    flex: 1,
    backgroundColor: colores.blanco,
    borderRadius: radios.tarjeta,
    borderWidth: bordes.fino,
    borderColor: colores.bordeSuave,
    padding: espaciado.m,
    gap: espaciado.xs,
  },
  icono: {
    width: tamanios.avatarChico,
    height: tamanios.avatarChico,
    borderRadius: radios.pill,
    backgroundColor: colores.lilaClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconoDestacado: { backgroundColor: colores.advertenciaClara },
  numero: { ...tipografia.titulo, color: colores.tinta },
  etiqueta: { ...tipografia.etiqueta, color: colores.tintaSecundaria },
  filaSeccion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: espaciado.s },
  seccion: { ...tipografia.seccion, color: colores.tinta },
  datos: { flex: 1 },
  nombre: { ...tipografia.cuerpo, fontWeight: '700', color: colores.tinta },
  dato: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
});
