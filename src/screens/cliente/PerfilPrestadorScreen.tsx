import { PantallaPendiente } from '../../components';

/** Sello verificado, certificaciones, reseñas, cantidad de servicios, botón Consultar (D03). Sin tarifa (D02). */
export function PerfilPrestadorScreen() {
  return <PantallaPendiente titulo="Perfil del prestador" respaldo="CU05 · D01, D03, D07" endpoints={['B6', 'C5', 'D2']} />;
}
