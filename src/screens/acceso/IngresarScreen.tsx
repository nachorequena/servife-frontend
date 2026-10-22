import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '../../api/errores';
import { correoConHuella, guardarConHuella, huellaDisponible, leerConHuella, olvidarHuella } from '../../api/huella';
import { Button, Input, Logo } from '../../components';
import type { AccesoParams } from '../../navigation/tipos';
import { useSesion, type Rol } from '../../store/sesion';
import { colores, espaciado, tipografia } from '../../theme';
import { MENSAJE_DE_RED } from '../../utils/errores';

type Props = NativeStackScreenProps<AccesoParams, 'Ingresar'>;

/** Credenciales que funcionaron pero tienen cuenta de cliente y de prestador: falta elegir con cuál (D43). */
interface Eleccion {
  correo: string;
  clave: string;
  deHuella: boolean;
}

/**
 * Inicio de sesión · CU02 · A2, A4. Es la primera pantalla de la app: un único login para los tres
 * roles, que lleva a la navegación del rol de la cuenta. Si el email tiene cuenta de cliente y de
 * prestador, pregunta con cuál ingresar (409 ELEGIR_ROL, D43).
 * Los errores de campo (400) van bajo cada Input; credenciales inválidas o cuenta suspendida, bajo el botón.
 * Si la sesión se cerró porque el gestor suspendió la cuenta, muestra el aviso arriba.
 * Si el teléfono lo permite, ofrece ingresar con huella (api/huella.ts): sin cambios en el backend,
 * la huella solo libera las credenciales guardadas y se hace el mismo A2.
 */
