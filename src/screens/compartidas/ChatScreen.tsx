import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ApiError } from '../../api/errores';
import {
  agregarMensajes,
  canalPorPolling,
  LARGO_MAXIMO_MENSAJE,
  type Chat,
  type Mensaje,
} from '../../api/mensajeria';
import { Button, EstadoVacio } from '../../components';
import { colores, espaciado, radios, tipografia } from '../../theme';
import { mensajeDe } from '../../utils/errores';
import { formatearFechaHora } from '../../utils/formato';

/**
 * Chat de una solicitud (CU07, D33), para cliente y prestador. Recibe el chat por polling cada 8 s, solo con
 * la pantalla enfocada (api/mensajeria.ts). Con la solicitud cerrada se ven los mensajes pero no se escribe.
 */
export function ChatScreen() {
  const { uuidChat } = useRoute().params as { uuidChat: string };
  const navigation = useNavigation<{ setOptions: (opciones: { title: string }) => void }>();
  const [chat, setChat] = useState<Chat | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [fallo, setFallo] = useState(false);
  const [reintento, setReintento] = useState(0);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorDeEnvio, setErrorDeEnvio] = useState<string | undefined>();
  const lista = useRef<FlatList<Mensaje>>(null);
  const montado = useRef(true);

  useEffect(
    () => () => {
      montado.current = false;
    },
    [],
  );

  const recibir = useCallback((recibido: Chat) => {
    setChat(recibido);
    setFallo(false);
    setMensajes((actuales) => agregarMensajes(actuales, recibido.mensajes));
  }, []);

  // Cada suscripción (al enfocar o al reintentar) empieza con el chat completo.
  useFocusEffect(
    useCallback(
      () => canalPorPolling.suscribir(uuidChat, recibir, () => setFallo(true)),
      // reintento no se usa adentro: cambiarlo fuerza una suscripción nueva.
      [uuidChat, recibir, reintento],
    ),
  );

  const nombre = chat?.contraparte.nombreApellido;
  useEffect(() => {
    if (nombre !== undefined) navigation.setOptions({ title: nombre });
  }, [navigation, nombre]);

  const enviar = async () => {
    const recortado = texto.trim();
    if (recortado === '' || enviando) return;
    setEnviando(true);
    setErrorDeEnvio(undefined);
    try {
      const enviado = await canalPorPolling.enviar(uuidChat, recortado);
      if (!montado.current) return;
      setMensajes((actuales) => agregarMensajes(actuales, [enviado]));
      setTexto('');
    } catch (error) {
      if (!montado.current) return;
      setErrorDeEnvio(mensajeDe(error));
      // La solicitud se cerró mientras tanto: se recarga para ocultar el campo.
      if (error instanceof ApiError && error.codigo === 'CHAT_CERRADO') setReintento((n) => n + 1);
    } finally {
      if (montado.current) setEnviando(false);
    }
  };

  if (chat === null) {
    return fallo ? (
      <View style={estilos.centrado}>
        <Text style={estilos.textoError}>No pudimos cargar el chat.</Text>
        <Button etiqueta="Reintentar" onPress={() => setReintento((n) => n + 1)} />
      </View>
    ) : (
      <ActivityIndicator color={colores.verde} size="large" style={estilos.cargando} />
    );
  }

  return (
    <KeyboardAvoidingView style={estilos.pantalla} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {fallo && <Text style={estilos.aviso}>No pudimos actualizar el chat. Reintentamos en unos segundos.</Text>}
      <FlatList
        ref={lista}
        testID="lista-mensajes"
        data={mensajes}
        keyExtractor={(m) => m.uuid}
        renderItem={({ item }) => <Burbuja mensaje={item} />}
        contentContainerStyle={estilos.mensajes}
        onContentSizeChange={() => lista.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <EstadoVacio mensaje={chat.sePuedeEscribir ? 'Todavía no hay mensajes. Escribí el primero.' : 'No hay mensajes.'} />
        }
      />
      {chat.sePuedeEscribir ? (
        <View style={estilos.redactor}>
          {errorDeEnvio !== undefined && <Text style={estilos.textoError}>{errorDeEnvio}</Text>}
          <View style={estilos.fila}>
            <TextInput
              style={estilos.campo}
              value={texto}
              onChangeText={setTexto}
              placeholder="Escribí un mensaje"
              placeholderTextColor={colores.tintaSecundaria}
              maxLength={LARGO_MAXIMO_MENSAJE}
              multiline
              accessibilityLabel="Mensaje"
            />
            <Button etiqueta="Enviar" variante="secundario" onPress={() => void enviar()} deshabilitado={enviando || texto.trim() === ''} />
          </View>
        </View>
      ) : (
        <View style={estilos.redactor}>
          {errorDeEnvio !== undefined && <Text style={estilos.textoError}>{errorDeEnvio}</Text>}
          <Text style={estilos.cerrado}>El chat está cerrado: podés ver los mensajes, pero ya no escribir.</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function Burbuja({ mensaje }: { mensaje: Mensaje }) {
  return (
    <View
      style={[estilos.burbuja, mensaje.propio ? estilos.propia : estilos.ajena]}
      accessibilityLabel={`${mensaje.propio ? 'Vos' : 'Recibido'}: ${mensaje.texto}`}
    >
      <Text style={estilos.texto}>{mensaje.texto}</Text>
      <Text style={estilos.hora}>{formatearFechaHora(mensaje.creadoEn)}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  cargando: { marginTop: espaciado.xl },
  centrado: { flex: 1, padding: espaciado.l, gap: espaciado.m, justifyContent: 'center', backgroundColor: colores.fondo },
  aviso: { ...tipografia.cuerpo, color: colores.tinta, backgroundColor: colores.verdeClaro, padding: espaciado.s },
  mensajes: { padding: espaciado.m, gap: espaciado.s, flexGrow: 1 },
  burbuja: { maxWidth: '80%', padding: espaciado.s, borderRadius: radios.tarjeta, gap: espaciado.xs },
  propia: { alignSelf: 'flex-end', backgroundColor: colores.verdeClaro },
  ajena: { alignSelf: 'flex-start', backgroundColor: colores.blanco },
  texto: { ...tipografia.cuerpo, color: colores.tinta },
  hora: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
  redactor: { padding: espaciado.s, gap: espaciado.xs, backgroundColor: colores.blanco },
  fila: { flexDirection: 'row', alignItems: 'flex-end', gap: espaciado.s },
  campo: {
    ...tipografia.cuerpo,
    flex: 1,
    color: colores.tinta,
    backgroundColor: colores.fondo,
    borderRadius: radios.input,
    paddingHorizontal: espaciado.s,
    paddingVertical: espaciado.s,
  },
  cerrado: { ...tipografia.cuerpo, color: colores.tintaSecundaria, textAlign: 'center' },
  textoError: { ...tipografia.cuerpo, color: colores.tinta },
});
