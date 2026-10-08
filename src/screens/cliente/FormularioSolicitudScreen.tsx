import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { subirImagen } from '../../api/archivos';
import { obtenerDisponibilidad } from '../../api/disponibilidad';
import { ApiError } from '../../api/errores';
import { crearSolicitud } from '../../api/solicitudes';
import { Button, Input, Logo } from '../../components';
import type { ClienteStackParams } from '../../navigation/tipos';
import { useSesion } from '../../store/sesion';
import { colores, espaciado, radios, tamanios, tipografia } from '../../theme';
import { mensajeDe } from '../../utils/errores';
import { diaDeSemana, hoyEnArgentina, nombresDeDias } from '../../utils/formato';

const MAXIMO_DE_IMAGENES = 5;
const MAXIMO_DE_BYTES = 5 * 1024 * 1024;

interface Adjunto {
  clave: number;
  uri: string;
  mime: string;
  nombre?: string;
  estado: 'subiendo' | 'lista' | 'error';
  uuid?: string;
}

interface Errores {
  fecha?: string;
  hora?: string;
  direccion?: string;
  descripcion?: string;
  imagenes?: string;
  general?: string;
}

type Dias = { tipo: 'cargando' } | { tipo: 'listo'; dias: number[] } | { tipo: 'error'; mensaje: string };

/** "AAAA-MM-DD" que además es una fecha real del calendario (descarta 2026-02-31). */
function esFechaReal(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const f = new Date(Date.UTC(anio, mes - 1, dia));
  return f.getUTCFullYear() === anio && f.getUTCMonth() === mes - 1 && f.getUTCDate() === dia;
}

function validarFecha(fecha: string, dias: number[]): string | undefined {
  if (!esFechaReal(fecha)) return 'Usá el formato AAAA-MM-DD';
  if (fecha < hoyEnArgentina()) return 'Tiene que ser hoy o una fecha futura.';
  if (!dias.includes(diaDeSemana(fecha))) return 'Ese día el prestador no trabaja.';
  return undefined;
}

