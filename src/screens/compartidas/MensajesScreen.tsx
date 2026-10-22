import { useNavigation } from '@react-navigation/native';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { listarConversaciones, type Conversacion } from '../../api/mensajeria';
import { Avatar, Button, Card, EstadoVacio, EtiquetaDeEstado } from '../../components';
import { useListaPaginada } from '../../hooks/useListaPaginada';
import { colores, espaciado, radios, tamanios, tipografia } from '../../theme';
import { formatearFechaHora } from '../../utils/formato';

const TOPE_VISIBLE = 9;
const claveDe = (c: Conversacion) => c.uuidChat;

/**
 * Bandeja Mensajes (D04): los chats de las solicitudes del usuario, con el último mensaje y los no leídos.
 * No inicia conversaciones: cada chat nace con su solicitud (D33). La usan cliente y prestador.
 */
export function MensajesScreen() {
  const navigation = useNavigation<{ navigate: (ruta: 'Chat', params: { uuidChat: string }) => void }>();
  const { items, cargando, cargandoMas, refrescando, error, errorMas, errorAlActualizar, cargarMas, refrescar, reintentar } =
    useListaPaginada(listarConversaciones, claveDe);

  return (
    <View style={estilos.pantalla}>
      {cargando && !refrescando ? (
        <ActivityIndicator color={colores.verde} size="large" style={estilos.cargando} />
      ) : error && items.length === 0 ? (
        <View style={estilos.error}>
          <Text style={estilos.textoError}>No pudimos cargar tus mensajes.</Text>
          <Button etiqueta="Reintentar" onPress={reintentar} />
        </View>
      ) : (
        <FlatList
          testID="lista-conversaciones"
          data={items}
          keyExtractor={claveDe}
          renderItem={({ item }) => (
            <FilaDeConversacion conversacion={item} onPress={() => navigation.navigate('Chat', { uuidChat: item.uuidChat })} />
          )}
          contentContainerStyle={estilos.lista}
          onEndReached={cargarMas}
          onEndReachedThreshold={0.5}
          refreshing={refrescando}
          onRefresh={refrescar}
          ListHeaderComponent={
            errorAlActualizar ? <Text style={estilos.textoError}>No pudimos actualizar los mensajes.</Text> : null
          }
          ListEmptyComponent={
            <EstadoVacio mensaje="Todavía no tenés conversaciones. Cada solicitud tiene su chat." />
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

function FilaDeConversacion({ conversacion: c, onPress }: { conversacion: Conversacion; onPress: () => void }) {
  const ultimo = c.ultimoMensaje;
  return (
    <Card onPress={onPress}>
      <Avatar nombre={c.contraparte.nombreApellido} />
      <View style={estilos.datos}>
        <Text style={estilos.nombre}>{c.contraparte.nombreApellido}</Text>
        <Text style={estilos.secundario}>{c.tipoServicio}</Text>
        <Text style={estilos.ultimo} numberOfLines={1}>
          {ultimo === null ? 'Sin mensajes todavía' : `${ultimo.propio ? 'Vos: ' : ''}${ultimo.texto}`}
        </Text>
        <EtiquetaDeEstado estado={c.estadoSolicitud} />
      </View>
      <View style={estilos.lateral}>
        {ultimo !== null && <Text style={estilos.secundario}>{formatearFechaHora(ultimo.creadoEn)}</Text>}
        {c.noLeidos > 0 && (
          <View style={estilos.globo} accessibilityLabel={`${c.noLeidos} sin leer`}>
            <Text style={estilos.numero}>{c.noLeidos > TOPE_VISIBLE ? `${TOPE_VISIBLE}+` : String(c.noLeidos)}</Text>
          </View>
        )}
      </View>
    </Card>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  lista: { padding: espaciado.m, gap: espaciado.s },
  cargando: { marginTop: espaciado.xl },
  error: { padding: espaciado.l, gap: espaciado.m },
  textoError: { ...tipografia.cuerpo, color: colores.tinta, textAlign: 'center' },
  datos: { flex: 1, gap: espaciado.xs },
  nombre: { ...tipografia.cuerpo, fontWeight: '700', color: colores.tinta },
  secundario: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
  ultimo: { ...tipografia.cuerpo, color: colores.tinta },
  lateral: { alignItems: 'flex-end', gap: espaciado.xs },
  globo: {
    minWidth: tamanios.globo,
    height: tamanios.globo,
    paddingHorizontal: espaciado.xs,
    borderRadius: radios.pill,
    backgroundColor: colores.verde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numero: { ...tipografia.globo, color: colores.blanco },
});
