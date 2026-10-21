import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Pagina, ParametrosDePagina } from '../api/paginacion';

const TAMANIO_PAGINA = 20;

/**
 * Lista paginada de cualquier endpoint que devuelve Pagina<T> con uuid: carga, paginado, refresco
 * (pull-to-refresh y al volver a la pantalla, sin tapar la lista) y errores. Toda consulta nueva anula a
 * la anterior. `cargarPagina` tiene que ser estable (useCallback): cuando cambia, la lista se vuelve a pedir
 * desde la primera página (por ejemplo, al cambiar un filtro).
 */
export function useListaPaginada<T extends { uuid: string }>(
  cargarPagina: (pagina: ParametrosDePagina) => Promise<Pagina<T>>,
) {
  const [items, setItems] = useState<T[]>([]);
  const [pagina, setPagina] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState(false);
  const [errorMas, setErrorMas] = useState(false);
  const [errorAlActualizar, setErrorAlActualizar] = useState(false);
  const [reintento, setReintento] = useState(0);
  const solicitud = useRef(0);
  const cargandoMasRef = useRef(false);
  const esRefresco = useRef(false);
  const primerFoco = useRef(true);

  useEffect(() => {
    const id = ++solicitud.current;
    const refresco = esRefresco.current;
    esRefresco.current = false;
    cargandoMasRef.current = false;
    setCargandoMas(false);
    setErrorMas(false);
    setError(false);
    setErrorAlActualizar(false);
    setRefrescando(refresco);
    setCargando(!refresco);
    if (!refresco) setItems([]);
    cargarPagina({ page: 0, size: TAMANIO_PAGINA })
      .then((resultado) => {
        if (id !== solicitud.current) return;
        setItems(resultado.contenido);
        setPagina(resultado.pagina);
        setTotalPaginas(resultado.totalPaginas);
      })
      .catch(() => {
        if (id !== solicitud.current) return;
        if (refresco) {
          setErrorAlActualizar(true); // se conserva la lista
          return;
        }
        setItems([]);
        setError(true);
      })
      .finally(() => {
        if (id !== solicitud.current) return;
        setCargando(false);
        setRefrescando(false);
      });
  }, [cargarPagina, reintento]);

  // Al volver a la pantalla (p. ej. tras actuar en un detalle) se recarga sin tapar la lista.
  useFocusEffect(
    useCallback(() => {
      if (primerFoco.current) {
        primerFoco.current = false;
        return;
      }
      esRefresco.current = true;
      setReintento((n) => n + 1);
    }, []),
  );

  const cargarMas = () => {
    if (cargandoMasRef.current || cargando || refrescando || error || pagina + 1 >= totalPaginas) return;
    const id = solicitud.current;
    cargandoMasRef.current = true;
    setCargandoMas(true);
    setErrorMas(false);
    cargarPagina({ page: pagina + 1, size: TAMANIO_PAGINA })
      .then((resultado) => {
        if (id !== solicitud.current) return;
        setItems((actuales) => {
          const existentes = new Set(actuales.map((s) => s.uuid));
          return [...actuales, ...resultado.contenido.filter((s) => !existentes.has(s.uuid))];
        });
        setPagina(resultado.pagina);
        setTotalPaginas(resultado.totalPaginas);
      })
      .catch(() => {
        if (id === solicitud.current) setErrorMas(true);
      })
      .finally(() => {
        if (id !== solicitud.current) return;
        cargandoMasRef.current = false;
        setCargandoMas(false);
      });
  };

  const refrescar = () => {
    esRefresco.current = true;
    setReintento((n) => n + 1);
  };

  const reintentar = () => setReintento((n) => n + 1);

  const quitar = (uuid: string) => setItems((actuales) => actuales.filter((s) => s.uuid !== uuid));

  return { items, cargando, cargandoMas, refrescando, error, errorMas, errorAlActualizar, cargarMas, refrescar, reintentar, quitar };
}
