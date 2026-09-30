import { PantallaPendiente } from '../../components';

/** Inicio del cliente: buscador y lista de prestadores. */
export function InicioScreen() {
  return <PantallaPendiente titulo="Inicio" respaldo="CU04" endpoints={['B1', 'B5']} />;
}
