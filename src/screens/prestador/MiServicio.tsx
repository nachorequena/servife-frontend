import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  actualizarMiPerfilDePrestador,
  listarTiposServicio,
  obtenerMiPerfilDeServicio,
  type ActualizarPerfilDeServicio,
  type EstadoValidacion,
  type TipoServicio,
} from '../../api/catalogo';
import { obtenerDisponibilidad, reemplazarMiDisponibilidad } from '../../api/disponibilidad';
import { ApiError } from '../../api/errores';
import { Button, Chip, Input } from '../../components';
import { obtenerUbicacionActual, type Coordenadas } from '../../hooks/useUbicacion';
import { useSesion } from '../../store/sesion';
import { colores, espaciado, tipografia } from '../../theme';
import { MENSAJE_DE_RED } from '../../utils/errores';

const MENSAJE_DE_CARGA = 'No pudimos cargar tu servicio. Revisá tu conexión e intentá de nuevo.';
const MENSAJE_DE_RADIO = 'tiene que ser un número entre 1 y 100';
const CAMPOS = ['idTipoServicio', 'zona', 'lat', 'lng', 'radioKm', 'descripcion', 'dias'];

const TEXTO_DE_ESTADO: Record<EstadoValidacion, string> = {
  PENDIENTE: 'Tu perfil está en revisión. Todavía no aparecés en las búsquedas.',
  APROBADO: 'Perfil aprobado. Aparecés en las búsquedas.',
  RECHAZADO: 'Tu perfil fue rechazado. Si cambiás el servicio que ofrecés, vuelve a revisión.',
};

/** 1 = lunes … 7 = domingo. */
const DIAS = [
  { numero: 1, letra: 'L', nombre: 'Lunes' },
  { numero: 2, letra: 'M', nombre: 'Martes' },
  { numero: 3, letra: 'M', nombre: 'Miércoles' },
  { numero: 4, letra: 'J', nombre: 'Jueves' },
  { numero: 5, letra: 'V', nombre: 'Viernes' },
  { numero: 6, letra: 'S', nombre: 'Sábado' },
  { numero: 7, letra: 'D', nombre: 'Domingo' },
];

/**
 * Mi servicio (provisoria hasta D10) · CU03 · B7 (perfil de servicio) y B8 (disponibilidad).
 * Los documentos (E7) llegan en el Sprint 5.
 */
