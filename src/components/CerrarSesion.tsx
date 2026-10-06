import { useSesion } from '../store/sesion';
import { Button } from './Button';

/** Cierra la sesión: borra los tokens del dispositivo y vuelve a Bienvenida. */
export function CerrarSesion() {
  const { cerrar } = useSesion();
  return <Button etiqueta="Cerrar sesión" variante="secundario" onPress={cerrar} />;
}
