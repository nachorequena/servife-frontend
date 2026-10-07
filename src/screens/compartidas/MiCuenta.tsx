import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../../api/errores';
import { actualizarMiUsuario, cambiarContrasenia, type EstadoValidacion } from '../../api/identidad';
import { Avatar, Button, CerrarSesion, Input } from '../../components';
import { useSesion } from '../../store/sesion';
import { colores, espaciado, tipografia } from '../../theme';

const REGLA_DE_CONTRASENIA = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;
const MENSAJE_DE_CONTRASENIA = 'mínimo 8 caracteres, con al menos una letra y un número';
const MENSAJE_DE_RED = 'No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.';
const FORMATO_DE_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const CAMPOS_DE_PERFIL = ['nombreApellido', 'telefono', 'direccion', 'fecNacimiento'];
const CAMPOS_DE_CLAVE = ['contraseniaActual', 'contraseniaNueva'];

const ETIQUETA_DE_ESTADO: Record<EstadoValidacion, string> = {
  PENDIENTE: 'Pendiente',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
};

/** Resultado de un envío: error del backend, fallo de red o nada. */
interface Fallo {
  api: ApiError | null;
  red: boolean;
}

const SIN_FALLO: Fallo = { api: null, red: false };

function comoFallo(e: unknown): Fallo {
  return e instanceof ApiError ? { api: e, red: false } : { api: null, red: true };
}

/** Mensaje del backend que no corresponde a ningún campo del formulario. */
function mensajeGeneral(fallo: Fallo, campos: string[]): string | undefined {
  const { api } = fallo;
  return api && !campos.some((campo) => api.errorDe(campo)) ? api.message : undefined;
}

/**
 * Mi cuenta (provisoria hasta D10) · CU03 · A4 (datos de la sesión), A6 (editar datos) y A7 (cambiar
 * contraseña). El gestor solo edita el nombre. Incluye "Cerrar sesión".
 */
