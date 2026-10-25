import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { obtenerMiExpediente, subirDocumento, type Documento, type Expediente, type TipoDeDocumento } from '../../api/gestion';
import { Button, Card, EstadoVacio, Esqueleto, Etiqueta, useAvisoFlotante } from '../../components';
import { bordes, colores, espaciado, radios, tamanios, tipografia } from '../../theme';
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
 * Documentos para la validación · CU14 · E7 y E7b (D01). El prestador PENDIENTE acepta la declaración jurada
 * (obligatoria para subir), carga el DNI (frente y dorso) y, si su rubro requiere matrícula, al menos una
 * certificación. Una barra muestra cuántos de los tres requisitos de siempre están listos. Las fotos se eligen
 * con expo-image-picker (quality 0.6, hasta 5 MB); lo subido en esta visita se ve en miniatura desde el
 * teléfono (el servidor nunca le devuelve las imágenes). Provisoria: sin maqueta (D10).
 */
export function DocumentosScreen() {
  const { mostrar } = useAvisoFlotante();
  const [expediente, setExpediente] = useState<Expediente | null>(null);
  const [errorDeCarga, setErrorDeCarga] = useState(false);
  const [declaracion, setDeclaracion] = useState(false);
  const [subiendo, setSubiendo] = useState<TipoDeDocumento | null>(null);
  /** Miniaturas de lo subido en esta visita: uuid del documento → uri local. */
  const [locales, setLocales] = useState<Record<string, string>>({});

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
    let resultado: ImagePicker.ImagePickerResult;
    try {
      resultado = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, allowsMultipleSelection: false });
    } catch {
      mostrar('No pudimos abrir tus fotos.', 'error');
      return;
    }
    const asset = resultado.canceled ? undefined : resultado.assets[0];
    if (!asset) return;
    // Se mide la copia comprimida, que es la que se sube (como en el formulario de solicitud).
    if (new File(asset.uri).size > MAXIMO_DE_BYTES) {
      mostrar('La imagen pesa más de 5 MB. Elegí otra.', 'error');
      return;
    }
    setSubiendo(tipo);
    try {
      const documento = await subirDocumento(asset.uri, asset.mimeType ?? 'image/jpeg', tipo, asset.fileName ?? undefined);
      setLocales((l) => ({ ...l, [documento.uuid]: asset.uri }));
      mostrar(tipo === 'CERTIFICACION' ? 'Certificación cargada.' : 'Documento cargado.');
      cargar();
    } catch (e) {
      mostrar(mensajeDe(e), 'error');
    } finally {
      setSubiendo(null);
    }
  }

  if (errorDeCarga && expediente === null) {
    return (
      <View style={estilos.centro}>
        <EstadoVacio icono="cloud-offline-outline" mensaje="No pudimos cargar tus documentos." accion={{ etiqueta: 'Reintentar', onPress: cargar }} />
      </View>
    );
  }
  if (expediente === null) {
    return (
      <View style={estilos.contenedor} testID="cargando">
        {[0, 1, 2].map((i) => (
          <Esqueleto key={i} alto={tamanios.miniatura + espaciado.l} radio={radios.tarjeta} />
        ))}
      </View>
    );
  }

  const aceptada = expediente.declaracionJuradaEn !== null;
  const certificaciones = expediente.documentos.filter((d) => d.tipo === 'CERTIFICACION');
  const listos = [aceptada, ...DNI.map(({ tipo }) => expediente.documentos.some((d) => d.tipo === tipo))].filter(Boolean)
    .length;
  const bloqueado = !declaracion || subiendo !== null;

  function miniatura(d: Documento | undefined) {
    const uri = d !== undefined ? locales[d.uuid] : undefined;
    if (uri !== undefined) {
      return <Image source={{ uri }} style={estilos.miniatura} accessibilityLabel="Foto cargada" />;
    }
    return (
      <View style={[estilos.miniatura, estilos.sinFoto]}>
        <Ionicons name={d !== undefined ? 'document-text' : 'image-outline'} size={tamanios.icono} color={colores.tintaSecundaria} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={estilos.contenedor}>
      <Text style={estilos.texto}>
        Para aprobar tu perfil necesitamos tu DNI y la declaración jurada. Solo los ve el equipo de ServiFe y se borran
        cuando revisamos tu perfil.
      </Text>

      <View accessibilityLabel={`${listos} de 3 requisitos listos`}>
        <View style={estilos.filaProgreso}>
          <Text style={estilos.seccion}>Requisitos</Text>
          <Text style={estilos.texto}>{listos} de 3 listos</Text>
        </View>
        <View style={estilos.pista}>
          <View style={[estilos.relleno, { width: `${(listos / 3) * 100}%` }]} />
        </View>
      </View>

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: declaracion, disabled: aceptada }}
        accessibilityLabel={DECLARACION}
        disabled={aceptada}
        onPress={() => setDeclaracion((d) => !d)}
        style={[estilos.declaracion, declaracion && estilos.declaracionAceptada]}
      >
        <Ionicons
          name={declaracion ? 'checkbox' : 'square-outline'}
          size={tamanios.icono + espaciado.xs}
          color={declaracion ? colores.verdeTexto : colores.tinta}
        />
        <View style={estilos.datos}>
          <Text style={estilos.textoDeclaracion}>{DECLARACION}</Text>
          <Text style={estilos.texto}>
            {aceptada ? `Aceptada el ${formatearFecha(expediente.declaracionJuradaEn ?? '')}.` : 'Obligatoria para cargar documentos.'}
          </Text>
        </View>
      </Pressable>

      {DNI.map(({ tipo, nombre }) => {
        const cargado = expediente.documentos.find((d) => d.tipo === tipo);
        return (
          <Card key={tipo} variante="blanca">
            {miniatura(cargado)}
            <View style={estilos.datos}>
              <Text style={estilos.nombre}>{nombre}</Text>
              {cargado ? (
                <Etiqueta texto={`Cargado el ${formatearFecha(cargado.creadoEn)}`} tono="exito" icono="checkmark" />
              ) : (
                <Etiqueta texto="Falta cargarlo" tono="advertencia" />
              )}
              {subiendo === tipo ? (
                <ActivityIndicator color={colores.verde} style={estilos.subiendo} />
              ) : (
                <Button
                  etiqueta={cargado ? 'Reemplazar' : 'Elegir foto'}
                  variante="contorno"
                  tamanio="chico"
                  icono="camera-outline"
                  ancho="contenido"
                  onPress={() => elegirYSubir(tipo)}
                  deshabilitado={bloqueado}
                />
              )}
            </View>
          </Card>
        );
      })}

      <Card variante="blanca">
        <View style={estilos.datos}>
          <View style={estilos.filaProgreso}>
            <Text style={estilos.nombre}>
              Certificaciones ({certificaciones.length} de {MAXIMO_DE_CERTIFICACIONES})
            </Text>
          </View>
          <Text style={estilos.texto}>Opcionales, salvo que tu rubro requiera matrícula (por ejemplo, Gas).</Text>
          {certificaciones.map((c, i) => (
            <View key={c.uuid} style={estilos.certificacion}>
              {miniatura(c)}
              <Text style={estilos.texto}>
                Certificación {i + 1} · {formatearFecha(c.creadoEn)}
              </Text>
            </View>
          ))}
          {subiendo === 'CERTIFICACION' ? (
            <ActivityIndicator color={colores.verde} style={estilos.subiendo} />
          ) : (
            certificaciones.length < MAXIMO_DE_CERTIFICACIONES && (
              <Button
                etiqueta="Agregar certificación"
                variante="contorno"
                tamanio="chico"
                icono="add"
                ancho="contenido"
                onPress={() => elegirYSubir('CERTIFICACION')}
                deshabilitado={bloqueado}
              />
            )
          )}
        </View>
      </Card>

      {!declaracion && <Text style={estilos.aviso}>Aceptá la declaración jurada para poder cargar tus documentos.</Text>}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { padding: espaciado.l, gap: espaciado.m, backgroundColor: colores.fondo, flexGrow: 1 },
  centro: { flex: 1, justifyContent: 'center', backgroundColor: colores.fondo },
  texto: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
  aviso: { ...tipografia.cuerpo, color: colores.advertencia },
  seccion: { ...tipografia.seccion, color: colores.tinta },
  filaProgreso: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: espaciado.s },
  pista: { height: espaciado.s, borderRadius: radios.pill, backgroundColor: colores.bordeSuave, overflow: 'hidden' },
  relleno: { height: '100%', backgroundColor: colores.verde, borderRadius: radios.pill },
  declaracion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.m,
    padding: espaciado.m,
    borderRadius: radios.tarjeta,
    borderWidth: bordes.fino,
    borderColor: colores.borde,
    backgroundColor: colores.blanco,
  },
  declaracionAceptada: { borderColor: colores.verdeTexto, backgroundColor: colores.verdeClaro },
  textoDeclaracion: { ...tipografia.cuerpo, fontWeight: '700', color: colores.tinta },
  datos: { flex: 1, gap: espaciado.s, alignItems: 'flex-start' },
  nombre: { ...tipografia.seccion, color: colores.tinta },
  miniatura: { width: tamanios.miniatura, height: tamanios.miniatura, borderRadius: radios.input, alignSelf: 'flex-start' },
  sinFoto: { backgroundColor: colores.fondo, alignItems: 'center', justifyContent: 'center' },
  certificacion: { flexDirection: 'row', alignItems: 'center', gap: espaciado.m },
  subiendo: { alignSelf: 'flex-start' },
});
