import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { buscarPrestadores, type PrestadorEnLista } from '../../api/catalogo';
import { Avatar, Button, Card, EstadoVacio, Stars } from '../../components';
import { useUbicacion } from '../../hooks/useUbicacion';
import type { ClienteStackParams } from '../../navigation/tipos';
import { useFiltros } from '../../store/filtros';
import { colores, espaciado, radios, tipografia } from '../../theme';

const TAMANIO_PAGINA = 20;
const DEBOUNCE_MS = 400;
/** El backend exige al menos 2 caracteres en `q`. */
const MIN_CARACTERES = 2;

/** "a 2,3 km": coma decimal y un decimal. */
function formatearDistancia(km: number): string {
  return `a ${km.toFixed(1).replace('.', ',')} km`;
}

/** Inicio del cliente: buscador y lista de prestadores (CU04). */
export function InicioScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ClienteStackParams>>();
  const { filtros } = useFiltros();
  const { ubicacion, estado } = useUbicacion();

  const [texto, setTexto] = useState('');
  const [q, setQ] = useState<string | undefined>(undefined);
  const [items, setItems] = useState<PrestadorEnLista[]>([]);
  const [pagina, setPagina] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState(false);
  const [reintento, setReintento] = useState(0);
  const [errorMas, setErrorMas] = useState(false);
  const solicitud = useRef(0);
  const cargandoMasRef = useRef(false);
  const esRefresco = useRef(false);

  useEffect(() => {
    const recortado = texto.trim();
    const temporizador = setTimeout(
      () => setQ(recortado.length >= MIN_CARACTERES ? recortado : undefined),
      DEBOUNCE_MS,
    );
    return () => clearTimeout(temporizador);
  }, [texto]);

  const pedirPagina = useCallback(
    (numero: number) =>
      buscarPrestadores({
        q,
        tipoServicioId: filtros.tipoServicioId,
        puntajeMin: filtros.puntajeMin,
        dias: filtros.dias.length > 0 ? filtros.dias : undefined,
        orden: filtros.orden,
        lat: ubicacion?.lat,
        lng: ubicacion?.lng,
        page: numero,
        size: TAMANIO_PAGINA,
      }),
    [q, filtros, ubicacion],
  );

  // Primera página: se espera a saber si hay ubicación para no pedir dos veces.
  // Una consulta nueva (texto, filtros, reintento o refresco) siempre pasa por acá y anula a la anterior.
  useEffect(() => {
    if (estado === 'pidiendo') return;
    const id = ++solicitud.current;
    const refresco = esRefresco.current;
    esRefresco.current = false;
    cargandoMasRef.current = false;
    setCargandoMas(false);
    setErrorMas(false);
    setError(false);
    setRefrescando(refresco);
    setCargando(!refresco);
    if (!refresco) setItems([]);
    pedirPagina(0)
      .then((resultado) => {
        if (id !== solicitud.current) return;
        setItems(resultado.contenido);
        setPagina(resultado.pagina);
        setTotalPaginas(resultado.totalPaginas);
      })
      .catch(() => {
        if (id !== solicitud.current) return;
        setItems([]);
        setError(true);
      })
      .finally(() => {
        if (id !== solicitud.current) return;
        setCargando(false);
        setRefrescando(false);
      });
  }, [estado, pedirPagina, reintento]);

  const cargarMas = () => {
    if (cargandoMasRef.current || cargando || refrescando || error || pagina + 1 >= totalPaginas) return;
    const id = solicitud.current;
    cargandoMasRef.current = true;
    setCargandoMas(true);
    setErrorMas(false);
    pedirPagina(pagina + 1)
      .then((resultado) => {
        if (id !== solicitud.current) return;
        setItems((actuales) => {
          const existentes = new Set(actuales.map((p) => p.uuid));
          return [...actuales, ...resultado.contenido.filter((p) => !existentes.has(p.uuid))];
        });
        setPagina(resultado.pagina);
        setTotalPaginas(resultado.totalPaginas);
      })
      .catch(() => {
        if (id === solicitud.current) setErrorMas(true);
      })
      .finally(() => {
        if (id !== solicitud.current) return;
        cargandoMasRef.current = false;
        setCargandoMas(false);
      });
  };

  const refrescar = () => {
    esRefresco.current = true;
    setReintento((n) => n + 1);
  };

  const limpiarBusqueda = () => {
    setTexto('');
    setQ(undefined);
  };

  return (
    <View style={estilos.pantalla}>
      <Text style={estilos.titulo}>Inicio</Text>
      <View style={estilos.buscador}>
        <Pressable hitSlop={espaciado.s} accessibilityRole="button" accessibilityLabel="Abrir filtros" onPress={() => navigation.navigate('Filtros')}>
          <Text style={estilos.icono}>▼</Text>
        </Pressable>
        <TextInput
          style={estilos.entrada}
          placeholder="Buscar"
          placeholderTextColor={colores.tintaSecundaria}
          value={texto}
          onChangeText={setTexto}
          returnKeyType="search"
          autoCorrect={false}
        />
        <Pressable hitSlop={espaciado.s} accessibilityRole="button" accessibilityLabel="Limpiar búsqueda" onPress={limpiarBusqueda}>
          <Text style={estilos.icono}>✕</Text>
        </Pressable>
      </View>

      {cargando && !refrescando ? (
        <ActivityIndicator color={colores.verde} size="large" style={estilos.cargando} />
      ) : error && items.length === 0 ? (
        <View style={estilos.error}>
          <Text style={estilos.textoError}>No pudimos cargar los prestadores.</Text>
          <Button etiqueta="Reintentar" onPress={() => setReintento((n) => n + 1)} />
        </View>
      ) : (
        <FlatList
          testID="lista-prestadores"
          data={items}
          keyExtractor={(prestador) => prestador.uuid}
          renderItem={({ item }) => (
            <TarjetaPrestador
              prestador={item}
              onPress={() => navigation.navigate('PerfilPrestador', { uuidPrestador: item.uuid })}
            />
          )}
          contentContainerStyle={estilos.lista}
          onEndReached={cargarMas}
          onEndReachedThreshold={0.5}
          refreshing={refrescando}
          onRefresh={refrescar}
          ListEmptyComponent={<EstadoVacio mensaje="No hay prestadores disponibles con esos filtros." />}
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

function TarjetaPrestador({ prestador, onPress }: { prestador: PrestadorEnLista; onPress: () => void }) {
  const { nombreApellido, tipoServicio, valoracionPromedio, distanciaKm, verificado } = prestador;
  return (
    <Card onPress={onPress}>
      <Avatar nombre={nombreApellido} />
      <View style={estilos.datos}>
        <Text style={estilos.nombre}>{nombreApellido}</Text>
        <Text style={estilos.rubro}>{tipoServicio.nombre}</Text>
        <View style={estilos.linea}>
          {valoracionPromedio != null && <Stars valor={valoracionPromedio} />}
          {distanciaKm != null && <Text style={estilos.rubro}>{formatearDistancia(distanciaKm)}</Text>}
          {verificado && (
            <View style={estilos.verificado}>
              <Ionicons name="shield-checkmark" size={14} color={colores.verde} />
              <Text style={estilos.rubro}>Verificado</Text>
            </View>
          )}
        </View>
      </View>
    </Card>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  titulo: { ...tipografia.titulo, color: colores.tinta, textAlign: 'center', marginTop: espaciado.m },
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.m,
    backgroundColor: colores.blanco,
    borderRadius: radios.pill,
    paddingVertical: espaciado.s,
    paddingHorizontal: espaciado.m,
    marginHorizontal: espaciado.l,
    marginVertical: espaciado.m,
  },
  icono: { ...tipografia.cuerpo, color: colores.tinta },
  entrada: { flex: 1, ...tipografia.cuerpo, color: colores.tinta, paddingVertical: 0 },
  lista: { paddingHorizontal: espaciado.m, paddingBottom: espaciado.l },
  cargando: { marginTop: espaciado.xl },
  error: { padding: espaciado.l, gap: espaciado.m },
  textoError: { ...tipografia.cuerpo, color: colores.tinta, textAlign: 'center' },
  datos: { flex: 1, gap: espaciado.xs },
  nombre: { ...tipografia.cuerpo, fontWeight: '700', color: colores.tinta },
  rubro: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
  linea: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: espaciado.s },
  verificado: { flexDirection: 'row', alignItems: 'center', gap: espaciado.xs },
});
