import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { obtenerPrestador, type PrestadorDetalle } from '../../api/catalogo';
import { ApiError } from '../../api/errores';
import type { ParametrosDePagina } from '../../api/paginacion';
import {
  listarPublicacionesDePrestador,
  listarValoracionesDePrestador,
  type Publicacion,
  type Resena,
} from '../../api/reputacion';
import { Avatar, Button, Card, EstadoVacio, ImagenProtegida, Logo, Stars } from '../../components';
import { useListaPaginada } from '../../hooks/useListaPaginada';
import type { ClienteStackParams } from '../../navigation/tipos';
import { bordes, colores, espaciado, radios, tamanios, tipografia } from '../../theme';
import { formatearFecha, nombresDeDias } from '../../utils/formato';

type Navegacion = NativeStackNavigationProp<ClienteStackParams>;

type Estado =
  | { tipo: 'cargando' }
  | { tipo: 'listo'; prestador: PrestadorDetalle }
  | { tipo: 'noDisponible' }
  | { tipo: 'error' };

/** Columnas de la grilla de trabajos realizados. */
const COLUMNAS = 3;

const claveDe = (p: Publicacion) => p.uuid;

/**
 * CU05 · Perfil del prestador para el cliente (B6). Sin tarifa (D02). Como un perfil de Instagram: los
 * datos, la valoración más reciente (D2, tocarla abre todas) y abajo la grilla de trabajos realizados
 * (D3). "Solicitar servicio" queda fijo al pie.
 */
export function PerfilPrestadorScreen() {
  const navigation = useNavigation<Navegacion>();
  const { uuidPrestador } = useRoute<RouteProp<ClienteStackParams, 'PerfilPrestador'>>().params;
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    setEstado({ tipo: 'cargando' });
    obtenerPrestador(uuidPrestador)
      .then((prestador) => vigente && setEstado({ tipo: 'listo', prestador }))
      .catch((e) => {
        if (!vigente) return;
        setEstado(e instanceof ApiError && e.status === 404 ? { tipo: 'noDisponible' } : { tipo: 'error' });
      });
    return () => {
      vigente = false;
    };
  }, [uuidPrestador, intento]);

  const reintentar = useCallback(() => setIntento((n) => n + 1), []);

  if (estado.tipo === 'cargando') {
    return <ActivityIndicator color={colores.verde} size="large" style={estilos.cargando} />;
  }
  if (estado.tipo === 'noDisponible') {
    return (
      <View style={estilos.aviso}>
        <Text style={estilos.mensaje}>Este prestador ya no está disponible.</Text>
        <Button etiqueta="Volver" onPress={() => navigation.goBack()} />
      </View>
    );
  }
  if (estado.tipo === 'error') {
    return (
      <View style={estilos.aviso}>
        <Text style={estilos.mensaje}>No pudimos cargar el perfil.</Text>
        <Button etiqueta="Reintentar" onPress={reintentar} />
      </View>
    );
  }
  return <Perfil prestador={estado.prestador} />;
}

/** El perfil ya cargado: recién ahí se piden las valoraciones y los trabajos. */
function Perfil({ prestador: p }: { prestador: PrestadorDetalle }) {
  const navigation = useNavigation<Navegacion>();
  const { bottom } = useSafeAreaInsets();
  const cargarPagina = useCallback(
    (pagina: ParametrosDePagina) => listarPublicacionesDePrestador(p.uuid, pagina),
    [p.uuid],
  );
  const { items, cargando, cargandoMas, refrescando, error, errorMas, cargarMas, refrescar, reintentar } =
    useListaPaginada(cargarPagina, claveDe);

  return (
    <View style={estilos.pantalla}>
      <FlatList
        testID="grilla-trabajos"
        style={estilos.lista}
        data={items}
        keyExtractor={claveDe}
        numColumns={COLUMNAS}
        renderItem={({ item }) => (
          <CeldaDeTrabajo publicacion={item} onPress={() => navigation.navigate('DetalleTrabajo', { publicacion: item, nombrePrestador: p.nombreApellido })} />
        )}
        onEndReached={cargarMas}
        onEndReachedThreshold={0.5}
        refreshing={refrescando}
        onRefresh={refrescar}
        ListHeaderComponent={<Encabezado prestador={p} />}
        ListEmptyComponent={
          cargando ? (
            <ActivityIndicator color={colores.verde} style={estilos.cargandoTrabajos} />
          ) : error ? (
            <View style={estilos.errorTrabajos}>
              <Text style={estilos.textoCentrado}>No pudimos cargar los trabajos.</Text>
              <Button etiqueta="Reintentar" variante="terciario" onPress={reintentar} />
            </View>
          ) : (
            <EstadoVacio mensaje="Este prestador todavía no publicó trabajos." />
          )
        }
        ListFooterComponent={
          errorMas ? (
            <View style={estilos.errorTrabajos}>
              <Text style={estilos.textoCentrado}>No pudimos cargar más.</Text>
              <Button etiqueta="Reintentar" variante="terciario" onPress={cargarMas} />
            </View>
          ) : cargandoMas ? (
            <ActivityIndicator color={colores.verde} style={estilos.cargandoTrabajos} />
          ) : null
        }
      />
      <View style={[estilos.pie, { paddingBottom: Math.max(bottom, espaciado.m) }]}>
        <Button
          etiqueta="Solicitar servicio"
          onPress={() => navigation.navigate('FormularioSolicitud', { uuidPrestador: p.uuid })}
        />
      </View>
    </View>
  );
}