export function IngresarScreen({ navigation, route }: Props) {
  const { top } = useSafeAreaInsets();
  const { ingresar, avisoDeCierre } = useSesion();
  const [email, setEmail] = useState('');
  const [contrasenia, setContrasenia] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [falloDeRed, setFalloDeRed] = useState(false);
  const [avisoDeHuella, setAvisoDeHuella] = useState<string | null>(null);
  const [huellaOfrecida, setHuellaOfrecida] = useState(false);
  const [correoGuardado, setCorreoGuardado] = useState<string | null>(null);
  const [activarHuella, setActivarHuella] = useState(false);
  const [eleccion, setEleccion] = useState<Eleccion | null>(null);

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

  /**
   * Devuelve el rol de la cuenta si ingresó. Si no, deja el motivo en pantalla (con texto propio si venía
   * de la huella), o la elección de rol si el email tiene dos cuentas.
   */
  async function entrar(correo: string, clave: string, deHuella: boolean, rol?: Rol): Promise<Rol | null> {
    setEnviando(true);
    setError(null);
    setFalloDeRed(false);
    setAvisoDeHuella(null);
    try {
      return await (rol ? ingresar(correo, clave, rol) : ingresar(correo, clave));
    } catch (e) {
      if (e instanceof ApiError && e.codigo === 'ELEGIR_ROL') {
        setEleccion({ correo, clave, deHuella });
      } else if (deHuella && e instanceof ApiError && e.status === 401) {
        await olvidarHuella();
        setCorreoGuardado(null);
        setEleccion(null);
        setAvisoDeHuella('Tu contraseña cambió. Ingresá con correo y contraseña para volver a activar la huella.');
      } else if (e instanceof ApiError) {
        setError(e);
      } else {
        setFalloDeRed(true);
      }
      setEnviando(false);
      return null;
    }
  }

  /** Primero se valida con el backend: solo se guardan credenciales que funcionan. */
  async function guardarHuellaSiCorresponde(rolReal: Rol | null, correo: string, clave: string, deHuella: boolean) {
    // Un ingreso exitoso cambia de navegador y desmonta esta pantalla, pero la función sigue viva (no toca
    // el estado después) y el diálogo de huella aparece sobre la pantalla siguiente.
    if (rolReal !== null && !deHuella && activarHuella) {
      await guardarConHuella(correo, clave);
    }
  }

  async function continuar() {
    setEleccion(null);
    const rolReal = await entrar(email, contrasenia, false);
    await guardarHuellaSiCorresponde(rolReal, email, contrasenia, false);
  }

  async function elegir(rol: Rol) {
    if (eleccion === null) return;
    const { correo, clave, deHuella } = eleccion;
    const rolReal = await entrar(correo, clave, deHuella, rol);
    await guardarHuellaSiCorresponde(rolReal, correo, clave, deHuella);
  }

  async function continuarConHuella() {
    setEleccion(null);
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

  // Si cambian el correo o la contraseña, la elección pendiente ya no corresponde.
  function cambiarEmail(texto: string) {
    setEmail(texto);
    setEleccion(null);
  }

  function cambiarContrasenia(texto: string) {
    setContrasenia(texto);
    setEleccion(null);
  }

  const mensajeGeneral =
    error && !error.errorDe('email') && !error.errorDe('contrasenia') ? error.message : undefined;
  const aviso = route.params?.aviso ?? avisoDeCierre ?? undefined;

  return (
    <View style={estilos.pantalla}>
      <View testID="barra-logo" style={[estilos.barra, { paddingTop: top + espaciado.s }]}>
        <Logo />
      </View>
      <ScrollView contentContainerStyle={estilos.contenedor} keyboardShouldPersistTaps="handled">
        {aviso !== undefined && <Text style={estilos.aviso}>{aviso}</Text>}
        <Text style={estilos.titulo}>Inicio de sesión</Text>
        <Text style={estilos.texto}>Ingresá tu correo y tu contraseña</Text>
        <Input
          etiqueta="Correo"
          value={email}
          onChangeText={cambiarEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          error={error?.errorDe('email')}
        />
        <Input
          etiqueta="Contraseña"
          value={contrasenia}
          onChangeText={cambiarContrasenia}
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
        {eleccion === null ? (
          <Button etiqueta="Continuar" onPress={continuar} deshabilitado={enviando} />
        ) : (
          <View style={estilos.eleccion}>
            <Text style={estilos.pregunta}>¿Cómo querés ingresar?</Text>
            <Text style={estilos.textoEleccion}>Tenés una cuenta de cliente y una de prestador.</Text>
            <Button etiqueta="Cliente" onPress={() => elegir('CLIENTE')} deshabilitado={enviando} />
            <Button
              etiqueta="Prestador"
              variante="terciario"
              onPress={() => elegir('PRESTADOR')}
              deshabilitado={enviando}
            />
          </View>
        )}
        {huellaOfrecida && correoGuardado !== null && eleccion === null && (
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
        <Text style={estilos.enlace} accessibilityRole="link" onPress={() => navigation.navigate('Registro')}>
          ¿No tenés cuenta? Registrate
        </Text>
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  barra: { backgroundColor: colores.verde, paddingHorizontal: espaciado.l, paddingBottom: espaciado.s },
  contenedor: { flexGrow: 1, padding: espaciado.l },
  aviso: { ...tipografia.cuerpo, color: colores.tinta, marginBottom: espaciado.m },
  titulo: { ...tipografia.titulo, color: colores.tinta, marginBottom: espaciado.s },
  texto: { ...tipografia.cuerpo, color: colores.tintaSecundaria, marginBottom: espaciado.l },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: espaciado.m },
  etiquetaFila: { ...tipografia.cuerpo, color: colores.tinta, flex: 1 },
  eleccion: { gap: espaciado.m },
  pregunta: { ...tipografia.seccion, color: colores.tinta, textAlign: 'center' },
  textoEleccion: { ...tipografia.cuerpo, color: colores.tintaSecundaria, textAlign: 'center' },
  huella: { marginTop: espaciado.m },
  textoHuella: { ...tipografia.cuerpo, color: colores.tintaSecundaria, textAlign: 'center', marginTop: espaciado.s },
  mensaje: { ...tipografia.cuerpo, color: colores.tinta, marginTop: espaciado.m },
  enlace: { ...tipografia.cuerpo, color: colores.tintaSecundaria, textAlign: 'center', paddingVertical: espaciado.m },
});
