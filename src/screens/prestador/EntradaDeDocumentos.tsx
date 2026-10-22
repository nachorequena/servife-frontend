import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Button } from '../../components';
import type { PrestadorStackParams } from '../../navigation/tipos';

/**
 * Punto de entrada a la carga de documentos (E7, porción 5) dentro de Mi servicio (porción 1). Mi servicio
 * lo muestra solo mientras el perfil está PENDIENTE.
 */
export function EntradaDeDocumentos() {
  const navigation = useNavigation<NativeStackNavigationProp<PrestadorStackParams>>();
  return (
    <Button
      etiqueta="Documentos para la validación"
      variante="contorno"
      icono="document-attach-outline"
      onPress={() => navigation.navigate('Documentos')}
    />
  );
}
