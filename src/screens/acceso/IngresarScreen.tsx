import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { ApiError } from '../../api/errores';
import { correoConHuella, guardarConHuella, huellaDisponible, leerConHuella, olvidarHuella } from '../../api/huella';
import { Button, Input } from '../../components';
import type { AccesoParams } from '../../navigation/tipos';
import { useSesion } from '../../store/sesion';
import { colores, espaciado, tipografia } from '../../theme';
import { MENSAJE_DE_RED } from '../../utils/errores';

type Props = NativeStackScreenProps<AccesoParams, 'Ingresar'>;

/**
 * Inicio de sesión · CU02 · A2, A4. Único login para los tres roles: el rol viaja en la cuenta.
 * Los errores de campo (400) van bajo cada Input; credenciales inválidas o cuenta suspendida, bajo el botón.
 * Si el teléfono lo permite, ofrece ingresar con huella (api/huella.ts): sin cambios en el backend,
 * la huella solo libera las credenciales guardadas y se hace el mismo A2.
 */
export function IngresarScreen({ navigation, route }: Props) {
  const { ingresar } = useSesion();
  const [email, setEmail] = useState('');
  const [contrasenia, setContrasenia] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [falloDeRed, setFalloDeRed] = useState(false);
  const [avisoDeHuella, setAvisoDeHuella] = useState<string | null>(null);
  const [huellaOfrecida, setHuellaOfrecida] = useState(false);
  const [correoGuardado, setCorreoGuardado] = useState<string | null>(null);
  const [activarHuella, setActivarHuella] = useState(false);

  useEffect(() => {
    let vigente = true;
    async function consultar() {
      if (!(await huellaDisponible())) {
        return;
      }
      const correo = await correoConHuella();
      if (vigente) {
        setHuellaOfrecida(true);
        setCorreoGuardado(correo);
      }
    }
    void consultar();
    return () => {
      vigente = false;
    };
  }, []);

  /** Devuelve true si ingresó. Si no, deja el motivo en pantalla (con texto propio si venía de la huella). */
  async function entrar(correo: string, clave: string, deHuella: boolean): Promise<boolean> {
    setEnviando(true);
    setError(null);
    setFalloDeRed(false);
    setAvisoDeHuella(null);
    try {
      await ingresar(correo, clave);
      return true;
    } catch (e) {
      if (deHuella && e instanceof ApiError && e.status === 401) {
        await olvidarHuella();
        setCorreoGuardado(null);
        setAvisoDeHuella('Tu contraseña cambió. Ingresá con correo y contraseña para volver a activar la huella.');
      } else if (e instanceof ApiError) {
        setError(e);
      } else {
        setFalloDeRed(true);
      }
      setEnviando(false);
      return false;
    }
  }

  async function continuar() {
    // Primero se valida con el backend: solo se guardan credenciales que funcionan. Un ingreso exitoso
    // cambia de navegador y desmonta esta pantalla, pero la función sigue viva (no toca el estado después)
    // y el diálogo de huella aparece sobre la pantalla siguiente.
    if ((await entrar(email, contrasenia, false)) && activarHuella) {
      await guardarConHuella(email, contrasenia);
    }
  }

  async function continuarConHuella() {
    setEnviando(true);
    const lectura = await leerConHuella();
    if (lectura.estado === 'ok') {
      await entrar(lectura.correo, lectura.contrasenia, true);
      return;
    }
    if (lectura.estado === 'invalidada') {
      setCorreoGuardado(null);
      setAvisoDeHuella('La huella cambió en este teléfono. Ingresá con correo y contraseña para volver a activarla.');
    }
    setEnviando(false);
  }

  async function dejarDeUsarHuella() {
    await olvidarHuella();
    setCorreoGuardado(null);
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
      {huellaOfrecida && correoGuardado === null && (
        <View style={estilos.fila}>
          <Text style={estilos.etiquetaFila}>Usar mi huella para ingresar</Text>
          <Switch
            accessibilityLabel="Usar mi huella para ingresar"
            value={activarHuella}
            onValueChange={setActivarHuella}
            thumbColor={colores.blanco}
            trackColor={{ false: colores.tarjeta, true: colores.lila }}
          />
        </View>
      )}
      <Button etiqueta="Continuar" onPress={continuar} deshabilitado={enviando} />
      {huellaOfrecida && correoGuardado !== null && (
        <View style={estilos.huella}>
          <Button
            etiqueta="Ingresar con huella"
            variante="terciario"
            onPress={continuarConHuella}
            deshabilitado={enviando}
          />
          <Text style={estilos.textoHuella}>{`como ${correoGuardado}`}</Text>
          <Text style={estilos.enlace} accessibilityRole="link" onPress={dejarDeUsarHuella}>
            No usar más la huella
          </Text>
        </View>
      )}
      {mensajeGeneral !== undefined && <Text style={estilos.mensaje}>{mensajeGeneral}</Text>}
      {avisoDeHuella !== null && <Text style={estilos.mensaje}>{avisoDeHuella}</Text>}
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
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: espaciado.m },
  etiquetaFila: { ...tipografia.cuerpo, color: colores.tinta, flex: 1 },
  huella: { marginTop: espaciado.m },
  textoHuella: { ...tipografia.cuerpo, color: colores.tintaSecundaria, textAlign: 'center', marginTop: espaciado.s },
  mensaje: { ...tipografia.cuerpo, color: colores.tinta, marginTop: espaciado.m },
  enlace: { ...tipografia.cuerpo, color: colores.tintaSecundaria, textAlign: 'center', paddingVertical: espaciado.m },
});
