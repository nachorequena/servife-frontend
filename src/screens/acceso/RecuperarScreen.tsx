import { PantallaPendiente } from '../../components';

/** Recuperar contraseña · CU02 · A8, A9. Placeholder: la pantalla real llega con la Task 16. */
export function RecuperarScreen() {
  return <PantallaPendiente titulo="Recuperar contraseña" respaldo="CU02" endpoints={['A8', 'A9']} />;
}
