import { PantallaPendiente } from '../../components';
import { MiCuenta } from '../compartidas/MiCuenta';

/**
 * Editar perfil del prestador: rubro, zona, disponibilidad, descripción y documentos. Sin tarifa (D02).
 * Los datos de la cuenta y "Cerrar sesión" salen de MiCuenta (provisoria hasta D10).
 */
export function PerfilPropioScreen() {
  return (
    <PantallaPendiente titulo="Mi perfil" respaldo="D10 · D01, D09" endpoints={['B7', 'B8', 'E7']} sinDisenio>
      <MiCuenta />
    </PantallaPendiente>
  );
}
