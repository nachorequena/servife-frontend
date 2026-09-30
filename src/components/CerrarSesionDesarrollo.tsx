import { useSesion } from '../store/sesion';
import { Button } from './Button';

/**
 * Botón para cambiar de rol mientras no hay login real. Solo existe en desarrollo (__DEV__).
 * Se borra cuando el módulo A implemente el login y las pantallas de perfil tengan diseño (D10).
 */
export function CerrarSesionDesarrollo() {
  const { cerrar } = useSesion();
  if (!__DEV__) {
    return null;
  }
  return <Button etiqueta="Cerrar sesión (desarrollo)" variante="secundario" onPress={cerrar} />;
}
