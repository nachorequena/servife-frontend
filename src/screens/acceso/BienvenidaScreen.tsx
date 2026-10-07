import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Logo } from '../../components';
import type { AccesoParams } from '../../navigation/tipos';
import { colores, espaciado, tipografia } from '../../theme';

type Props = NativeStackScreenProps<AccesoParams, 'Bienvenida'>;

/**
 * Bienvenida y selector de acceso · CU01, CU02.
 * El "Ingreso como administrador" va al mismo login: el rol viaja en el token (.ai/07-security.md).
 */
export function BienvenidaScreen({ navigation }: Props) {
  const { top } = useSafeAreaInsets();

  return (
    <View style={estilos.contenedor}>
      <View testID="barra-logo" style={[estilos.barra, { paddingTop: top + espaciado.s }]}>
        <Logo />
      </View>
      <Text style={estilos.pregunta}>¿Cómo querés acceder hoy?</Text>
      <View style={estilos.botones}>
        <Button etiqueta="Cliente" onPress={() => navigation.navigate('Ingresar')} />
        <Button etiqueta="Prestador" variante="terciario" onPress={() => navigation.navigate('Registro', { rol: 'PRESTADOR' })} />
      </View>
      <Text style={estilos.enlace} accessibilityRole="link" onPress={() => navigation.navigate('Ingresar')}>
        Ingreso como administrador
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  barra: { backgroundColor: colores.verde, paddingHorizontal: espaciado.l, paddingBottom: espaciado.s },
  pregunta: { ...tipografia.seccion, color: colores.tinta, textAlign: 'center', marginTop: espaciado.xl },
  botones: { padding: espaciado.l, gap: espaciado.m, marginTop: espaciado.xl },
  enlace: { ...tipografia.cuerpo, color: colores.tintaSecundaria, textAlign: 'center', marginTop: 'auto', padding: espaciado.xl },
});
