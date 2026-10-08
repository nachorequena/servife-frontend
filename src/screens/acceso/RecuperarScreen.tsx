import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { ApiError } from '../../api/errores';
import { recuperarContrasenia } from '../../api/identidad';
import { Button, Input } from '../../components';
import type { AccesoParams } from '../../navigation/tipos';
import { colores, espaciado, tipografia } from '../../theme';

type Props = NativeStackScreenProps<AccesoParams, 'Recuperar'>;

const MENSAJE_DE_RED = 'No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.';

/**
 * Recuperar contraseña, paso 1 · CU02 · A8. Pide el correo y siempre avanza a Restablecer:
 * el backend responde 204 exista o no la cuenta, así que la app no revela nada.
 */
export function RecuperarScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [falloDeRed, setFalloDeRed] = useState(false);

  async function enviarCodigo() {
    setEnviando(true);
    setError(null);
    setFalloDeRed(false);
    try {
      await recuperarContrasenia({ email });
      navigation.navigate('Restablecer', { email });
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

  const mensajeGeneral = error && !error.errorDe('email') ? error.message : undefined;

  return (
    <ScrollView contentContainerStyle={estilos.contenedor} keyboardShouldPersistTaps="handled">
      <Text style={estilos.titulo}>Recuperar contraseña</Text>
      <Text style={estilos.texto}>Te mandamos un código de 6 dígitos a tu correo. Vence en 15 minutos.</Text>
      <Input
        etiqueta="Correo"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        error={error?.errorDe('email')}
      />
      <Button etiqueta="Enviar código" onPress={enviarCodigo} deshabilitado={enviando} />
      {mensajeGeneral !== undefined && <Text style={estilos.mensaje}>{mensajeGeneral}</Text>}
      {falloDeRed && <Text style={estilos.mensaje}>{MENSAJE_DE_RED}</Text>}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flexGrow: 1, backgroundColor: colores.fondo, padding: espaciado.l },
  titulo: { ...tipografia.titulo, color: colores.tinta, marginBottom: espaciado.s },
  texto: { ...tipografia.cuerpo, color: colores.tintaSecundaria, marginBottom: espaciado.l },
  mensaje: { ...tipografia.cuerpo, color: colores.tinta, marginTop: espaciado.m },
});