export function MiCuenta() {
  const { sesion, actualizarUsuario } = useSesion();
  const usuario = sesion?.usuario;
  const [nombre, setNombre] = useState(usuario?.nombreApellido ?? '');
  const [telefono, setTelefono] = useState(usuario?.telefono ?? '');
  const [direccion, setDireccion] = useState(usuario?.direccion ?? '');
  const [fecha, setFecha] = useState(usuario?.fecNacimiento ?? '');
  const [errorDeFecha, setErrorDeFecha] = useState<string>();
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [falloDePerfil, setFalloDePerfil] = useState<Fallo>(SIN_FALLO);

  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const [errorLocal, setErrorLocal] = useState<{ nueva?: string; repetir?: string }>({});
  const [cambiando, setCambiando] = useState(false);
  const [cambiada, setCambiada] = useState(false);
  const [falloDeClave, setFalloDeClave] = useState<Fallo>(SIN_FALLO);

  if (!usuario) {
    return null;
  }
  const esGestor = usuario.rol === 'GESTOR';

  async function guardar() {
    setGuardado(false);
    setFalloDePerfil(SIN_FALLO);
    const fechaLimpia = fecha.trim();
    if (!esGestor && fechaLimpia !== '' && !FORMATO_DE_FECHA.test(fechaLimpia)) {
      setErrorDeFecha('Usá el formato AAAA-MM-DD');
      return;
    }
    setErrorDeFecha(undefined);
    const cuerpo = esGestor
      ? { nombreApellido: nombre }
      : {
          nombreApellido: nombre,
          telefono: telefono.trim() === '' ? null : telefono.trim(),
          direccion: direccion.trim() === '' ? null : direccion.trim(),
          fecNacimiento: fechaLimpia === '' ? null : fechaLimpia,
        };
    setGuardando(true);
    try {
      actualizarUsuario(await actualizarMiUsuario(cuerpo));
      setGuardado(true);
    } catch (e) {
      setFalloDePerfil(comoFallo(e));
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarClave() {
    setCambiada(false);
    setFalloDeClave(SIN_FALLO);
    const local: typeof errorLocal = {};
    if (!REGLA_DE_CONTRASENIA.test(nueva)) local.nueva = MENSAJE_DE_CONTRASENIA;
    if (nueva !== repetir) local.repetir = 'No coinciden';
    setErrorLocal(local);
    if (Object.keys(local).length > 0) return;

    setCambiando(true);
    try {
      await cambiarContrasenia({ contraseniaActual: actual, contraseniaNueva: nueva });
      setActual('');
      setNueva('');
      setRepetir('');
      setCambiada(true);
    } catch (e) {
      setFalloDeClave(comoFallo(e));
    } finally {
      setCambiando(false);
    }
  }

  const errorDePerfil = (campo: string) => falloDePerfil.api?.errorDe(campo);
  const generalDePerfil = mensajeGeneral(falloDePerfil, CAMPOS_DE_PERFIL);
  const generalDeClave = mensajeGeneral(falloDeClave, CAMPOS_DE_CLAVE);

  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.aviso}>Pantalla provisoria: sin diseño en la maqueta (D10).</Text>
      <Text style={estilos.titulo}>Mi cuenta</Text>
      <View style={estilos.cabecera}>
        <Avatar nombre={usuario.nombreApellido} />
        <View style={estilos.datos}>
          <Text style={estilos.nombre}>{usuario.nombreApellido}</Text>
          <Text style={estilos.secundario}>{usuario.email}</Text>
          {usuario.rol === 'PRESTADOR' && usuario.estadoValidacion !== null && (
            <Text style={estilos.secundario}>
              Estado de validación: {ETIQUETA_DE_ESTADO[usuario.estadoValidacion]}
            </Text>
          )}
        </View>
      </View>

      <Input
        etiqueta="Nombre y apellido"
        value={nombre}
        onChangeText={setNombre}
        error={errorDePerfil('nombreApellido')}
      />
      {!esGestor && (
        <>
          <Input
            etiqueta="Teléfono"
            value={telefono}
            onChangeText={setTelefono}
            keyboardType="phone-pad"
            error={errorDePerfil('telefono')}
          />
          <Input
            etiqueta="Dirección"
            value={direccion}
            onChangeText={setDireccion}
            error={errorDePerfil('direccion')}
          />
          <Input
            etiqueta="Fecha de nacimiento"
            value={fecha}
            onChangeText={setFecha}
            placeholder="AAAA-MM-DD"
            autoCapitalize="none"
            autoCorrect={false}
            error={errorDeFecha ?? errorDePerfil('fecNacimiento')}
          />
        </>
      )}
      <Button etiqueta="Guardar cambios" onPress={guardar} deshabilitado={guardando} />
      {guardado && <Text style={estilos.mensaje}>Datos guardados.</Text>}
      {generalDePerfil !== undefined && <Text style={estilos.mensaje}>{generalDePerfil}</Text>}
      {falloDePerfil.red && <Text style={estilos.mensaje}>{MENSAJE_DE_RED}</Text>}

      <Text style={estilos.seccion}>Cambiar contraseña</Text>
      <Input
        etiqueta="Contraseña actual"
        value={actual}
        onChangeText={setActual}
        secureTextEntry
        autoCapitalize="none"
        error={falloDeClave.api?.errorDe('contraseniaActual')}
      />
      <Input
        etiqueta="Contraseña nueva"
        value={nueva}
        onChangeText={setNueva}
        secureTextEntry
        autoCapitalize="none"
        error={errorLocal.nueva ?? falloDeClave.api?.errorDe('contraseniaNueva')}
      />
      <Input
        etiqueta="Repetir contraseña"
        value={repetir}
        onChangeText={setRepetir}
        secureTextEntry
        autoCapitalize="none"
        error={errorLocal.repetir}
      />
      <Button etiqueta="Cambiar contraseña" onPress={cambiarClave} deshabilitado={cambiando} />
      {cambiada && <Text style={estilos.mensaje}>Contraseña actualizada.</Text>}
      {generalDeClave !== undefined && <Text style={estilos.mensaje}>{generalDeClave}</Text>}
      {falloDeClave.red && <Text style={estilos.mensaje}>{MENSAJE_DE_RED}</Text>}

      <View style={estilos.cierre}>
        <CerrarSesion />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { padding: espaciado.l },
  aviso: { ...tipografia.cuerpo, color: colores.tintaSecundaria, marginBottom: espaciado.s },
  titulo: { ...tipografia.titulo, color: colores.tinta, marginBottom: espaciado.m },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: espaciado.m, marginBottom: espaciado.l },
  datos: { flex: 1 },
  nombre: { ...tipografia.seccion, color: colores.tinta },
  secundario: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
  seccion: { ...tipografia.seccion, color: colores.tinta, marginTop: espaciado.l, marginBottom: espaciado.m },
  mensaje: { ...tipografia.cuerpo, color: colores.tinta, marginTop: espaciado.m },
  cierre: { marginTop: espaciado.l },
});