export function MiServicio() {
  const { sesion } = useSesion();
  const uuid = sesion?.usuario.uuid;
  const [tipos, setTipos] = useState<TipoServicio[]>([]);
  const [cargado, setCargado] = useState(false);
  const [falloDeCarga, setFalloDeCarga] = useState(false);
  const [idOriginal, setIdOriginal] = useState<string>();
  const [idTipo, setIdTipo] = useState<string>();
  const [estado, setEstado] = useState<EstadoValidacion>();
  const [zona, setZona] = useState('');
  const [ubicacion, setUbicacion] = useState<Coordenadas | null>(null);
  const [falloDeUbicacion, setFalloDeUbicacion] = useState(false);
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false);
  const [radio, setRadio] = useState('');
  const [errorDeRadio, setErrorDeRadio] = useState<string>();
  const [descripcion, setDescripcion] = useState('');
  const [dias, setDias] = useState<number[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [api, setApi] = useState<ApiError | null>(null);
  const [red, setRed] = useState(false);

  // Se recarga al enfocar: así "en revisión" se actualiza cuando el gestor aprueba o rechaza.
  const cargar = useCallback(() => {
    if (!uuid) return;
    let vigente = true;
    Promise.all([listarTiposServicio(), obtenerMiPerfilDeServicio(), obtenerDisponibilidad(uuid)])
      .then(([listaDeTipos, perfil, disponibilidad]) => {
        if (!vigente) return;
        setTipos(listaDeTipos);
        setIdOriginal(perfil.idTipoServicio);
        setIdTipo(perfil.idTipoServicio);
        setEstado(perfil.estadoValidacion);
        setZona(perfil.zona ?? '');
        setUbicacion(perfil.lat !== null && perfil.lng !== null ? { lat: perfil.lat, lng: perfil.lng } : null);
        setRadio(perfil.radioKm === null ? '' : String(perfil.radioKm));
        setDescripcion(perfil.descripcion ?? '');
        setDias(disponibilidad.dias);
        setCargado(true);
        setFalloDeCarga(false);
      })
      .catch(() => {
        if (vigente) setFalloDeCarga(true);
      });
    return () => {
      vigente = false;
    };
  }, [uuid]);
  useFocusEffect(cargar);

  async function usarUbicacion() {
    setFalloDeUbicacion(false);
    setBuscandoUbicacion(true);
    const actual = await obtenerUbicacionActual();
    setBuscandoUbicacion(false);
    if (actual) setUbicacion(actual);
    else setFalloDeUbicacion(true);
  }

  function alternarDia(numero: number) {
    setDias((previos) => (previos.includes(numero) ? previos.filter((d) => d !== numero) : [...previos, numero].sort()));
  }

  async function guardar() {
    setGuardado(false);
    setApi(null);
    setRed(false);
    const radioLimpio = radio.trim();
    const radioNumero = Number(radioLimpio);
    if (radioLimpio !== '' && !(Number.isInteger(radioNumero) && radioNumero >= 1 && radioNumero <= 100)) {
      setErrorDeRadio(MENSAJE_DE_RADIO);
      return;
    }
    setErrorDeRadio(undefined);
    if (idTipo === undefined) return;

    const cuerpo: ActualizarPerfilDeServicio = { idTipoServicio: idTipo };
    if (zona.trim() !== '') cuerpo.zona = zona.trim();
    if (ubicacion) {
      cuerpo.lat = ubicacion.lat;
      cuerpo.lng = ubicacion.lng;
    }
    if (radioLimpio !== '') cuerpo.radioKm = radioNumero;
    if (descripcion.trim() !== '') cuerpo.descripcion = descripcion.trim();

    setGuardando(true);
    try {
      const perfil = await actualizarMiPerfilDePrestador(cuerpo);
      setEstado(perfil.estadoValidacion);
      setIdOriginal(perfil.idTipoServicio);
      await reemplazarMiDisponibilidad(dias);
      setGuardado(true);
    } catch (e) {
      if (e instanceof ApiError) setApi(e);
      else setRed(true);
    } finally {
      setGuardando(false);
    }
  }

  if (falloDeCarga) {
    return (
      <View style={estilos.contenedor}>
        <Text style={estilos.mensaje}>{MENSAJE_DE_CARGA}</Text>
      </View>
    );
  }
  if (!cargado) return null;

  const error = (campo: string) => api?.errorDe(campo);
  const general = api && !CAMPOS.some((campo) => api.errorDe(campo)) ? api.message : undefined;
  const cambiaDeRubro = idOriginal !== undefined && idTipo !== idOriginal;

  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.aviso}>Pantalla provisoria: sin diseño en la maqueta (D10).</Text>
      <Text style={estilos.titulo}>Mi servicio</Text>
      {estado !== undefined && <Text style={estilos.estado}>{TEXTO_DE_ESTADO[estado]}</Text>}

      <Text style={estilos.seccion}>Servicio que ofrecés</Text>
      <View style={estilos.fila}>
        {tipos.map((tipo) => (
          <Chip key={tipo.uuid} etiqueta={tipo.nombre} seleccionado={tipo.uuid === idTipo} onPress={() => setIdTipo(tipo.uuid)} />
        ))}
      </View>
      {cambiaDeRubro && <Text style={estilos.mensaje}>Si cambiás el servicio, tu perfil vuelve a revisión.</Text>}
      {error('idTipoServicio') !== undefined && <Text style={estilos.mensaje}>{error('idTipoServicio')}</Text>}

      <View style={estilos.campo}>
        <Input etiqueta="Zona" value={zona} onChangeText={setZona} error={error('zona')} />
      </View>

      <Button etiqueta="Usar mi ubicación actual" variante="terciario" onPress={usarUbicacion} deshabilitado={buscandoUbicacion} />
      <Text style={estilos.ayuda}>Guardamos un punto aproximado (~1 km) para cuidar tu privacidad.</Text>
      {ubicacion && <Text style={estilos.mensaje}>Ubicación guardada</Text>}
      {falloDeUbicacion && <Text style={estilos.mensaje}>No pudimos obtener tu ubicación.</Text>}
      {(error('lat') ?? error('lng')) !== undefined && <Text style={estilos.mensaje}>{error('lat') ?? error('lng')}</Text>}

      <View style={estilos.campo}>
        <Input
          etiqueta="Radio en km"
          value={radio}
          onChangeText={setRadio}
          keyboardType="number-pad"
          error={errorDeRadio ?? error('radioKm')}
        />
      </View>
      <Input
        etiqueta="Descripción"
        value={descripcion}
        onChangeText={setDescripcion}
        multiline
        error={error('descripcion')}
      />

      <Text style={estilos.seccion}>Días que atendés</Text>
      <View style={estilos.fila}>
        {DIAS.map((dia) => (
          <Chip
            key={dia.numero}
            etiqueta={dia.letra}
            descripcion={dia.nombre}
            seleccionado={dias.includes(dia.numero)}
            onPress={() => alternarDia(dia.numero)}
          />
        ))}
      </View>
      {error('dias') !== undefined && <Text style={estilos.mensaje}>{error('dias')}</Text>}

      <View style={estilos.campo}>
        <Button etiqueta="Guardar" onPress={guardar} deshabilitado={guardando} />
      </View>
      {guardado && <Text style={estilos.mensaje}>Datos guardados.</Text>}
      {general !== undefined && <Text style={estilos.mensaje}>{general}</Text>}
      {red && <Text style={estilos.mensaje}>{MENSAJE_DE_RED}</Text>}
      {/* E7 (documentos del prestador) llega en el Sprint 5. */}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { padding: espaciado.l },
  aviso: { ...tipografia.cuerpo, color: colores.tintaSecundaria, marginBottom: espaciado.s },
  titulo: { ...tipografia.titulo, color: colores.tinta, marginBottom: espaciado.m },
  estado: { ...tipografia.cuerpo, color: colores.tinta, marginBottom: espaciado.m },
  seccion: { ...tipografia.seccion, color: colores.tinta, marginBottom: espaciado.s },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.s, marginBottom: espaciado.m },
  campo: { marginTop: espaciado.m },
  mensaje: { ...tipografia.cuerpo, color: colores.tinta, marginTop: espaciado.s },
  ayuda: { ...tipografia.cuerpo, color: colores.tintaSecundaria, marginTop: espaciado.xs },
});
