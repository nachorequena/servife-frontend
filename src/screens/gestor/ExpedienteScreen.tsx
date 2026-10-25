import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { vaciarDocumentosDescargados } from '../../api/cacheImagenes';
import { ApiError } from '../../api/errores';
import { descargarDocumento, obtenerExpediente, type Documento, type Expediente, type TipoDeDocumento } from '../../api/gestion';
import { Card, EstadoVacio, Esqueleto, Etiqueta, ImagenProtegida, useAvisoFlotante } from '../../components';
import type { GestorStackParams } from '../../navigation/tipos';
import { bordes, colores, espaciado, radios, tamanios, tipografia } from '../../theme';
import { formatearFecha } from '../../utils/formato';
import { mensajeDe } from '../../utils/errores';
import { AccionesDeValidacion } from './AccionesDeValidacion';

const NOMBRE_DE_TIPO: Record<TipoDeDocumento, string> = {
  DNI_FRENTE: 'DNI (frente)',
  DNI_DORSO: 'DNI (dorso)',
  CERTIFICACION: 'Certificación',
};

/**
 * Expediente de validación de un prestador · CU14 · E8, E8b y E6 (D01). Cada requisito va en una tarjeta con
 * ✓ si está o ⚠ si falta; si el rubro pide matrícula y no hay certificación, se avisa arriba. Tocar una imagen
 * la abre en pantalla completa. Aprobar y Rechazar quedan fijos abajo. Las imágenes se bajan a una carpeta
 * temporal que se vacía al salir (Ley 25.326). Sin maqueta propia (D10).
 */
