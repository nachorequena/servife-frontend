import { ScrollView } from 'react-native';

import { MiCuenta } from '../compartidas/MiCuenta';
import { MiServicio } from './MiServicio';

/**
 * Perfil del prestador: Mi servicio (B7, B8) y Mi cuenta (con "Cerrar sesión"). Sin tarifa (D02).
 * Los documentos (E7) llegan en el Sprint 5.
 */
export function PerfilPropioScreen() {
  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <MiServicio />
      <MiCuenta />
    </ScrollView>
  );
}
