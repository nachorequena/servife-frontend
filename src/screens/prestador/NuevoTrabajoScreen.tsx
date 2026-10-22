import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../../api/errores';
import { actualizarPublicacion, crearPublicacion, type DatosDePublicacion } from '../../api/reputacion';
import { listarMisSolicitudes, type SolicitudEnLista } from '../../api/solicitudes';
import { AdjuntosDeImagenes, Button, Chip, Input, SelectorDeFecha } from '../../components';
import { useAdjuntosDeImagenes } from '../../hooks/useAdjuntosDeImagenes';
import type { PrestadorStackParams } from '../../navigation/tipos';
import { colores, espaciado, tipografia } from '../../theme';
import { mensajeDe } from '../../utils/errores';
import { formatearFechaSola } from '../../utils/formato';

/** Las 50 terminadas más recientes (el máximo de una página): alcanza para elegir con qué solicitud vincular. */
const SOLICITUDES_A_OFRECER = 50;
const LARGO_DESCRIPCION_EN_OPCION = 30;

/** Cliente, fecha y comienzo de la descripción: distingue dos solicitudes del mismo cliente y el mismo día. */
function etiquetaDeSolicitud(s: SolicitudEnLista): string {
  const caracteres = Array.from(s.descripcion); // por caracteres, no por unidades UTF-16: un emoji no queda partido
  const descripcion =
    caracteres.length > LARGO_DESCRIPCION_EN_OPCION
      ? `${caracteres.slice(0, LARGO_DESCRIPCION_EN_OPCION).join('').trimEnd()}…`
      : s.descripcion;
  return `${s.contraparte.nombreApellido} · ${formatearFechaSola(s.fechaDeseada)} · ${descripcion}`;
}

interface Errores {
  titulo?: string;
  descripcion?: string;
  fecha?: string;
  solicitud?: string;
  imagenes?: string;
  general?: string;
}

type Terminadas = { tipo: 'cargando' } | { tipo: 'listo'; solicitudes: SolicitudEnLista[] } | { tipo: 'error'; mensaje: string };

/**
 * CU10 · Publicar un trabajo (D4) o editarlo (D5, si llega publicacion por la ruta). Puede vincular una solicitud
 * propia FINALIZADA o VALORADA (D07): entonces la tarjeta muestra la valoración de esa solicitud.
 */
