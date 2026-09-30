import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text } from 'react-native';

import { Button, PantallaPendiente } from '../../components';
import type { AccesoParams } from '../../navigation/tipos';
import { useSesion, type Rol } from '../../store/sesion';
import { colores, tipografia } from '../../theme';

type Props = NativeStackScreenProps<AccesoParams, 'Ingresar'>;

const ROLES: Rol[] = ['CLIENTE', 'PRESTADOR', 'GESTOR'];

/**
 * Inicio de sesión · CU02 · A2, A3, A4, E10. Único login para los tres roles.
 * Hasta que el módulo A implemente el login, en desarrollo se puede entrar con un rol fijo para
 * navegar las pantallas con datos mock. Esos botones no existen en el build de producción.
 */
export function IngresarScreen({ navigation }: Props) {
  const { abrir } = useSesion();
  return (
    <PantallaPendiente titulo="Inicio de sesión" respaldo="CU02" endpoints={['A2', 'A3', 'A4', 'E10']}>
      <Button etiqueta="Registrate" variante="secundario" onPress={() => navigation.navigate('Registro')} />
      {__DEV__ && (
        <>
          <Text style={estilos.aviso}>Solo en desarrollo:</Text>
          {ROLES.map((rol) => (
            <Button key={rol} etiqueta={`Entrar como ${rol}`} variante="terciario" onPress={() => abrir({ rol })} />
          ))}
        </>
      )}
    </PantallaPendiente>
  );
}

const estilos = StyleSheet.create({
  aviso: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
});