function Encabezado({ prestador: p }: { prestador: PrestadorDetalle }) {
  const dias = nombresDeDias(p.dias);
  return (
    <>
      <View style={estilos.banda}>
        <View style={estilos.logo}>
          <Logo />
        </View>
        <Text style={estilos.nombre}>{p.nombreApellido}</Text>
        <View style={estilos.avatar}>
          <Avatar nombre={p.nombreApellido} tamanio={tamanios.avatarGrande} />
        </View>
      </View>
      <View style={estilos.hoja}>
        <Fila icono="person" texto={`Servicio: ${p.tipoServicio.nombre}`} />
        <Fila icono="calendar" texto={dias ? `Disponibilidad: ${dias}` : 'Sin días cargados'} />
        {p.zona ? <Fila icono="location" texto={`Zona: ${p.zona}`} /> : null}
        {p.descripcion ? <Text style={estilos.descripcion}>{p.descripcion}</Text> : null}
        <Fila icono="briefcase" texto={`${p.serviciosRealizados} ${p.serviciosRealizados === 1 ? 'servicio realizado' : 'servicios realizados'}`} />
        {p.verificado ? <Fila icono="shield-checkmark" texto="Verificado" color={colores.verde} /> : null}
        <ValoracionDestacada uuidPrestador={p.uuid} promedio={p.valoracionPromedio} />
        <Text style={estilos.seccion}>Trabajos realizados</Text>
      </View>
    </>
  );
}

type EstadoDeValoraciones =
  | { tipo: 'cargando' }
  | { tipo: 'listo'; resena: Resena | undefined; total: number }
  | { tipo: 'error' };

/** La reseña más reciente (D2, una sola) y cuántas hay. Tocarla abre todas. */
function ValoracionDestacada({ uuidPrestador, promedio }: { uuidPrestador: string; promedio: number | null }) {
  const navigation = useNavigation<Navegacion>();
  const [estado, setEstado] = useState<EstadoDeValoraciones>({ tipo: 'cargando' });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    setEstado({ tipo: 'cargando' });
    listarValoracionesDePrestador(uuidPrestador, { size: 1 })
      .then((pagina) => vigente && setEstado({ tipo: 'listo', resena: pagina.contenido[0], total: pagina.totalElementos }))
      .catch(() => vigente && setEstado({ tipo: 'error' }));
    return () => {
      vigente = false;
    };
  }, [uuidPrestador, intento]);

  const verTodas = () => navigation.navigate('ValoracionesDelPrestador', { uuidPrestador });

  return (
    <View style={estilos.valoraciones}>
      <Text style={estilos.seccion}>Valoraciones</Text>
      {estado.tipo === 'cargando' ? (
        <ActivityIndicator color={colores.verde} />
      ) : estado.tipo === 'error' ? (
        <View style={estilos.fila}>
          <Text style={estilos.texto}>No pudimos cargar las valoraciones.</Text>
          <Button etiqueta="Reintentar" variante="terciario" onPress={() => setIntento((n) => n + 1)} />
        </View>
      ) : !estado.resena ? (
        <Text style={estilos.texto}>Sin valoraciones aún</Text>
      ) : (
        <>
          <View style={estilos.fila}>
            {promedio !== null ? <Stars valor={promedio} /> : null}
            <Text style={estilos.texto}>
              {estado.total} {estado.total === 1 ? 'valoración' : 'valoraciones'}
            </Text>
          </View>
          <Card onPress={verTodas}>
            <View style={estilos.resena}>
              <Text style={estilos.nombreCliente}>{estado.resena.nombreCliente}</Text>
              <Stars valor={estado.resena.puntaje} />
              <Text style={estilos.secundario}>{formatearFecha(estado.resena.creadoEn)}</Text>
              {estado.resena.comentario !== null ? (
                <Text style={estilos.texto} numberOfLines={3}>
                  {estado.resena.comentario}
                </Text>
              ) : null}
            </View>
          </Card>
          {estado.total > 1 ? (
            <Pressable accessibilityRole="button" onPress={verTodas}>
              <Text style={estilos.enlace}>Ver las {estado.total} valoraciones</Text>
            </Pressable>
          ) : null}
        </>
      )}
    </View>
  );
}

