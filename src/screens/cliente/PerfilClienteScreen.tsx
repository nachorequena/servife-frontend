import { CerrarSesion, PantallaPendiente } from '../../components';

/** Perfil del cliente, ver y editar. */
export function PerfilClienteScreen() {
  return (
    <PantallaPendiente titulo="Mi perfil" respaldo="D10" endpoints={['A4', 'A6', 'A7']} sinDisenio>
      <CerrarSesion />
    </PantallaPendiente>
  );
}
