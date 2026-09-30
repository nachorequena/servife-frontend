import { PantallaPendiente } from '../../components';

/** Registro de cliente o prestador. El prestador elige el tipo de servicio en el mismo formulario. */
export function RegistroScreen() {
  return <PantallaPendiente titulo="Registrate" respaldo="CU01" endpoints={['A1', 'B1']} />;
}
