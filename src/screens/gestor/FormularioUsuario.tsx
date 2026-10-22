import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '../../api/errores';
import { actualizarUsuario, crearGestor } from '../../api/gestion';
import { Button, Input, useAvisoFlotante } from '../../components';
import type { GestorStackParams } from '../../navigation/tipos';
import { bordes, colores, espaciado, radios, tamanios, tipografia } from '../../theme';
import { MENSAJE_DE_RED } from '../../utils/errores';

const CAMPOS = ['nombreApellido', 'email', 'telefono', 'contrasenia'];

/** Límites del backend (CrearGestorRequest y ActualizarUsuarioAdminRequest). */
const MAXIMO_NOMBRE = 120;
const MAXIMO_EMAIL = 254;
const MAXIMO_TELEFONO = 30;
const MAXIMO_CONTRASENIA = 72;

/** La regla de contraseña de A1 (Contrasenias.REGLA en el backend), para mostrarla mientras se escribe. */
const REGLAS: { texto: string; cumple: (c: string) => boolean }[] = [
  { texto: 'Al menos 8 caracteres', cumple: (c) => c.length >= 8 },
  { texto: 'Una letra', cumple: (c) => /[A-Za-z]/.test(c) },
  { texto: 'Un número', cumple: (c) => /\d/.test(c) },
];

/**
 * Alta de un gestor (CU15, E13: la única vía, D06) y edición de cualquier usuario (CU17, E14: nombre,
 * email y teléfono; los gestores no tienen teléfono). Provisoria: sin maqueta (D10). Los datos actuales
 * llegan por la ruta desde Usuarios. Al guardar avisa con un aviso flotante y vuelve a la lista.
 */
export function FormularioUsuario() {
  const navigation = useNavigation<NativeStackNavigationProp<GestorStackParams>>();
  const { params } = useRoute<NativeStackScreenProps<GestorStackParams, 'FormularioUsuario'>['route']>();
  const { bottom } = useSafeAreaInsets();
  const { mostrar } = useAvisoFlotante();
  const usuario = params?.usuario;
  const [nombre, setNombre] = useState(usuario?.nombreApellido ?? '');
  const [email, setEmail] = useState(usuario?.email ?? '');
  const [telefono, setTelefono] = useState(usuario?.telefono ?? '');
  const [contrasenia, setContrasenia] = useState('');
  const [errorLocal, setErrorLocal] = useState<Record<string, string>>({});
  const [fallo, setFallo] = useState<{ api: ApiError | null; red: boolean }>({ api: null, red: false });
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    setFallo({ api: null, red: false });
    const local: Record<string, string> = {};
    if (nombre.trim() === '') local.nombreApellido = 'Ingresá el nombre';
    if (email.trim() === '') local.email = 'Ingresá el email';
    if (usuario === undefined && contrasenia === '') local.contrasenia = 'Ingresá una contraseña';
    setErrorLocal(local);
    if (Object.keys(local).length > 0) return;

    setGuardando(true);
    try {
      if (usuario === undefined) {
        await crearGestor({ nombreApellido: nombre.trim(), email: email.trim(), contrasenia });
        mostrar(`${nombre.trim()} ya puede ingresar como gestor.`);
      } else {
        const tel = telefono.trim();
        await actualizarUsuario(usuario.uuid, {
          nombreApellido: nombre.trim(),
          email: email.trim(),
          ...(usuario.rol !== 'GESTOR' && tel !== '' ? { telefono: tel } : {}),
        });
        mostrar('Cambios guardados.');
      }
      navigation.goBack();
    } catch (e) {
      setFallo(e instanceof ApiError ? { api: e, red: false } : { api: null, red: true });
    } finally {
      setGuardando(false);
    }
  }

  const { api } = fallo;
  const general = api && !CAMPOS.some((campo) => api.errorDe(campo)) ? api.message : undefined;
  const error = (campo: string) => errorLocal[campo] ?? api?.errorDe(campo);

  return (
    <View style={estilos.pantalla}>
      <ScrollView contentContainerStyle={estilos.contenedor} keyboardShouldPersistTaps="handled">
        {usuario === undefined && (
          <View style={estilos.info}>
            <Ionicons name="information-circle-outline" size={tamanios.icono} color={colores.lilaTexto} />
            <Text style={estilos.textoInfo}>
              Los clientes y prestadores se registran desde la app; acá solo se dan de alta gestores.
            </Text>
          </View>
        )}
        <Input
          etiqueta="Nombre y apellido"
          icono="person-outline"
          value={nombre}
          onChangeText={setNombre}
          maxLength={MAXIMO_NOMBRE}
          error={error('nombreApellido')}
        />
        <Input
          etiqueta="Email"
          icono="mail-outline"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          maxLength={MAXIMO_EMAIL}
          error={error('email')}
        />
        {usuario !== undefined && usuario.rol !== 'GESTOR' && (
          <Input
            etiqueta="Teléfono (opcional)"
            icono="call-outline"
            value={telefono}
            onChangeText={setTelefono}
            keyboardType="phone-pad"
            maxLength={MAXIMO_TELEFONO}
            error={error('telefono')}
          />
        )}
        {usuario === undefined && (
          <>
            <Input
              etiqueta="Contraseña"
              icono="lock-closed-outline"
              value={contrasenia}
              onChangeText={setContrasenia}
              secureTextEntry
              mostrarOcultar
              autoCapitalize="none"
              maxLength={MAXIMO_CONTRASENIA}
              error={error('contrasenia')}
            />
            <View style={estilos.reglas} accessibilityLabel="Requisitos de la contraseña">
              {REGLAS.map((r) => {
                const cumple = r.cumple(contrasenia);
                return (
                  <View key={r.texto} style={estilos.regla}>
                    <Ionicons
                      name={cumple ? 'checkmark-circle' : 'ellipse-outline'}
                      size={tamanios.iconoChico}
                      color={cumple ? colores.verdeTexto : colores.tintaSecundaria}
                    />
                    <Text style={[estilos.textoRegla, cumple && estilos.reglaCumplida]}>{r.texto}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}
        {general !== undefined && <Text style={estilos.mensaje}>{general}</Text>}
        {fallo.red && <Text style={estilos.mensaje}>{MENSAJE_DE_RED}</Text>}
      </ScrollView>
      <View style={[estilos.barra, { paddingBottom: bottom + espaciado.m }]}>
        <Button
          etiqueta={usuario === undefined ? 'Crear gestor' : 'Guardar cambios'}
          icono={usuario === undefined ? 'person-add-outline' : 'save-outline'}
          onPress={guardar}
          deshabilitado={guardando}
        />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenedor: { padding: espaciado.l },
  info: {
    flexDirection: 'row',
    gap: espaciado.s,
    alignItems: 'center',
    padding: espaciado.m,
    borderRadius: radios.tarjeta,
    backgroundColor: colores.lilaClaro,
    marginBottom: espaciado.l,
  },
  textoInfo: { ...tipografia.cuerpo, color: colores.lilaTexto, flex: 1 },
  reglas: { gap: espaciado.xs, marginTop: -espaciado.s, marginBottom: espaciado.m },
  regla: { flexDirection: 'row', alignItems: 'center', gap: espaciado.xs },
  textoRegla: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
  reglaCumplida: { color: colores.verdeTexto },
  mensaje: { ...tipografia.cuerpo, color: colores.rojo, marginTop: espaciado.s },
  barra: {
    backgroundColor: colores.blanco,
    borderTopWidth: bordes.fino,
    borderTopColor: colores.bordeSuave,
    paddingHorizontal: espaciado.l,
    paddingTop: espaciado.m,
  },
});
