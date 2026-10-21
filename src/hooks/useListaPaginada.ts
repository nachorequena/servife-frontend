import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Pagina, ParametrosDePagina } from '../api/paginacion';

const TAMANIO_PAGINA = 20;

/**
 * Lista paginada genérica: carga, paginado sin duplicados, refresco (pull-to-refresh y al volver a la
 * pantalla, sin tapar la lista) y errores; un refresco que falla conserva la lista. Toda consulta nueva anula
 * a la anterior. Es la misma lógica que useListaDeSolicitudes y AvisosScreen, que pueden pasarse a este hook.
 *
 * @param cargarPagina función de api/ que pide una página; tiene que ser estable (definida fuera del componente)
 * @param clave identifica cada ítem para no repetirlo entre páginas
 */
export function useListaPaginada<T>(
  cargarPagina: (pagina: ParametrosDePagina) => Promise<Pagina<T>>,
  clave: (item: T) => string,
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
  const claveRef = useRef(clave);
  claveRef.current = clave;

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

  // Al volver a la pantalla se recarga sin tapar la lista.
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
          const existentes = new Set(actuales.map((i) => claveRef.current(i)));
          return [...actuales, ...resultado.contenido.filter((i) => !existentes.has(claveRef.current(i)))];
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

  return { items, cargando, cargandoMas, refrescando, error, errorMas, errorAlActualizar, cargarMas, refrescar, reintentar };
}
