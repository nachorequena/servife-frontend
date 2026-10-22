import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { vaciarDocumentosDescargados } from '../../api/cacheImagenes';
import { ApiError } from '../../api/errores';
import { descargarDocumento, obtenerExpediente, type Documento, type Expediente, type TipoDeDocumento } from '../../api/gestion';
import { Button, ImagenProtegida } from '../../components';
import type { GestorStackParams } from '../../navigation/tipos';
import { colores, espaciado, radios, tamanios, tipografia } from '../../theme';
import { formatearFecha } from '../../utils/formato';
import { mensajeDe } from '../../utils/errores';
import { AccionesDeValidacion } from './AccionesDeValidacion';

const NOMBRE_DE_TIPO: Record<TipoDeDocumento, string> = {
  DNI_FRENTE: 'DNI (frente)',
  DNI_DORSO: 'DNI (dorso)',
  CERTIFICACION: 'Certificación',
};

/**
 * Expediente de validación de un prestador · CU14 · E8, E8b y E6 (D01). Muestra la declaración jurada y
 * las imágenes del DNI y las certificaciones, y permite aprobar o rechazar. Las imágenes se bajan a una
 * carpeta temporal que se vacía al salir de la pantalla (Ley 25.326). Sin maqueta propia (D10).
 */
export function ExpedienteScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GestorStackParams>>();
  const { params } = useRoute<NativeStackScreenProps<GestorStackParams, 'Expediente'>['route']>();
  const { uuidPrestador, nombreApellido } = params;
  const [expediente, setExpediente] = useState<Expediente | null>(null);
  const [error, setError] = useState(false);
  const [errorDeDecision, setErrorDeDecision] = useState<string>();

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
    setErrorDeDecision(mensajeDe(e));
    if (e instanceof ApiError && e.codigo === 'VALIDACION_YA_RESUELTA') {
      navigation.goBack();
    }
  }

  if (error && expediente === null) {
    return (
      <View style={estilos.centro}>
        <Text style={estilos.texto}>No pudimos cargar el expediente.</Text>
        <Button etiqueta="Reintentar" onPress={cargar} />
      </View>
    );
  }
  if (expediente === null) {
    return <ActivityIndicator color={colores.lila} size="large" style={estilos.cargando} />;
  }

  const dni = expediente.documentos.filter((d) => d.tipo !== 'CERTIFICACION');
  const certificaciones = expediente.documentos.filter((d) => d.tipo === 'CERTIFICACION');
  return (
    <ScrollView contentContainerStyle={estilos.contenedor} keyboardShouldPersistTaps="handled">
      <Text style={estilos.titulo}>{nombreApellido}</Text>

      <Text style={estilos.seccion}>1. Declaración jurada de antecedentes</Text>
      <Text style={estilos.texto}>
        {expediente.declaracionJuradaEn !== null
          ? `Aceptada el ${formatearFecha(expediente.declaracionJuradaEn)}.`
          : 'Todavía no la aceptó.'}
      </Text>

      <Text style={estilos.seccion}>2. Verificación de identidad</Text>
      {dni.length === 0 ? <Text style={estilos.texto}>No cargó el DNI.</Text> : dni.map((d) => fila(d))}

      <Text style={estilos.seccion}>3. Certificaciones</Text>
      {certificaciones.length === 0 ? (
        <Text style={estilos.texto}>No cargó certificaciones.</Text>
      ) : (
        certificaciones.map((d) => fila(d))
      )}

      {errorDeDecision !== undefined && <Text style={estilos.mensaje}>{errorDeDecision}</Text>}
      <AccionesDeValidacion
        uuidPrestador={uuidPrestador}
        nombreApellido={nombreApellido}
        alDecidir={() => navigation.goBack()}
        alFallar={fallo}
      />
    </ScrollView>
  );

  function fila(d: Documento) {
    return (
      <View key={d.uuid} style={estilos.documento}>
        <Text style={estilos.texto}>
          {NOMBRE_DE_TIPO[d.tipo]} · {formatearFecha(d.creadoEn)}
        </Text>
        <ImagenProtegida
          uuid={d.uuid}
          descargar={() => descargarDocumento(uuidPrestador, d.uuid)}
          estilo={estilos.imagen}
          accessibilityLabel={NOMBRE_DE_TIPO[d.tipo]}
        />
      </View>
    );
  }
}

const estilos = StyleSheet.create({
  contenedor: { padding: espaciado.l, gap: espaciado.s },
  centro: { flex: 1, justifyContent: 'center', padding: espaciado.l, gap: espaciado.m },
  cargando: { marginTop: espaciado.xl },
  titulo: { ...tipografia.seccion, color: colores.lila },
  seccion: { ...tipografia.seccion, color: colores.tinta, marginTop: espaciado.m },
  texto: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
  mensaje: { ...tipografia.cuerpo, color: colores.tinta, marginTop: espaciado.m },
  documento: { gap: espaciado.xs },
  imagen: { width: '100%', height: tamanios.avatarGrande, borderRadius: radios.input },
});
