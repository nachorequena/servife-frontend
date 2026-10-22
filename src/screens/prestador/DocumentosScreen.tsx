import { useFocusEffect } from '@react-navigation/native';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { obtenerMiExpediente, subirDocumento, type Expediente, type TipoDeDocumento } from '../../api/gestion';
import { Button } from '../../components';
import { colores, espaciado, tipografia } from '../../theme';
import { formatearFecha } from '../../utils/formato';
import { mensajeDe } from '../../utils/errores';

/** Límites del backend (E7): 5 MB por imagen y hasta 5 certificaciones. */
const MAXIMO_DE_BYTES = 5 * 1024 * 1024;
const MAXIMO_DE_CERTIFICACIONES = 5;

/** Texto de D01. */
const DECLARACION = 'Declaro bajo juramento no tener antecedentes penales.';

const DNI: { tipo: TipoDeDocumento; nombre: string }[] = [
  { tipo: 'DNI_FRENTE', nombre: 'DNI (frente)' },
  { tipo: 'DNI_DORSO', nombre: 'DNI (dorso)' },
];

/**
 * Documentos para la validación · CU14 · E7 y E7b (D01). El prestador PENDIENTE carga el DNI (frente y
 * dorso) y, si su rubro requiere matrícula, al menos una certificación, y acepta la declaración jurada
 * (obligatoria para subir). Fotos con expo-image-picker (quality 0.6, hasta 5 MB). Nunca vuelve a ver las
 * imágenes: solo qué cargó. Provisoria: sin maqueta (D10).
 */
export function DocumentosScreen() {
  const [expediente, setExpediente] = useState<Expediente | null>(null);
  const [errorDeCarga, setErrorDeCarga] = useState(false);
  const [declaracion, setDeclaracion] = useState(false);
  const [subiendo, setSubiendo] = useState<TipoDeDocumento | null>(null);
  const [mensaje, setMensaje] = useState<string>();

  const cargar = useCallback(() => {
    let vigente = true;
    setErrorDeCarga(false);
    obtenerMiExpediente().then(
      (e) => {
        if (!vigente) return;
        setExpediente(e);
        if (e.declaracionJuradaEn !== null) setDeclaracion(true);
      },
      () => vigente && setErrorDeCarga(true),
    );
    return () => {
      vigente = false;
    };
  }, []);
  useFocusEffect(cargar);

  async function elegirYSubir(tipo: TipoDeDocumento) {
    setMensaje(undefined);
    let resultado: ImagePicker.ImagePickerResult;
    try {
      resultado = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, allowsMultipleSelection: false });
    } catch {
      setMensaje('No pudimos abrir tus fotos.');
      return;
    }
    const asset = resultado.canceled ? undefined : resultado.assets[0];
    if (!asset) return;
    // Se mide la copia comprimida, que es la que se sube (como en el formulario de solicitud).
    if (new File(asset.uri).size > MAXIMO_DE_BYTES) {
      setMensaje('La imagen pesa más de 5 MB. Elegí otra.');
      return;
    }
    setSubiendo(tipo);
    try {
      await subirDocumento(asset.uri, asset.mimeType ?? 'image/jpeg', tipo, asset.fileName ?? undefined);
      setMensaje('Documento cargado.');
      cargar();
    } catch (e) {
      setMensaje(mensajeDe(e));
    } finally {
      setSubiendo(null);
    }
  }

  if (errorDeCarga && expediente === null) {
    return (
      <View style={estilos.centro}>
        <Text style={estilos.texto}>No pudimos cargar tus documentos.</Text>
        <Button etiqueta="Reintentar" onPress={cargar} />
      </View>
    );
  }
  if (expediente === null) {
    return <ActivityIndicator color={colores.verde} size="large" style={estilos.cargando} />;
  }

  const certificaciones = expediente.documentos.filter((d) => d.tipo === 'CERTIFICACION');
  const bloqueado = !declaracion || subiendo !== null;
  return (
    <ScrollView contentContainerStyle={estilos.contenedor}>
      <Text style={estilos.aviso}>Pantalla provisoria: sin diseño en la maqueta (D10).</Text>
      <Text style={estilos.texto}>
        Para aprobar tu perfil necesitamos tu DNI (frente y dorso) y, si tu rubro requiere matrícula (por ejemplo, Gas),
        una certificación. Solo los ve el equipo de ServiFe y se borran cuando revisamos tu perfil.
      </Text>

      <View style={estilos.fila}>
        <Text style={estilos.etiquetaFila}>{DECLARACION}</Text>
        <Switch
          accessibilityLabel={DECLARACION}
          value={declaracion}
          onValueChange={setDeclaracion}
          disabled={expediente.declaracionJuradaEn !== null}
          thumbColor={colores.blanco}
          trackColor={{ false: colores.tarjeta, true: colores.verde }}
        />
      </View>
      {!declaracion && <Text style={estilos.texto}>Aceptá la declaración jurada para poder cargar tus documentos.</Text>}

      {DNI.map(({ tipo, nombre }) => {
        const cargado = expediente.documentos.find((d) => d.tipo === tipo);
        return (
          <View key={tipo} style={estilos.bloque}>
            <Text style={estilos.seccion}>{nombre}</Text>
            <Text style={estilos.texto}>{cargado ? `Cargado el ${formatearFecha(cargado.creadoEn)}.` : 'Falta cargarlo.'}</Text>
            {subiendo === tipo ? (
              <ActivityIndicator color={colores.verde} />
            ) : (
              <Button
                etiqueta={cargado ? 'Reemplazar foto' : 'Elegir foto'}
                variante="terciario"
                onPress={() => elegirYSubir(tipo)}
                deshabilitado={bloqueado}
              />
            )}
          </View>
        );
      })}

      <View style={estilos.bloque}>
        <Text style={estilos.seccion}>
          Certificaciones ({certificaciones.length} de {MAXIMO_DE_CERTIFICACIONES})
        </Text>
        {certificaciones.map((c, i) => (
          <Text key={c.uuid} style={estilos.texto}>
            Certificación {i + 1} · cargada el {formatearFecha(c.creadoEn)}
          </Text>
        ))}
        {subiendo === 'CERTIFICACION' ? (
          <ActivityIndicator color={colores.verde} />
        ) : (
          certificaciones.length < MAXIMO_DE_CERTIFICACIONES && (
            <Button
              etiqueta="Agregar certificación"
              variante="terciario"
              onPress={() => elegirYSubir('CERTIFICACION')}
              deshabilitado={bloqueado}
            />
          )
        )}
      </View>

      {mensaje !== undefined && <Text style={estilos.mensaje}>{mensaje}</Text>}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { padding: espaciado.l, gap: espaciado.m },
  centro: { flex: 1, justifyContent: 'center', padding: espaciado.l, gap: espaciado.m },
  cargando: { marginTop: espaciado.xl },
  aviso: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
  texto: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espaciado.m },
  etiquetaFila: { ...tipografia.cuerpo, color: colores.tinta, flex: 1 },
  bloque: { gap: espaciado.s },
  seccion: { ...tipografia.seccion, color: colores.tinta },
  mensaje: { ...tipografia.cuerpo, color: colores.tinta },
});
