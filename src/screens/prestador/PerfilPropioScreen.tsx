import { CerrarSesionDesarrollo, PantallaPendiente } from '../../components';

/** Editar perfil del prestador: rubro, zona, disponibilidad, descripción y documentos. Sin tarifa (D02). */
export function PerfilPropioScreen() {
  return (
    <PantallaPendiente titulo="Mi perfil" respaldo="D10 · D01, D09" endpoints={['B7', 'B8', 'E7']} sinDisenio>
      <CerrarSesionDesarrollo />
    </PantallaPendiente>
  );
}
