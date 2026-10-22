import { ScrollView } from 'react-native';

import { MiCuenta } from '../compartidas/MiCuenta';
import { MiServicio } from './MiServicio';

/**
 * Perfil del prestador: Mi servicio (B7, B8) y Mi cuenta (con "Cerrar sesión"). Sin tarifa (D02).
 * Mientras el perfil está en revisión, Mi servicio ofrece cargar los documentos (E7, DocumentosScreen).
 */
export function PerfilPropioScreen() {
  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <MiServicio />
      <MiCuenta />
    </ScrollView>
  );
}
