import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { ApiError } from '../../api/errores';
import { confirmarRecuperacion, recuperarContrasenia } from '../../api/identidad';
import { Button, Input } from '../../components';
import type { AccesoParams } from '../../navigation/tipos';
import { colores, espaciado, tipografia } from '../../theme';

type Props = NativeStackScreenProps<AccesoParams, 'Restablecer'>;

const REGLA_DE_CONTRASENIA = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;
const MENSAJE_DE_CONTRASENIA = 'mínimo 8 caracteres, con al menos una letra y un número';
const MENSAJE_DE_RED = 'No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.';
const CAMPOS_CONOCIDOS = ['email', 'codigo', 'contraseniaNueva'];

/**
 * Recuperar contraseña, paso 2 · CU02 · A9 (y A8 para reenviar). Valida código de 6 dígitos y
 * contraseña antes de enviar; CODIGO_INVALIDO se muestra bajo "Código".
 */
export function RestablecerScreen({ navigation, route }: Props) {
  const { email } = route.params;
  const [codigo, setCodigo] = useState('');
  const [contrasenia, setContrasenia] = useState('');
  const [repetir, setRepetir] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<{ codigo?: string; contrasenia?: string; repetir?: string }>({});
  const [error, setError] = useState<ApiError | null>(null);
  const [falloDeRed, setFalloDeRed] = useState(false);
  const [reenviado, setReenviado] = useState(false);

  function limpiarMensajes() {
    setError(null);
    setFalloDeRed(false);
    setReenviado(false);
  }

  function registrarFallo(e: unknown) {
    if (e instanceof ApiError) {
      setError(e);
    } else {
      setFalloDeRed(true);
    }
  }

  async function cambiarContrasenia() {
    const local: typeof errorLocal = {};
    if (!/^\d{6}$/.test(codigo)) local.codigo = 'El código tiene 6 dígitos.';
    if (!REGLA_DE_CONTRASENIA.test(contrasenia)) local.contrasenia = MENSAJE_DE_CONTRASENIA;
    if (contrasenia !== repetir) local.repetir = 'No coinciden';
    setErrorLocal(local);
    limpiarMensajes();
    if (Object.keys(local).length > 0) return;

    setEnviando(true);
    try {
      await confirmarRecuperacion({ email, codigo, contraseniaNueva: contrasenia });
      navigation.navigate('Ingresar', { aviso: 'Contraseña actualizada. Ingresá de nuevo.' });
    } catch (e) {
      registrarFallo(e);
    } finally {
      setEnviando(false);
    }
  }

  async function reenviarCodigo() {
    limpiarMensajes();
    try {
      await recuperarContrasenia({ email });
      setReenviado(true);
    } catch (e) {
      registrarFallo(e);
    }
  }

  const codigoInvalido = error?.codigo === 'CODIGO_INVALIDO';
  const errorDeCodigo = errorLocal.codigo ?? (codigoInvalido ? error.message : error?.errorDe('codigo'));
  const mensajeGeneral =
    error && !codigoInvalido && !CAMPOS_CONOCIDOS.some((campo) => error.errorDe(campo)) ? error.message : undefined;

  return (
    <ScrollView contentContainerStyle={estilos.contenedor} keyboardShouldPersistTaps="handled">
      <Text style={estilos.titulo}>Nueva contraseña</Text>
      <Text style={estilos.texto}>Te mandamos un código de 6 dígitos a tu correo. Vence en 15 minutos.</Text>
      <Text style={estilos.correo}>{email}</Text>
      {error?.errorDe('email') !== undefined && <Text style={estilos.mensaje}>{error.errorDe('email')}</Text>}
      <Input
        etiqueta="Código"
        value={codigo}
        onChangeText={setCodigo}
        keyboardType="number-pad"
        maxLength={6}
        autoCorrect={false}
        error={errorDeCodigo}
      />
      <Input
        etiqueta="Contraseña nueva"
        value={contrasenia}
        onChangeText={setContrasenia}
        secureTextEntry
        autoCapitalize="none"
        error={errorLocal.contrasenia ?? error?.errorDe('contraseniaNueva')}
      />
      <Input
        etiqueta="Repetir contraseña"
        value={repetir}
        onChangeText={setRepetir}
        secureTextEntry
        autoCapitalize="none"
        error={errorLocal.repetir}
      />
      <Button etiqueta="Cambiar contraseña" onPress={cambiarContrasenia} deshabilitado={enviando} />
      <Button etiqueta="Reenviar código" variante="terciario" onPress={reenviarCodigo} />
      {reenviado && <Text style={estilos.mensaje}>Te mandamos un código nuevo.</Text>}
      {mensajeGeneral !== undefined && <Text style={estilos.mensaje}>{mensajeGeneral}</Text>}
      {falloDeRed && <Text style={estilos.mensaje}>{MENSAJE_DE_RED}</Text>}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flexGrow: 1, backgroundColor: colores.fondo, padding: espaciado.l },
  titulo: { ...tipografia.titulo, color: colores.tinta, marginBottom: espaciado.s },
  texto: { ...tipografia.cuerpo, color: colores.tintaSecundaria, marginBottom: espaciado.s },
  correo: { ...tipografia.seccion, color: colores.tinta, marginBottom: espaciado.l },
  mensaje: { ...tipografia.cuerpo, color: colores.tinta, marginTop: espaciado.m },
});