/** Celda cuadrada de la grilla: la primera foto del trabajo o, si no tiene, su título. */
function CeldaDeTrabajo({ publicacion: p, onPress }: { publicacion: Publicacion; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={p.titulo} onPress={onPress} style={estilos.celda}>
      {p.imagenIds.length > 0 ? (
        <ImagenProtegida uuid={p.imagenIds[0]} estilo={estilos.foto} accessibilityLabel={`Foto de ${p.titulo}`} />
      ) : (
        <View style={estilos.sinFoto}>
          <Text style={estilos.tituloSinFoto} numberOfLines={3}>
            {p.titulo}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

interface FilaProps {
  icono: keyof typeof Ionicons.glyphMap;
  texto: string;
  color?: string;
}

function Fila({ icono, texto, color = colores.tinta }: FilaProps) {
  return (
    <View style={estilos.fila}>
      <View style={estilos.icono}>
        <Ionicons name={icono} size={tamanios.icono} color={color} />
      </View>
      <Text style={estilos.texto}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.blanco },
  lista: { flex: 1 },
  cargando: { flex: 1 },
  aviso: { flex: 1, justifyContent: 'center', padding: espaciado.l, gap: espaciado.m, backgroundColor: colores.fondo },
  mensaje: { ...tipografia.seccion, color: colores.tinta, textAlign: 'center' },
  banda: { backgroundColor: colores.verde, alignItems: 'center', paddingBottom: espaciado.l },
  logo: { alignSelf: 'flex-start', paddingHorizontal: espaciado.m },
  nombre: { ...tipografia.seccion, color: colores.tinta, marginVertical: espaciado.s },
  avatar: { borderWidth: 3, borderColor: colores.blanco, borderRadius: radios.pill },
  hoja: {
    backgroundColor: colores.blanco,
    borderTopLeftRadius: radios.hoja,
    borderTopRightRadius: radios.hoja,
    marginTop: -espaciado.m,
    padding: espaciado.l,
    paddingBottom: espaciado.s,
    gap: espaciado.m,
  },
  seccion: { ...tipografia.seccion, color: colores.tinta },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espaciado.m },
  icono: { width: espaciado.l + espaciado.xs, alignItems: 'center' },
  texto: { ...tipografia.cuerpo, color: colores.tinta, flexShrink: 1 },
  descripcion: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
  valoraciones: { gap: espaciado.s },
  resena: { flex: 1, gap: espaciado.xs },
  nombreCliente: { ...tipografia.cuerpo, fontWeight: '700', color: colores.tinta },
  secundario: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
  enlace: { ...tipografia.cuerpo, fontWeight: '700', color: colores.verdeOscuro },
  celda: { width: `${100 / COLUMNAS}%`, aspectRatio: 1, padding: bordes.fino },
  foto: { flex: 1 },
  sinFoto: { flex: 1, backgroundColor: colores.tarjeta, justifyContent: 'center', padding: espaciado.s },
  tituloSinFoto: { ...tipografia.cuerpo, fontWeight: '700', color: colores.tinta, textAlign: 'center' },
  cargandoTrabajos: { marginVertical: espaciado.l },
  errorTrabajos: { padding: espaciado.l, gap: espaciado.s },
  textoCentrado: { ...tipografia.cuerpo, color: colores.tinta, textAlign: 'center' },
  pie: {
    backgroundColor: colores.blanco,
    borderTopWidth: bordes.fino,
    borderTopColor: colores.tarjeta,
    paddingTop: espaciado.m,
    paddingHorizontal: espaciado.l,
  },
});
