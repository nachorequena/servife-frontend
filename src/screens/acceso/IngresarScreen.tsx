import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { ApiError } from '../../api/errores';
import { Button, Input } from '../../components';
import type { AccesoParams } from '../../navigation/tipos';
import { useSesion } from '../../store/sesion';
import { colores, espaciado, tipografia } from '../../theme';
import { MENSAJE_DE_RED } from '../../utils/errores';

type Props = NativeStackScreenProps<AccesoParams, 'Ingresar'>;

/**
 * Inicio de sesión · CU02 · A2, A4. Único login para los tres roles: el rol viaja en la cuenta.
 * Los errores de campo (400) van bajo cada Input; credenciales inválidas o cuenta suspendida, bajo el botón.
 */
export function IngresarScreen({ navigation, route }: Props) {
  const { ingresar } = useSesion();
  const [email, setEmail] = useState('');
  const [contrasenia, setContrasenia] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [falloDeRed, setFalloDeRed] = useState(false);

  async function continuar() {
    setEnviando(true);
    setError(null);
    setFalloDeRed(false);
    try {
      await ingresar(email, contrasenia);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e);
      } else {
        setFalloDeRed(true);
      }
      setEnviando(false);
    }
  }

  const mensajeGeneral =
    error && !error.errorDe('email') && !error.errorDe('contrasenia') ? error.message : undefined;

  return (
    <ScrollView contentContainerStyle={estilos.contenedor} keyboardShouldPersistTaps="handled">
      {route.params?.aviso !== undefined && <Text style={estilos.aviso}>{route.params.aviso}</Text>}
      <Text style={estilos.titulo}>Inicio de sesión</Text>
      <Text style={estilos.texto}>Ingresá tu correo y tu contraseña</Text>
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
        error={error?.errorDe('contrasenia')}
      />
      <Button etiqueta="Continuar" onPress={continuar} deshabilitado={enviando} />
      {mensajeGeneral !== undefined && <Text style={estilos.mensaje}>{mensajeGeneral}</Text>}
      {falloDeRed && <Text style={estilos.mensaje}>{MENSAJE_DE_RED}</Text>}
      <Text style={estilos.enlace} accessibilityRole="link" onPress={() => navigation.navigate('Recuperar')}>
        ¿Olvidaste tu contraseña?
      </Text>
      <Text
        style={estilos.enlace}
        accessibilityRole="link"
        onPress={() => navigation.navigate('Registro', { rol: route.params?.rol ?? 'CLIENTE' })}
      >
        ¿No tenés cuenta? Registrate
      </Text>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flexGrow: 1, backgroundColor: colores.fondo, padding: espaciado.l },
  aviso: { ...tipografia.cuerpo, color: colores.tinta, marginBottom: espaciado.m },
  titulo: { ...tipografia.titulo, color: colores.tinta, marginBottom: espaciado.s },
  texto: { ...tipografia.cuerpo, color: colores.tintaSecundaria, marginBottom: espaciado.l },
  mensaje: { ...tipografia.cuerpo, color: colores.tinta, marginTop: espaciado.m },
  enlace: { ...tipografia.cuerpo, color: colores.tintaSecundaria, textAlign: 'center', paddingVertical: espaciado.m },
});
