import { PantallaPendiente } from '../../components';

/** Primero pregunta si el servicio se realizó; si sí, 1 a 5 estrellas y comentario. */
export function ValoracionScreen() {
  return <PantallaPendiente titulo="Valorar" respaldo="CU08 · D07" endpoints={['D1']} />;
}
