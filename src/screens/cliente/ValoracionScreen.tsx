import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../../api/errores';
import { valorarSolicitud } from '../../api/reputacion';
import { Button, Input } from '../../components';
import type { ClienteStackParams } from '../../navigation/tipos';
import { colores, espaciado, tipografia } from '../../theme';
import { mensajeDe } from '../../utils/errores';

const MAXIMO = 5;

type Paso = 'pregunta' | 'noSeRealizo' | 'valorar';

interface Errores {
  puntaje?: string;
  comentario?: string;
  general?: string;
}

/**
 * CU08 · Valorar una solicitud FINALIZADA (D1, D07). Primero pregunta si el servicio se realizó: si sí, 1 a 5
 * estrellas y un comentario opcional; si no, explica que ya figura como realizada (NO_SE_PRESENTO no sale de
 * FINALIZADA, D34) y vuelve. Posponer es volver atrás: el detalle sigue ofreciendo "Valorar el servicio".
 */
export function ValoracionScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ClienteStackParams>>();
  const { uuidSolicitud } = useRoute<RouteProp<ClienteStackParams, 'Valoracion'>>().params;

  const [paso, setPaso] = useState<Paso>('pregunta');
  const [puntaje, setPuntaje] = useState(0);
  const [comentario, setComentario] = useState('');
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);
  const enCurso = useRef(false);

  const elegir = (n: number) => {
    setPuntaje(n);
    setErrores((e) => ({ ...e, puntaje: undefined }));
  };

  async function enviar() {
    if (enCurso.current) return;
    if (puntaje === 0) {
      setErrores({ puntaje: 'Elegí de 1 a 5 estrellas.' });
      return;
    }
    enCurso.current = true;
    setEnviando(true);
    try {
      await valorarSolicitud(uuidSolicitud, {
        puntaje,
        ...(comentario.trim() !== '' && { comentario: comentario.trim() }),
      });
      navigation.goBack(); // el detalle se recarga al volver y ya muestra VALORADA
    } catch (e) {
      if (e instanceof ApiError) {
        const deCampo = { puntaje: e.errorDe('puntaje'), comentario: e.errorDe('comentario') };
        const sinCampo = Object.values(deCampo).every((m) => m === undefined);
        setErrores({ ...deCampo, general: sinCampo ? e.message : undefined });
      } else {
        setErrores({ general: mensajeDe(e) });
      }
      enCurso.current = false;
      setEnviando(false);
    }
  }

  if (paso === 'pregunta') {
    return (
      <View style={[estilos.pantalla, estilos.contenedor]}>
        <Text style={estilos.titulo}>¿Se realizó el servicio?</Text>
        <View style={estilos.botones}>
          <Button etiqueta="Sí, se realizó" onPress={() => setPaso('valorar')} />
          <Button etiqueta="No" variante="secundario" onPress={() => setPaso('noSeRealizo')} />
          <Button etiqueta="Más tarde" variante="terciario" onPress={() => navigation.goBack()} />
        </View>
      </View>
    );
  }

  if (paso === 'noSeRealizo') {
    return (
      <View style={[estilos.pantalla, estilos.contenedor]}>
        <Text style={estilos.texto}>
          La solicitud ya figura como realizada, así que no se puede marcar que el prestador no se presentó.
        </Text>
        <View style={estilos.botones}>
          <Button etiqueta="Volver" onPress={() => navigation.goBack()} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={estilos.pantalla} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={estilos.contenedor} keyboardShouldPersistTaps="handled">
        <Text style={estilos.titulo}>¿Cómo fue el servicio?</Text>
        <View style={estilos.estrellas} accessibilityRole="radiogroup">
          {Array.from({ length: MAXIMO }, (_, i) => i + 1).map((n) => (
            <Pressable
              key={n}
              accessibilityRole="radio"
              accessibilityLabel={`${n} de ${MAXIMO} estrellas`}
              accessibilityState={{ selected: puntaje === n, disabled: enviando }}
              disabled={enviando}
              onPress={() => elegir(n)}
              hitSlop={espaciado.xs}
            >
              <Text style={estilos.estrella}>{n <= puntaje ? '★' : '☆'}</Text>
            </Pressable>
          ))}
        </View>
        {errores.puntaje !== undefined && <Text style={estilos.error}>{errores.puntaje}</Text>}

        <Input
          etiqueta="Comentario (opcional)"
          value={comentario}
          onChangeText={(valor) => {
            setComentario(valor);
            setErrores((e) => (e.comentario === undefined ? e : { ...e, comentario: undefined }));
          }}
          multiline
          textAlignVertical="top"
          numberOfLines={4}
          maxLength={500}
          error={errores.comentario}
        />

        {errores.general !== undefined && <Text style={estilos.error}>{errores.general}</Text>}
        <View style={estilos.botones}>
          <Button etiqueta="Enviar valoración" onPress={enviar} deshabilitado={enviando} />
          <Button etiqueta="Más tarde" variante="terciario" onPress={() => navigation.goBack()} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenedor: { padding: espaciado.m, paddingBottom: espaciado.xl },
  titulo: { ...tipografia.seccion, color: colores.tinta, marginBottom: espaciado.m },
  texto: { ...tipografia.cuerpo, color: colores.tinta, marginBottom: espaciado.m },
  estrellas: { flexDirection: 'row', gap: espaciado.s, marginBottom: espaciado.m },
  estrella: { ...tipografia.titulo, color: colores.estrella },
  error: { ...tipografia.cuerpo, color: colores.tinta, marginBottom: espaciado.m },
  botones: { gap: espaciado.s },
});
