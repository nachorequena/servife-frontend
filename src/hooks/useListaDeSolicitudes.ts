import { useCallback } from 'react';

import type { ParametrosDePagina } from '../api/paginacion';
import { listarMisSolicitudes, type EstadoSolicitud, type SolicitudEnLista } from '../api/solicitudes';
import { useListaPaginada } from './useListaPaginada';

/**
 * Lista paginada de las solicitudes del usuario (C2) para los estados dados. La carga, el paginado, el
 * refresco y los errores están en useListaPaginada.
 */
const claveDe = (s: SolicitudEnLista) => s.uuid;

export function useListaDeSolicitudes(estados?: EstadoSolicitud[]) {
  const cargarPagina = useCallback((pagina: ParametrosDePagina) => listarMisSolicitudes({ estados, ...pagina }), [estados]);
  return useListaPaginada(cargarPagina, claveDe);
}
