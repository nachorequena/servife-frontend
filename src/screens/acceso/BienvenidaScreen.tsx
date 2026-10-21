import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Logo } from '../../components';
import type { AccesoParams } from '../../navigation/tipos';
import { useSesion } from '../../store/sesion';
import { colores, espaciado, tipografia } from '../../theme';

type Props = NativeStackScreenProps<AccesoParams, 'Bienvenida'>;

/**
 * Bienvenida y selector de acceso · CU01, CU02.
 * El "Ingreso como administrador" va al mismo login: el rol viaja en el token (.ai/07-security.md).
 * Si la sesión se cerró porque el gestor suspendió la cuenta, muestra el aviso.
 */
export function BienvenidaScreen({ navigation }: Props) {
  const { top } = useSafeAreaInsets();
  const { avisoDeCierre } = useSesion();

  return (
    <View style={estilos.contenedor}>
      <View testID="barra-logo" style={[estilos.barra, { paddingTop: top + espaciado.s }]}>
        <Logo />
      </View>
      {avisoDeCierre !== null && <Text style={estilos.aviso}>{avisoDeCierre}</Text>}
      <Text style={estilos.pregunta}>¿Cómo querés acceder hoy?</Text>
      <View style={estilos.botones}>
        <Button etiqueta="Cliente" onPress={() => navigation.navigate('Ingresar', { rol: 'CLIENTE' })} />
        <Button etiqueta="Prestador" variante="terciario" onPress={() => navigation.navigate('Ingresar', { rol: 'PRESTADOR' })} />
      </View>
      <Text style={estilos.enlace} accessibilityRole="link" onPress={() => navigation.navigate('Ingresar', { rol: 'GESTOR' })}>
        Ingreso como administrador
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  barra: { backgroundColor: colores.verde, paddingHorizontal: espaciado.l, paddingBottom: espaciado.s },
  aviso: { ...tipografia.cuerpo, color: colores.tinta, textAlign: 'center', marginTop: espaciado.l, marginHorizontal: espaciado.l },
  pregunta: { ...tipografia.seccion, color: colores.tinta, textAlign: 'center', marginTop: espaciado.xl },
  botones: { padding: espaciado.l, gap: espaciado.m, marginTop: espaciado.xl },
  enlace: { ...tipografia.cuerpo, color: colores.tintaSecundaria, textAlign: 'center', marginTop: 'auto', padding: espaciado.xl },
});
