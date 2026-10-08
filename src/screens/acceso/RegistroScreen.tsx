import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { listarTiposServicio, type TipoServicio } from '../../api/catalogo';
import { ApiError } from '../../api/errores';
import { registrar, type RolRegistrable } from '../../api/identidad';
import { Button, Input } from '../../components';
import type { AccesoParams } from '../../navigation/tipos';
import { colores, espaciado, tipografia } from '../../theme';
import { MENSAJE_DE_RED } from '../../utils/errores';

type Props = NativeStackScreenProps<AccesoParams, 'Registro'>;

const REGLA_DE_CONTRASENIA = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;
const MENSAJE_DE_CONTRASENIA = 'mínimo 8 caracteres, con al menos una letra y un número';
const MENSAJE_DE_TIPOS = 'No pudimos cargar los servicios. Probá de nuevo.';
const AVISOS: Record<RolRegistrable, string> = {
  CLIENTE: 'Cuenta creada. Ingresá con tu correo.',
  PRESTADOR: 'Cuenta creada. Un gestor va a validar tu perfil.',
};

/**
 * Registro de cliente o prestador · CU01 · A1, B1. Una sola pantalla con selector de rol;
 * el prestador elige además el tipo de servicio (lista de B1). Valida contraseña y tipo antes de enviar.
 */
export function RegistroScreen({ navigation, route }: Props) {
  const [rol, setRol] = useState<RolRegistrable>(route.params?.rol ?? 'CLIENTE');
  const [nombreApellido, setNombreApellido] = useState('');
  const [email, setEmail] = useState('');
  const [contrasenia, setContrasenia] = useState('');
  const [repetir, setRepetir] = useState('');
  const [tipos, setTipos] = useState<TipoServicio[]>([]);
  const [falloDeTipos, setFalloDeTipos] = useState(false);
  const [idTipoServicio, setIdTipoServicio] = useState<string | undefined>();
  const [enviando, setEnviando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<{ contrasenia?: string; repetir?: string; tipo?: string }>({});
  const [error, setError] = useState<ApiError | null>(null);
  const [falloDeRed, setFalloDeRed] = useState(false);

  useEffect(() => {
    if (rol !== 'PRESTADOR') return;
    let vigente = true;
    setFalloDeTipos(false);
    listarTiposServicio()
      .then((lista) => vigente && setTipos(lista))
      .catch(() => vigente && setFalloDeTipos(true));
    return () => {
      vigente = false;
    };
  }, [rol]);

  async function crearCuenta() {
    const local: typeof errorLocal = {};
    if (!REGLA_DE_CONTRASENIA.test(contrasenia)) local.contrasenia = MENSAJE_DE_CONTRASENIA;
    if (contrasenia !== repetir) local.repetir = 'No coinciden';
    if (rol === 'PRESTADOR' && idTipoServicio === undefined) local.tipo = 'Elegí el servicio que ofrecés.';
    setErrorLocal(local);
    setError(null);
    setFalloDeRed(false);
    if (Object.keys(local).length > 0) return;

    setEnviando(true);
    try {
      await registrar({
        rol,
        nombreApellido,
        email,
        contrasenia,
        ...(rol === 'PRESTADOR' ? { idTipoServicio } : {}),
      });
      navigation.popTo('Ingresar', { aviso: AVISOS[rol] });
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e);
      } else {
        setFalloDeRed(true);
      }
    } finally {
      setEnviando(false);
    }
  }

  const camposConocidos = ['nombreApellido', 'email', 'contrasenia', 'idTipoServicio'];
  const mensajeGeneral =
    error && !camposConocidos.some((campo) => error.errorDe(campo)) ? error.message : undefined;

  return (
    <ScrollView contentContainerStyle={estilos.contenedor} keyboardShouldPersistTaps="handled">
      <Text style={estilos.titulo}>Registrate</Text>
      <View style={estilos.selector}>
        <Button
          etiqueta="Cliente"
          variante={rol === 'CLIENTE' ? 'primario' : 'terciario'}
          onPress={() => setRol('CLIENTE')}
        />
        <Button
          etiqueta="Prestador"
          variante={rol === 'PRESTADOR' ? 'primario' : 'terciario'}
          onPress={() => setRol('PRESTADOR')}
        />
      </View>
      <Input
        etiqueta="Nombre y apellido"
        value={nombreApellido}
        onChangeText={setNombreApellido}
        error={error?.errorDe('nombreApellido')}
      />
      <Input
        etiqueta="Correo"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        error={error?.errorDe('email')}
      />
      <Input
        etiqueta="Contraseña"
        value={contrasenia}
        onChangeText={setContrasenia}
        secureTextEntry
        autoCapitalize="none"
        error={errorLocal.contrasenia ?? error?.errorDe('contrasenia')}
      />
      <Input
        etiqueta="Repetir contraseña"
        value={repetir}
        onChangeText={setRepetir}
        secureTextEntry
        autoCapitalize="none"
        error={errorLocal.repetir}
      />
      {rol === 'PRESTADOR' && (
        <View style={estilos.servicios}>
          <Text style={estilos.subtitulo}>Servicio que ofrecés</Text>
          {tipos.map((tipo) => (
            <Button
              key={tipo.uuid}
              etiqueta={tipo.nombre}
              variante={idTipoServicio === tipo.uuid ? 'primario' : 'terciario'}
              onPress={() => setIdTipoServicio(tipo.uuid)}
            />
          ))}
          {falloDeTipos && <Text style={estilos.mensaje}>{MENSAJE_DE_TIPOS}</Text>}
          {(errorLocal.tipo ?? error?.errorDe('idTipoServicio')) !== undefined && (
            <Text style={estilos.mensaje}>{errorLocal.tipo ?? error?.errorDe('idTipoServicio')}</Text>
          )}
        </View>
      )}
      <Button etiqueta="Crear cuenta" onPress={crearCuenta} deshabilitado={enviando} />
      {mensajeGeneral !== undefined && <Text style={estilos.mensaje}>{mensajeGeneral}</Text>}
      {falloDeRed && <Text style={estilos.mensaje}>{MENSAJE_DE_RED}</Text>}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flexGrow: 1, backgroundColor: colores.fondo, padding: espaciado.l },
  titulo: { ...tipografia.titulo, color: colores.tinta, marginBottom: espaciado.l },
  selector: { gap: espaciado.s, marginBottom: espaciado.l },
  servicios: { gap: espaciado.s, marginBottom: espaciado.l },
  subtitulo: { ...tipografia.seccion, color: colores.tinta },
  mensaje: { ...tipografia.cuerpo, color: colores.tinta, marginTop: espaciado.m },
});
