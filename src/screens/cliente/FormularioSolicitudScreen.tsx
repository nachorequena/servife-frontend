import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { obtenerDisponibilidad } from '../../api/disponibilidad';
import { ApiError } from '../../api/errores';
import { crearSolicitud } from '../../api/solicitudes';
import { AdjuntosDeImagenes, Button, Input, Logo } from '../../components';
import { useAdjuntosDeImagenes } from '../../hooks/useAdjuntosDeImagenes';
import type { ClienteStackParams } from '../../navigation/tipos';
import { useSesion } from '../../store/sesion';
import { colores, espaciado, tipografia } from '../../theme';
import { mensajeDe } from '../../utils/errores';
import { diaDeSemana, esFechaReal, hoyEnArgentina, nombresDeDias } from '../../utils/formato';

interface Errores {
  fecha?: string;
  hora?: string;
  direccion?: string;
  descripcion?: string;
  imagenes?: string;
  general?: string;
}

type Dias = { tipo: 'cargando' } | { tipo: 'listo'; dias: number[] } | { tipo: 'error'; mensaje: string };

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
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);
  const enCurso = useRef(false);
  const imagenes = useAdjuntosDeImagenes((mensaje) => setErrores((e) => ({ ...e, imagenes: mensaje })));

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

  /** Edita un campo y limpia su error. */
  const editar = (campo: keyof Errores, poner: (valor: string) => void) => (valor: string) => {
    poner(valor);
    setErrores((e) => (e[campo] === undefined ? e : { ...e, [campo]: undefined }));
  };

  const dias = disponibilidad.tipo === 'listo' ? disponibilidad.dias : [];
  const sinDias = disponibilidad.tipo === 'listo' && dias.length === 0;
  const puedeEnviar = disponibilidad.tipo === 'listo' && !sinDias && !imagenes.subiendo && !enviando;

  async function enviar() {
    if (enCurso.current || imagenes.subiendo) return;
    const locales: Errores = {
      fecha: validarFecha(fecha.trim(), dias),
      direccion: direccion.trim() === '' ? 'Es obligatoria.' : undefined,
      descripcion: descripcion.trim() === '' ? 'Es obligatoria.' : undefined,
      imagenes: imagenes.conError ? 'Reintentá o quitá las imágenes que no se subieron.' : undefined,
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
        ...(imagenes.adjuntos.length > 0 && { imagenIds: imagenes.uuidsListos }),
      });
      navigation.popTo('Tabs', { screen: 'Historial', params: { aviso: 'Solicitud enviada.' } });
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
          onChangeText={editar('fecha', setFecha)}
          placeholder={hoyEnArgentina()}
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
          onChangeText={editar('hora', setHora)}
          placeholder="Ej.: a la mañana"
          error={errores.hora}
        />
        <Input
          etiqueta="Dirección"
          value={direccion}
          onChangeText={editar('direccion', setDireccion)}
          error={errores.direccion}
        />
        <Input
          etiqueta="Descripción del trabajo"
          value={descripcion}
          onChangeText={editar('descripcion', setDescripcion)}
          multiline
          textAlignVertical="top"
          numberOfLines={4}
          error={errores.descripcion}
        />

        <AdjuntosDeImagenes
          adjuntos={imagenes}
          etiqueta="Adjuntar imágenes"
          error={errores.imagenes}
          deshabilitado={enviando}
        />

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
  error: { ...tipografia.cuerpo, color: colores.tinta, marginBottom: espaciado.m },
  botones: { gap: espaciado.s },
});
