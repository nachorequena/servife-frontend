import { PantallaPendiente } from '../../components';

interface Props {
  /**
   * true: lo ve el cliente en el perfil de un prestador (D3, /prestadores/{uuid}/publicaciones).
   * false: el prestador ve los suyos con editar y eliminar (D8, /prestadores/me/publicaciones).
   * Es un único componente, no dos pantallas copiadas (servife-ia/.ai/09-ux-ui.md).
   */
  soloLectura: boolean;
  /** Obligatorio si soloLectura; el prestador ve los propios. */
  uuidPrestador?: string;
}

/** Trabajos realizados · CU10, CU11. Estrellas solo si el trabajo tiene solicitud asociada (D07). */
export function TrabajosRealizadosScreen({ soloLectura }: Props) {
  return (
    <PantallaPendiente
      titulo="Trabajos realizados"
      respaldo={soloLectura ? 'CU11 · D07' : 'CU10 · D07'}
      endpoints={soloLectura ? ['D3'] : ['D8']}
    />
  );
}
