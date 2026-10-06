import { CerrarSesion, PantallaPendiente } from '../../components';

/** Perfil del gestor. */
export function PerfilGestorScreen() {
  return (
    <PantallaPendiente titulo="Mi perfil" respaldo="D10" endpoints={['A4', 'A6', 'A7']} sinDisenio>
      <CerrarSesion />
    </PantallaPendiente>
  );
}
