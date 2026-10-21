import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { ApiError } from '../../api/errores';
import { actualizarUsuario, crearGestor } from '../../api/gestion';
import { Button, Input } from '../../components';
import type { GestorStackParams } from '../../navigation/tipos';
import { colores, espaciado, tipografia } from '../../theme';
import { MENSAJE_DE_RED } from '../../utils/errores';

const CAMPOS = ['nombreApellido', 'email', 'telefono', 'contrasenia'];

/** Límites del backend (CrearGestorRequest y ActualizarUsuarioAdminRequest). */
const MAXIMO_NOMBRE = 120;
const MAXIMO_EMAIL = 254;
const MAXIMO_TELEFONO = 30;
const MAXIMO_CONTRASENIA = 72;

/**
 * Alta de un gestor (CU15, E13: la única vía, D06) y edición de cualquier usuario (CU17, E14: nombre,
 * email y teléfono; los gestores no tienen teléfono). Provisoria: sin maqueta (D10). Los datos actuales
 * llegan por la ruta desde Usuarios.
 */
export function FormularioUsuario() {
  const navigation = useNavigation<NativeStackNavigationProp<GestorStackParams>>();
  const { params } = useRoute<NativeStackScreenProps<GestorStackParams, 'FormularioUsuario'>['route']>();
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
      } else {
        const tel = telefono.trim();
        await actualizarUsuario(usuario.uuid, {
          nombreApellido: nombre.trim(),
          email: email.trim(),
          ...(usuario.rol !== 'GESTOR' && tel !== '' ? { telefono: tel } : {}),
        });
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
    <ScrollView contentContainerStyle={estilos.contenedor} keyboardShouldPersistTaps="handled">
      <Text style={estilos.aviso}>Pantalla provisoria: sin diseño en la maqueta (D10).</Text>
      {usuario === undefined && (
        <Text style={estilos.aviso}>Los clientes y prestadores se registran desde la app; acá solo se dan de alta gestores.</Text>
      )}
      <Input etiqueta="Nombre y apellido" value={nombre} onChangeText={setNombre} maxLength={MAXIMO_NOMBRE} error={error('nombreApellido')} />
      <Input
        etiqueta="Email"
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
          value={telefono}
          onChangeText={setTelefono}
          keyboardType="phone-pad"
          maxLength={MAXIMO_TELEFONO}
          error={error('telefono')}
        />
      )}
      {usuario === undefined && (
        <Input
          etiqueta="Contraseña"
          value={contrasenia}
          onChangeText={setContrasenia}
          secureTextEntry
          autoCapitalize="none"
          maxLength={MAXIMO_CONTRASENIA}
          error={error('contrasenia')}
        />
      )}
      <Button etiqueta={usuario === undefined ? 'Crear gestor' : 'Guardar'} onPress={guardar} deshabilitado={guardando} />
      {general !== undefined && <Text style={estilos.mensaje}>{general}</Text>}
      {fallo.red && <Text style={estilos.mensaje}>{MENSAJE_DE_RED}</Text>}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { padding: espaciado.l },
  aviso: { ...tipografia.cuerpo, color: colores.tintaSecundaria, marginBottom: espaciado.m },
  mensaje: { ...tipografia.cuerpo, color: colores.tinta, marginTop: espaciado.m },
});
