import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { cambiarEstadoDeSolicitud, type EstadoSolicitud, type SolicitudEnLista } from '../../api/solicitudes';
import { Avatar, Button, Chip, EstadoVacio, Input } from '../../components';
import { useListaDeSolicitudes } from '../../hooks/useListaDeSolicitudes';
import type { PrestadorStackParams } from '../../navigation/tipos';
import { colores, espaciado, radios, tamanios, tipografia } from '../../theme';
import { mensajeDe } from '../../utils/errores';
import { formatearFechaSola } from '../../utils/formato';

const DURACION_AVISO_MS = 4000;

const SECCIONES: { etiqueta: string; estados: EstadoSolicitud[] }[] = [
  { etiqueta: 'Pendientes', estados: ['PENDIENTE'] },
  { etiqueta: 'Aceptadas', estados: ['ACEPTADA'] },
  { etiqueta: 'En curso', estados: ['EN_CURSO'] },
];

/** Solicitudes recibidas por el prestador (CU09): aceptar (en el detalle, con precio), rechazar y seguimiento. */
export function SolicitudesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<PrestadorStackParams>>();
  const [seccion, setSeccion] = useState(0);
  const [aviso, setAviso] = useState<string | undefined>();
  const estados = SECCIONES[seccion].estados;
  const { items, cargando, cargandoMas, refrescando, error, errorMas, errorAlActualizar, cargarMas, refrescar, reintentar, quitar } =
    useListaDeSolicitudes(estados);

  useEffect(() => {
    if (aviso === undefined) return;
    const temporizador = setTimeout(() => setAviso(undefined), DURACION_AVISO_MS);
    return () => clearTimeout(temporizador);
  }, [aviso]);

  const abrir = (uuid: string) => navigation.navigate('DetalleSolicitud', { uuidSolicitud: uuid });

  return (
    <View style={estilos.pantalla}>
      {aviso !== undefined && <Text style={estilos.aviso}>{aviso}</Text>}
      <Text style={estilos.titulo}>Solicitudes</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={estilos.filtros}
        contentContainerStyle={estilos.filtrosContenido}
      >
        {SECCIONES.map((s, i) => (
          <Chip
            key={s.etiqueta}
            etiqueta={s.etiqueta}
            seleccionado={i === seccion}
            onPress={() => {
              setAviso(undefined);
              setSeccion(i);
            }}
          />
        ))}
      </ScrollView>

      {cargando && !refrescando ? (
        <ActivityIndicator color={colores.verde} size="large" style={estilos.cargando} />
      ) : error && items.length === 0 ? (
        <View style={estilos.error}>
          <Text style={estilos.textoError}>No pudimos cargar las solicitudes.</Text>
          <Button etiqueta="Reintentar" onPress={reintentar} />
        </View>
      ) : (
        <FlatList
          testID="lista-solicitudes"
          data={items}
          keyExtractor={(s) => s.uuid}
          renderItem={({ item }) => (
            <TarjetaDeSolicitud
              solicitud={item}
              onAbrir={() => abrir(item.uuid)}
              onRechazada={() => {
                quitar(item.uuid);
                setAviso('Solicitud rechazada.');
              }}
            />
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
              mensaje={
                estados[0] === 'PENDIENTE' ? 'No tenés solicitudes pendientes.' : 'No hay solicitudes en este estado.'
              }
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

interface PropsTarjeta {
  solicitud: SolicitudEnLista;
  onAbrir: () => void;
  onRechazada: () => void;
}

function TarjetaDeSolicitud({ solicitud, onAbrir, onRechazada }: PropsTarjeta) {
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const pendiente = solicitud.estado === 'PENDIENTE';
  const cuando =
    solicitud.horaPreferida === null
      ? formatearFechaSola(solicitud.fechaDeseada)
      : `${formatearFechaSola(solicitud.fechaDeseada)} · ${solicitud.horaPreferida}`;

  const confirmarRechazo = async () => {
    setEnviando(true);
    setError(undefined);
    try {
      const texto = motivo.trim();
      await cambiarEstadoDeSolicitud(solicitud.uuid, texto === '' ? { accion: 'RECHAZAR' } : { accion: 'RECHAZAR', motivo: texto });
      onRechazada();
    } catch (e) {
      setError(mensajeDe(e));
      setEnviando(false);
    }
  };

  return (
    <Pressable accessibilityRole="button" onPress={onAbrir} style={estilos.tarjeta}>
      <View style={estilos.cabecera}>
        <Avatar nombre={solicitud.contraparte.nombreApellido} tamanio={tamanios.avatarChico} />
        <View style={estilos.datos}>
          <View style={estilos.fila}>
            <Text style={estilos.nombre}>{solicitud.contraparte.nombreApellido}</Text>
            <Text style={estilos.direccion} numberOfLines={1}>
              {solicitud.direccion}
            </Text>
          </View>
          <Text style={estilos.cuando}>{cuando}</Text>
          <Text style={estilos.descripcion} numberOfLines={3}>
            {solicitud.descripcion}
          </Text>
        </View>
      </View>

      {pendiente && !rechazando && (
        <View style={estilos.botones}>
          <Button etiqueta="ACEPTAR" variante="secundario" onPress={onAbrir} />
          <Button etiqueta="RECHAZAR" variante="secundario" onPress={() => setRechazando(true)} />
        </View>
      )}
      {pendiente && rechazando && (
        <View style={estilos.confirmacion}>
          <Input etiqueta="Motivo (opcional)" value={motivo} onChangeText={setMotivo} multiline />
          {error !== undefined && <Text style={estilos.textoError}>{error}</Text>}
          <View style={estilos.botones}>
            <Button etiqueta="Confirmar rechazo" variante="secundario" onPress={() => void confirmarRechazo()} deshabilitado={enviando} />
            <Button etiqueta="Volver" variante="terciario" onPress={() => setRechazando(false)} deshabilitado={enviando} />
          </View>
        </View>
      )}
    </Pressable>
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
  tarjeta: {
    backgroundColor: colores.blanco,
    borderRadius: radios.tarjeta,
    padding: espaciado.m,
    marginBottom: espaciado.m,
    gap: espaciado.m,
  },
  cabecera: { flexDirection: 'row', gap: espaciado.m, alignItems: 'flex-start' },
  datos: { flex: 1, gap: espaciado.xs },
  fila: { flexDirection: 'row', justifyContent: 'space-between', gap: espaciado.s },
  nombre: { ...tipografia.cuerpo, fontWeight: '700', color: colores.tinta, flexShrink: 1 },
  direccion: { ...tipografia.cuerpo, fontWeight: '600', color: colores.tinta, flex: 1, textAlign: 'right' },
  cuando: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
  descripcion: { ...tipografia.cuerpo, color: colores.tinta },
  botones: { flexDirection: 'row', justifyContent: 'center', gap: espaciado.m },
  confirmacion: { gap: espaciado.s },
});