export function NuevoTrabajoScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<PrestadorStackParams>>();
  const existente = useRoute<RouteProp<PrestadorStackParams, 'NuevoTrabajo'>>().params?.publicacion;

  const [titulo, setTitulo] = useState(existente?.titulo ?? '');
  const [descripcion, setDescripcion] = useState(existente?.descripcion ?? '');
  const [fecha, setFecha] = useState(existente?.fechaTrabajo ?? '');
  const [uuidSolicitud, setUuidSolicitud] = useState<string | null>(existente?.uuidSolicitud ?? null);
  const [terminadas, setTerminadas] = useState<Terminadas>({ tipo: 'cargando' });
  const [intento, setIntento] = useState(0);
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);
  const enCurso = useRef(false);
  /** Fecha que se precargó al elegir una solicitud: si el prestador no la cambió, elegir otra la reemplaza. */
  const precargada = useRef<string | null>(null);
  const imagenes = useAdjuntosDeImagenes(
    (mensaje) => setErrores((e) => ({ ...e, imagenes: mensaje })),
    existente?.imagenIds,
  );

  useLayoutEffect(() => {
    if (existente) navigation.setOptions({ title: 'Editar trabajo' });
  }, [navigation, existente]);

  useEffect(() => {
    let vigente = true;
    setTerminadas({ tipo: 'cargando' });
    listarMisSolicitudes({ estados: ['FINALIZADA', 'VALORADA'], page: 0, size: SOLICITUDES_A_OFRECER })
      .then((pagina) => vigente && setTerminadas({ tipo: 'listo', solicitudes: pagina.contenido }))
      .catch((e) => vigente && setTerminadas({ tipo: 'error', mensaje: mensajeDe(e) }));
    return () => {
      vigente = false;
    };
  }, [intento]);

  /** Edita un campo y limpia su error. */
  const editar = (campo: keyof Errores, poner: (valor: string) => void) => (valor: string) => {
    poner(valor);
    setErrores((e) => (e[campo] === undefined ? e : { ...e, [campo]: undefined }));
  };

  const elegirSolicitud = (s: SolicitudEnLista | null) => {
    setUuidSolicitud(s?.uuid ?? null);
    setErrores((e) => ({ ...e, solicitud: undefined }));
    if (s !== null && (fecha.trim() === '' || fecha === precargada.current)) {
      setFecha(s.fechaDeseada);
      precargada.current = s.fechaDeseada;
    }
  };

  async function enviar() {
    if (enCurso.current || imagenes.subiendo) return;
    const locales: Errores = {
      titulo: titulo.trim() === '' ? 'Es obligatorio.' : undefined,
      imagenes: imagenes.conError ? 'Reintentá o quitá las imágenes que no se subieron.' : undefined,
    };
    setErrores(locales);
    if (Object.values(locales).some((m) => m !== undefined)) return;

    const cuerpo: DatosDePublicacion = {
      titulo: titulo.trim(),
      ...(descripcion.trim() !== '' && { descripcion: descripcion.trim() }),
      ...(fecha.trim() !== '' && { fechaTrabajo: fecha.trim() }),
      ...(uuidSolicitud !== null && { uuidSolicitud }),
      imagenIds: imagenes.uuidsListos,
    };
    enCurso.current = true;
    setEnviando(true);
    try {
      if (existente) {
        const actualizada = await actualizarPublicacion(existente.uuid, cuerpo);
        navigation.popTo('DetalleTrabajo', { publicacion: actualizada });
      } else {
        await crearPublicacion(cuerpo);
        navigation.goBack(); // la lista se recarga al volver
      }
    } catch (e) {
      if (e instanceof ApiError) {
        const deCampo = {
          titulo: e.errorDe('titulo'),
          descripcion: e.errorDe('descripcion'),
          fecha: e.errorDe('fechaTrabajo'),
          solicitud: e.errorDe('uuidSolicitud'),
          imagenes: e.errorDe('imagenIds'),
        };
        const mapeados = ['titulo', 'descripcion', 'fechaTrabajo', 'uuidSolicitud', 'imagenIds'];
        const sinMapear = e.errores.some((x) => !mapeados.includes(x.campo));
        const sinCampo = Object.values(deCampo).every((m) => m === undefined);
        setErrores({ ...deCampo, general: sinCampo || sinMapear ? e.message : undefined });
      } else {
        setErrores({ general: mensajeDe(e) });
      }
      enCurso.current = false;
      setEnviando(false);
    }
  }

  const solicitudes = terminadas.tipo === 'listo' ? terminadas.solicitudes : [];
  const vinculadaFueraDeLaLista = uuidSolicitud !== null && !solicitudes.some((s) => s.uuid === uuidSolicitud);

  return (
    <KeyboardAvoidingView style={estilos.pantalla} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={estilos.contenedor} keyboardShouldPersistTaps="handled">
        <Input
          etiqueta="Título"
          value={titulo}
          onChangeText={editar('titulo', setTitulo)}
          placeholder="Ej.: Cambio de cañería del baño"
          maxLength={120}
          error={errores.titulo}
        />
        <Input
          etiqueta="Descripción"
          value={descripcion}
          onChangeText={editar('descripcion', setDescripcion)}
          multiline
          textAlignVertical="top"
          numberOfLines={4}
          maxLength={2000}
          error={errores.descripcion}
        />

        <Text style={estilos.etiqueta}>Solicitud (opcional)</Text>
        <Text style={estilos.ayuda}>Si la vinculás, el trabajo muestra la valoración que te dejó el cliente.</Text>
        {terminadas.tipo === 'cargando' ? (
          <ActivityIndicator color={colores.verde} style={estilos.cargando} />
        ) : terminadas.tipo === 'error' ? (
          <View style={estilos.reintento}>
            <Text style={estilos.error}>{terminadas.mensaje}</Text>
            <Button etiqueta="Reintentar" variante="secundario" onPress={() => setIntento((n) => n + 1)} />
          </View>
        ) : (
          <View style={estilos.opciones}>
            <Chip etiqueta="Sin solicitud" seleccionado={uuidSolicitud === null} onPress={() => elegirSolicitud(null)} />
            {vinculadaFueraDeLaLista && <Chip etiqueta="Solicitud vinculada" seleccionado onPress={() => undefined} />}
            {solicitudes.map((s) => (
              <Chip
                key={s.uuid}
                etiqueta={etiquetaDeSolicitud(s)}
                seleccionado={uuidSolicitud === s.uuid}
                onPress={() => elegirSolicitud(s)}
              />
            ))}
          </View>
        )}
        {errores.solicitud !== undefined && <Text style={estilos.error}>{errores.solicitud}</Text>}

        <SelectorDeFecha
          etiqueta="Fecha del trabajo"
          value={fecha}
          onChange={editar('fecha', setFecha)}
          onQuitar={() => setFecha('')}
          error={errores.fecha}
        />

        <AdjuntosDeImagenes adjuntos={imagenes} etiqueta="Agregar fotos" error={errores.imagenes} deshabilitado={enviando} />

        {errores.general !== undefined && <Text style={estilos.error}>{errores.general}</Text>}
        <View style={estilos.botones}>
          <Button
            etiqueta={existente ? 'Guardar cambios' : 'Publicar'}
            onPress={enviar}
            deshabilitado={imagenes.subiendo || enviando}
          />
          <Button etiqueta="Cancelar" variante="terciario" onPress={() => navigation.goBack()} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenedor: { padding: espaciado.m, paddingBottom: espaciado.xl },
  etiqueta: { ...tipografia.cuerpo, color: colores.tinta, marginBottom: espaciado.xs },
  ayuda: { ...tipografia.cuerpo, color: colores.tintaSecundaria, marginBottom: espaciado.s },
  cargando: { marginBottom: espaciado.m },
  reintento: { marginBottom: espaciado.m, gap: espaciado.s },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.s, marginBottom: espaciado.m },
  error: { ...tipografia.cuerpo, color: colores.tinta, marginBottom: espaciado.m },
  botones: { gap: espaciado.s },
});
