import { PantallaPendiente } from '../../components';

/** Expediente: DNI, declaración jurada y certificaciones. No aprueba sin matrícula si el rubro la requiere. */
export function ValidacionesScreen() {
  return <PantallaPendiente titulo="Validaciones" respaldo="CU14 · D01" endpoints={['E5', 'E6', 'E8']} />;
}
