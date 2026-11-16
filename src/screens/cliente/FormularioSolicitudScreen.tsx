import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { listarMisDirecciones, principalDe, type DireccionGuardada } from '../../api/direcciones';
import { obtenerDisponibilidad } from '../../api/disponibilidad';
import { ApiError } from '../../api/errores';
import { crearSolicitud } from '../../api/solicitudes';
import {
  AdjuntosDeImagenes,
  Button,
  HojaInferior,
  Input,
  Logo,
  SelectorDeFecha,
  SelectorDeHora,
} from '../../components';
import { CampoDeSeleccion } from '../../components/CampoDeSeleccion';
import { useAdjuntosDeImagenes } from '../../hooks/useAdjuntosDeImagenes';
import type { ClienteStackParams } from '../../navigation/tipos';
import { useSesion } from '../../store/sesion';
import { bordes, colores, espaciado, tamanios, tipografia } from '../../theme';
import { mensajeDe } from '../../utils/errores';
import { diaDeSemana, hoyEnArgentina, nombresDeDias } from '../../utils/formato';

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
  if (fecha === '') return 'Elegí una fecha.';
  if (fecha < hoyEnArgentina()) return 'Tiene que ser hoy o una fecha futura.';
  if (!dias.includes(diaDeSemana(fecha))) return 'Ese día el prestador no trabaja.';
  return undefined;
}

/** Opción del desplegable para escribir una dirección que no está guardada. */
const OTRA_DIRECCION = 'otra';

/**
 * CU06 · Solicitar servicio (C1, D7, C5). Sin botón de chat (D03). La dirección viene precargada con la
 * principal del cliente; si tiene dos o más guardadas (A10) se elige de un desplegable, con "Otra dirección…"
 * para escribir una a mano. A C1 siempre viaja el texto: la solicitud guarda la foto del momento.
 */
export function FormularioSolicitudScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ClienteStackParams>>();
  const { uuidPrestador } = useRoute<RouteProp<ClienteStackParams, 'FormularioSolicitud'>>().params;
  const { sesion } = useSesion();

  const [disponibilidad, setDisponibilidad] = useState<Dias>({ tipo: 'cargando' });
  const [intento, setIntento] = useState(0);
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [direccion, setDireccion] = useState(sesion?.usuario.direccion ?? '');
  // Direcciones guardadas (A10): con dos o más se elige de un desplegable; "Otra" habilita escribir una.
  const [guardadas, setGuardadas] = useState<DireccionGuardada[]>([]);
  const [elegida, setElegida] = useState<string | typeof OTRA_DIRECCION | null>(null);
  const [eligiendo, setEligiendo] = useState(false);
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

  useEffect(() => {
    let vigente = true;
    listarMisDirecciones()
      .then((lista) => {
        if (!vigente) return;
        setGuardadas(lista);
        const principal = principalDe(lista);
        if (principal) {
          setElegida(principal.uuid);
          setDireccion(principal.direccion);
        }
      })
      // Sin la lista se usa la dirección de la sesión en el campo de texto, como antes.
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, []);

  const conDesplegable = guardadas.length >= 2;
  const escribeOtra = !conDesplegable || elegida === OTRA_DIRECCION;
  const opcionElegida = guardadas.find((d) => d.uuid === elegida);

  function elegir(opcion: DireccionGuardada | typeof OTRA_DIRECCION) {
    setEligiendo(false);
    setErrores((e) => (e.direccion === undefined ? e : { ...e, direccion: undefined }));
    if (opcion === OTRA_DIRECCION) {
      setElegida(OTRA_DIRECCION);
      setDireccion('');
    } else {
      setElegida(opcion.uuid);
      setDireccion(opcion.direccion);
    }
  }

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

        <SelectorDeFecha
          etiqueta="Fecha deseada"
          value={fecha}
          onChange={editar('fecha', setFecha)}
          minimo={hoyEnArgentina()}
          error={errores.fecha}
        />
        {ayudaDeFecha !== undefined && <Text style={estilos.ayuda}>{ayudaDeFecha}</Text>}
        {disponibilidad.tipo === 'error' && (
          <View style={estilos.reintento}>
            <Button etiqueta="Reintentar" variante="secundario" onPress={() => setIntento((n) => n + 1)} />
          </View>
        )}

        <SelectorDeHora etiqueta="Hora preferida" value={hora} onChange={editar('hora', setHora)} error={errores.hora} />
        {conDesplegable && (
          <CampoDeSeleccion
            etiqueta="Dirección"
            valor={
              opcionElegida ? `${opcionElegida.alias} · ${opcionElegida.direccion}` : elegida === OTRA_DIRECCION ? 'Otra dirección' : ''
            }
            placeholder="Elegí una dirección"
            onPress={() => setEligiendo(true)}
            error={escribeOtra ? undefined : errores.direccion}
          />
        )}
        {escribeOtra && (
          <Input
            etiqueta={conDesplegable ? 'Otra dirección' : 'Dirección'}
            value={direccion}
            onChangeText={editar('direccion', setDireccion)}
            error={errores.direccion}
          />
        )}
        {conDesplegable && (
          <HojaInferior visible={eligiendo} alCerrar={() => setEligiendo(false)} titulo="¿Dónde es el trabajo?">
            {guardadas.map((d) => (
              <OpcionDeDireccion
                key={d.uuid}
                titulo={d.principal ? `${d.alias} (principal)` : d.alias}
                detalle={d.direccion}
                elegida={elegida === d.uuid}
                onPress={() => elegir(d)}
              />
            ))}
            <OpcionDeDireccion
              titulo="Otra dirección…"
              detalle="Escribila a mano para este pedido"
              elegida={elegida === OTRA_DIRECCION}
              onPress={() => elegir(OTRA_DIRECCION)}
            />
          </HojaInferior>
        )}
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

interface PropsDeOpcion {
  titulo: string;
  detalle: string;
  elegida: boolean;
  onPress: () => void;
}

/** Una fila del desplegable de direcciones: alias arriba, dirección abajo y un tilde si es la elegida. */
function OpcionDeDireccion({ titulo, detalle, elegida, onPress }: PropsDeOpcion) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={`${titulo}: ${detalle}`}
      accessibilityState={{ checked: elegida }}
      onPress={onPress}
      style={estilos.opcion}
    >
      <View style={estilos.textosOpcion}>
        <Text style={estilos.tituloOpcion}>{titulo}</Text>
        <Text style={estilos.ayudaOpcion}>{detalle}</Text>
      </View>
      {elegida && <Ionicons name="checkmark" size={tamanios.icono} color={colores.verdeTexto} />}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.s,
    paddingVertical: espaciado.s,
    borderBottomWidth: bordes.fino,
    borderBottomColor: colores.bordeSuave,
    minHeight: tamanios.celdaIcono,
  },
  textosOpcion: { flex: 1 },
  tituloOpcion: { ...tipografia.cuerpo, fontWeight: '700', color: colores.tinta },
  ayudaOpcion: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
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