/** CU06 · Solicitar servicio (C1, D7, C5). Sin botón de chat (D03). */
export function FormularioSolicitudScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ClienteStackParams>>();
  const { uuidPrestador } = useRoute<RouteProp<ClienteStackParams, 'FormularioSolicitud'>>().params;
  const { sesion } = useSesion();

  const [disponibilidad, setDisponibilidad] = useState<Dias>({ tipo: 'cargando' });
  const [intento, setIntento] = useState(0);
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [direccion, setDireccion] = useState(sesion?.usuario.direccion ?? '');
  const [descripcion, setDescripcion] = useState('');
  const [adjuntos, setAdjuntos] = useState<Adjunto[]>([]);
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);
  const clave = useRef(0);
  const enCurso = useRef(false);

  useEffect(() => {
    let vigente = true;
    setDisponibilidad({ tipo: 'cargando' });
    obtenerDisponibilidad(uuidPrestador)
      .then(({ dias }) => vigente && setDisponibilidad({ tipo: 'listo', dias }))
      .catch((e) => vigente && setDisponibilidad({ tipo: 'error', mensaje: mensajeDe(e) }));
    return () => {
      vigente = false;
    };
  }, [uuidPrestador, intento]);

  const cambiarAdjunto = useCallback((k: number, cambios: Partial<Adjunto>) => {
    setAdjuntos((actuales) => actuales.map((a) => (a.clave === k ? { ...a, ...cambios } : a)));
  }, []);

  const subir = useCallback(
    async (adjunto: Pick<Adjunto, 'clave' | 'uri' | 'mime' | 'nombre'>) => {
      cambiarAdjunto(adjunto.clave, { estado: 'subiendo' });
      try {
        const archivo = await subirImagen(adjunto.uri, adjunto.mime, adjunto.nombre);
        cambiarAdjunto(adjunto.clave, { estado: 'lista', uuid: archivo.uuid });
      } catch {
        cambiarAdjunto(adjunto.clave, { estado: 'error' });
      }
    },
    [cambiarAdjunto],
  );

  async function elegirImagen() {
    if (adjuntos.length >= MAXIMO_DE_IMAGENES) {
      setErrores((e) => ({ ...e, imagenes: `Podés adjuntar hasta ${MAXIMO_DE_IMAGENES} imágenes.` }));
      return;
    }
    let resultado: ImagePicker.ImagePickerResult;
    try {
      resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.6,
        allowsMultipleSelection: false,
      });
    } catch {
      setErrores((e) => ({ ...e, imagenes: 'No pudimos abrir tus fotos.' }));
      return;
    }
    const asset = resultado.canceled ? undefined : resultado.assets[0];
    if (!asset) return;
    if (asset.fileSize !== undefined && asset.fileSize > MAXIMO_DE_BYTES) {
      setErrores((e) => ({ ...e, imagenes: 'La imagen pesa más de 5 MB. Elegí otra.' }));
      return;
    }
    setErrores((e) => ({ ...e, imagenes: undefined }));
    const nuevo: Adjunto = {
      clave: ++clave.current,
      uri: asset.uri,
      mime: asset.mimeType ?? 'image/jpeg',
      nombre: asset.fileName ?? undefined,
      estado: 'subiendo',
    };
    setAdjuntos((actuales) => [...actuales, nuevo]);
    void subir(nuevo);
  }

  const quitar = (k: number) => {
    setAdjuntos((actuales) => actuales.filter((a) => a.clave !== k));
    setErrores((e) => ({ ...e, imagenes: undefined }));
  };

  const dias = disponibilidad.tipo === 'listo' ? disponibilidad.dias : [];
  const subiendo = adjuntos.some((a) => a.estado === 'subiendo');
  const sinDias = disponibilidad.tipo === 'listo' && dias.length === 0;
  const puedeEnviar = disponibilidad.tipo === 'listo' && !sinDias && !subiendo && !enviando;

  async function enviar() {
    if (enCurso.current || adjuntos.some((a) => a.estado === 'subiendo')) return;
    const locales: Errores = {
      fecha: validarFecha(fecha.trim(), dias),
      direccion: direccion.trim() === '' ? 'Es obligatoria.' : undefined,
      descripcion: descripcion.trim() === '' ? 'Es obligatoria.' : undefined,
      imagenes: adjuntos.some((a) => a.estado === 'error')
        ? 'Reintentá o quitá las imágenes que no se subieron.'
        : undefined,
    };
    setErrores(locales);
    if (Object.values(locales).some((m) => m !== undefined)) return;

    enCurso.current = true;
    setEnviando(true);
    try {
      await crearSolicitud({
        uuidPrestador,
        fechaDeseada: fecha.trim(),
        ...(hora.trim() !== '' && { horaPreferida: hora.trim() }),
        direccion: direccion.trim(),
        descripcion: descripcion.trim(),
        ...(adjuntos.length > 0 && { imagenIds: adjuntos.flatMap((a) => (a.estado === 'lista' && a.uuid ? [a.uuid] : [])) }),
      });
      navigation.navigate('Tabs', { screen: 'Historial', params: { aviso: 'Solicitud enviada.' } });
    } catch (e) {
      if (e instanceof ApiError) {
        const deCampo = {
          fecha: e.errorDe('fechaDeseada'),
          hora: e.errorDe('horaPreferida'),
          direccion: e.errorDe('direccion'),
          descripcion: e.errorDe('descripcion'),
          imagenes: e.errorDe('imagenIds'),
        };
        const mapeados = ['fechaDeseada', 'horaPreferida', 'direccion', 'descripcion', 'imagenIds'];
        const sinMapear = e.errores.some((x) => !mapeados.includes(x.campo));
        const sinCampo = Object.values(deCampo).every((m) => m === undefined);
        setErrores({
          ...deCampo,
          general: sinCampo || sinMapear ? (e.errorDe('uuidPrestador') ?? e.message) : undefined,
        });
      } else {
        setErrores({ general: mensajeDe(e) });
      }
      enCurso.current = false;
      setEnviando(false);
    }
  }

  const ayudaDeFecha =
    disponibilidad.tipo === 'listo'
      ? sinDias
        ? 'El prestador no cargó sus días.'
        : `Trabaja: ${nombresDeDias(dias)}`
      : disponibilidad.tipo === 'error'
        ? disponibilidad.mensaje
        : undefined;

  return (
    <KeyboardAvoidingView style={estilos.pantalla} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={estilos.contenedor} keyboardShouldPersistTaps="handled">
        <View style={estilos.logo}>
          <Logo />
        </View>
        <Text style={estilos.titulo}>Solicitar servicio</Text>

        <Input
          etiqueta="Fecha deseada (AAAA-MM-DD)"
          value={fecha}
          onChangeText={setFecha}
          placeholder="2026-09-18"
          keyboardType="numbers-and-punctuation"
          autoCorrect={false}
          error={errores.fecha}
        />
        {ayudaDeFecha !== undefined && <Text style={estilos.ayuda}>{ayudaDeFecha}</Text>}
        {disponibilidad.tipo === 'error' && (
          <View style={estilos.reintento}>
            <Button etiqueta="Reintentar" variante="secundario" onPress={() => setIntento((n) => n + 1)} />
          </View>
        )}

        <Input
          etiqueta="Hora preferida"
          value={hora}
          onChangeText={setHora}
          placeholder="Ej.: a la mañana"
          error={errores.hora}
        />
        <Input
          etiqueta="Dirección"
          value={direccion}
          onChangeText={setDireccion}
          error={errores.direccion}
        />
        <Input
          etiqueta="Descripción del trabajo"
          value={descripcion}
          onChangeText={setDescripcion}
          multiline
          textAlignVertical="top"
          numberOfLines={4}
          error={errores.descripcion}
        />

        <Pressable accessibilityRole="button" disabled={enviando} style={estilos.subida} onPress={elegirImagen}>
          <Text style={estilos.subidaTexto}>Adjuntar imágenes</Text>
          <Ionicons name="add-circle-outline" size={tamanios.icono} color={colores.tintaSecundaria} />
        </Pressable>
        {errores.imagenes !== undefined && <Text style={estilos.error}>{errores.imagenes}</Text>}

        {adjuntos.length > 0 && (
          <View style={estilos.miniaturas}>
            {adjuntos.map((a, i) => (
              <View key={a.clave} style={estilos.miniatura}>
                <Image
                  source={{ uri: a.uri }}
                  style={estilos.imagen}
                  accessibilityLabel={`Imagen ${i + 1}`}
                  accessibilityIgnoresInvertColors
                />
                <Text style={estilos.estadoImagen}>
                  {a.estado === 'subiendo' ? 'Subiendo…' : a.estado === 'lista' ? 'Lista' : 'No se subió'}
                </Text>
                <View style={estilos.accionesImagen}>
                  {a.estado === 'error' && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Reintentar imagen ${i + 1}`}
                      disabled={enviando}
                      onPress={() => subir(a)}
                    >
                      <Text style={estilos.enlace}>Reintentar</Text>
                    </Pressable>
                  )}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Quitar imagen ${i + 1}`}
                    disabled={enviando}
                    onPress={() => quitar(a.clave)}
                  >
                    <Text style={estilos.enlace}>Quitar</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {errores.general !== undefined && <Text style={estilos.error}>{errores.general}</Text>}
        <View style={estilos.botones}>
          <Button etiqueta="Enviar solicitud" onPress={enviar} deshabilitado={!puedeEnviar} />
          <Button etiqueta="Cancelar" variante="terciario" onPress={() => navigation.goBack()} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenedor: { padding: espaciado.m, paddingBottom: espaciado.xl },
  logo: { alignItems: 'center', paddingTop: espaciado.l },
  titulo: {
    ...tipografia.seccion,
    color: colores.verde,
    textAlign: 'center',
    marginTop: espaciado.m,
    marginBottom: espaciado.l,
  },
  ayuda: { ...tipografia.cuerpo, color: colores.tintaSecundaria, marginTop: -espaciado.s, marginBottom: espaciado.m },
  reintento: { marginBottom: espaciado.m },
  subida: {
    backgroundColor: colores.tarjeta,
    borderRadius: radios.input,
    padding: espaciado.l,
    alignItems: 'center',
    marginBottom: espaciado.m,
  },
  subidaTexto: { ...tipografia.cuerpo, color: colores.tintaSecundaria, marginBottom: espaciado.xs },
  miniaturas: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.s, marginBottom: espaciado.m },
  miniatura: { width: tamanios.miniatura, alignItems: 'center' },
  imagen: { width: tamanios.miniatura, height: tamanios.miniatura, borderRadius: radios.input },
  estadoImagen: { ...tipografia.globo, color: colores.tintaSecundaria, marginTop: espaciado.xs },
  accionesImagen: { flexDirection: 'row', gap: espaciado.s },
  enlace: { ...tipografia.cuerpo, color: colores.verdeOscuro, fontWeight: '700' },
  error: { ...tipografia.cuerpo, color: colores.tinta, marginBottom: espaciado.m },
  botones: { gap: espaciado.s },
});