export function ExpedienteScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GestorStackParams>>();
  const { params } = useRoute<NativeStackScreenProps<GestorStackParams, 'Expediente'>['route']>();
  const { uuidPrestador, nombreApellido, rubro, requiereMatricula } = params;
  const { bottom } = useSafeAreaInsets();
  const { mostrar } = useAvisoFlotante();
  const [expediente, setExpediente] = useState<Expediente | null>(null);
  const [error, setError] = useState(false);
  const [ampliado, setAmpliado] = useState<Documento | null>(null);

  const cargar = useCallback(() => {
    let vigente = true;
    setError(false);
    obtenerExpediente(uuidPrestador).then(
      (e) => vigente && setExpediente(e),
      () => vigente && setError(true),
    );
    return () => {
      vigente = false;
    };
  }, [uuidPrestador]);
  useFocusEffect(cargar);

  // Los documentos descargados no quedan en el teléfono después de mirarlos.
  useEffect(() => () => vaciarDocumentosDescargados(), []);

  function fallo(e: unknown) {
    mostrar(mensajeDe(e), 'error');
    if (e instanceof ApiError && e.codigo === 'VALIDACION_YA_RESUELTA') {
      navigation.goBack();
    }
  }

  if (error && expediente === null) {
    return (
      <View style={estilos.centro}>
        <EstadoVacio icono="cloud-offline-outline" mensaje="No pudimos cargar el expediente." accion={{ etiqueta: 'Reintentar', onPress: cargar }} />
      </View>
    );
  }
  if (expediente === null) {
    return (
      <View style={estilos.contenedor} testID="cargando">
        {[0, 1, 2].map((i) => (
          <Esqueleto key={i} alto={tamanios.avatarGrande} radio={radios.tarjeta} />
        ))}
      </View>
    );
  }

  const tipos = expediente.documentos.map((d) => d.tipo);
  const faltaMatricula = requiereMatricula === true && !tipos.includes('CERTIFICACION');
  const certificaciones = expediente.documentos.filter((d) => d.tipo === 'CERTIFICACION');

  function documento(tipo: TipoDeDocumento) {
    const d = expediente?.documentos.find((x) => x.tipo === tipo);
    return d === undefined ? <Text style={estilos.falta}>No lo cargó.</Text> : imagen(d);
  }

  function imagen(d: Documento) {
    return (
      <Pressable
        key={d.uuid}
        accessibilityRole="imagebutton"
        accessibilityLabel={`Ampliar ${NOMBRE_DE_TIPO[d.tipo]}`}
        onPress={() => setAmpliado(d)}
        style={estilos.documento}
      >
        <ImagenProtegida
          uuid={d.uuid}
          descargar={() => descargarDocumento(uuidPrestador, d.uuid)}
          estilo={estilos.imagen}
          accessibilityLabel={NOMBRE_DE_TIPO[d.tipo]}
        />
        <Text style={estilos.fecha}>Cargado el {formatearFecha(d.creadoEn)}</Text>
      </Pressable>
    );
  }

  return (
    <View style={estilos.pantalla}>
      <ScrollView contentContainerStyle={estilos.contenedor}>
        <View style={estilos.encabezado}>
          <Text style={estilos.titulo}>{nombreApellido}</Text>
          <View style={estilos.etiquetas}>
            {rubro !== undefined && <Etiqueta texto={rubro} tono="lila" />}
            {requiereMatricula === true && <Etiqueta texto="Requiere matrícula" tono="advertencia" icono="ribbon-outline" />}
          </View>
        </View>

        {faltaMatricula && (
          <View style={estilos.alerta} accessibilityRole="alert">
            <Ionicons name="warning-outline" size={tamanios.icono} color={colores.advertencia} />
            <Text style={estilos.textoAlerta}>Este rubro requiere matrícula y no cargó ninguna certificación: no se puede aprobar.</Text>
          </View>
        )}

        <Seccion titulo="Declaración jurada de antecedentes" completa={expediente.declaracionJuradaEn !== null}>
          <Text style={expediente.declaracionJuradaEn !== null ? estilos.fecha : estilos.falta}>
            {expediente.declaracionJuradaEn !== null
              ? `Aceptada el ${formatearFecha(expediente.declaracionJuradaEn)}.`
              : 'Todavía no la aceptó.'}
          </Text>
        </Seccion>

        <Seccion titulo="DNI (frente)" completa={tipos.includes('DNI_FRENTE')}>
          {documento('DNI_FRENTE')}
        </Seccion>
        <Seccion titulo="DNI (dorso)" completa={tipos.includes('DNI_DORSO')}>
          {documento('DNI_DORSO')}
        </Seccion>
        <Seccion
          titulo={`Certificaciones (${certificaciones.length})`}
          completa={certificaciones.length > 0 || requiereMatricula !== true}
          opcional={requiereMatricula !== true}
        >
          {certificaciones.length === 0 ? <Text style={estilos.falta}>No cargó certificaciones.</Text> : certificaciones.map(imagen)}
        </Seccion>
      </ScrollView>

      <View style={[estilos.barra, { paddingBottom: bottom + espaciado.m }]}>
        <AccionesDeValidacion
          uuidPrestador={uuidPrestador}
          nombreApellido={nombreApellido}
          alDecidir={(decision) => {
            mostrar(decision === 'APROBAR' ? `${nombreApellido} fue aprobado.` : `${nombreApellido} fue rechazado.`);
            navigation.goBack();
          }}
          alFallar={fallo}
        />
      </View>

      <Modal visible={ampliado !== null} animationType="fade" onRequestClose={() => setAmpliado(null)} statusBarTranslucent>
        <View style={estilos.visor}>
          {ampliado !== null && (
            <ImagenProtegida
              uuid={ampliado.uuid}
              descargar={() => descargarDocumento(uuidPrestador, ampliado.uuid)}
              estilo={estilos.imagenAmpliada}
              accessibilityLabel={NOMBRE_DE_TIPO[ampliado.tipo]}
            />
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar imagen"
            onPress={() => setAmpliado(null)}
            style={[estilos.cerrar, { top: espaciado.xl + espaciado.l }]}
            hitSlop={espaciado.s}
          >
            <Ionicons name="close" size={tamanios.icono + espaciado.s} color={colores.blanco} />
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

function Seccion({ titulo, completa, opcional = false, children }: { titulo: string; completa: boolean; opcional?: boolean; children: ReactNode }) {
  return (
    <Card variante="blanca">
      <View style={estilos.seccion}>
        <View style={estilos.filaTitulo}>
          <Ionicons
            name={completa ? 'checkmark-circle' : 'alert-circle'}
            size={tamanios.icono}
            color={completa ? colores.verdeTexto : colores.advertencia}
            accessibilityLabel={completa ? 'Completo' : 'Falta'}
          />
          <Text style={estilos.tituloSeccion}>{titulo}</Text>
          {opcional && <Etiqueta texto="Opcional" />}
        </View>
        {children}
      </View>
    </Card>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  centro: { flex: 1, justifyContent: 'center', backgroundColor: colores.fondo },
  contenedor: { padding: espaciado.l, gap: espaciado.s },
  encabezado: { gap: espaciado.s, marginBottom: espaciado.s },
  titulo: { ...tipografia.seccion, color: colores.tinta },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.xs },
  alerta: {
    flexDirection: 'row',
    gap: espaciado.s,
    alignItems: 'center',
    padding: espaciado.m,
    borderRadius: radios.tarjeta,
    backgroundColor: colores.advertenciaClara,
  },
  textoAlerta: { ...tipografia.cuerpo, color: colores.advertencia, flex: 1 },
  seccion: { flex: 1, gap: espaciado.s },
  filaTitulo: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s },
  tituloSeccion: { ...tipografia.cuerpo, fontWeight: '700', color: colores.tinta, flex: 1 },
  falta: { ...tipografia.cuerpo, color: colores.advertencia },
  fecha: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
  documento: { gap: espaciado.xs },
  imagen: { width: '100%', height: tamanios.avatarGrande, borderRadius: radios.input },
  barra: {
    backgroundColor: colores.blanco,
    borderTopWidth: bordes.fino,
    borderTopColor: colores.bordeSuave,
    paddingHorizontal: espaciado.l,
  },
  visor: { flex: 1, backgroundColor: colores.tinta, justifyContent: 'center' },
  imagenAmpliada: { width: '100%', height: '70%' },
  cerrar: { position: 'absolute', right: espaciado.l },
});
