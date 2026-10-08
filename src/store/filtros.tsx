import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/** Filtros de la búsqueda del cliente (CU04). El texto `q` vive en Inicio, no acá. Sin precio (D02). */
export interface Filtros {
  tipoServicioId?: string;
  puntajeMin?: number;
  /** 1 = lunes … 7 = domingo. */
  dias: number[];
  orden: 'cercania' | 'valoracion';
}

export const FILTROS_INICIALES: Filtros = { dias: [], orden: 'cercania' };

interface Valor {
  filtros: Filtros;
  aplicar: (filtros: Filtros) => void;
  limpiar: () => void;
}

const FiltrosContext = createContext<Valor | null>(null);

/** `inicial` existe para tests y para restaurar un estado; en la app arranca sin filtros. */
export function FiltrosProvider({ children, inicial = FILTROS_INICIALES }: { children: ReactNode; inicial?: Filtros }) {
  const [filtros, setFiltros] = useState<Filtros>(inicial);
  const aplicar = useCallback((nuevos: Filtros) => setFiltros(nuevos), []);
  const limpiar = useCallback(() => setFiltros(FILTROS_INICIALES), []);
  const valor = useMemo(() => ({ filtros, aplicar, limpiar }), [filtros, aplicar, limpiar]);
  return <FiltrosContext.Provider value={valor}>{children}</FiltrosContext.Provider>;
}

export function useFiltros(): Valor {
  const valor = useContext(FiltrosContext);
  if (!valor) throw new Error('useFiltros debe usarse dentro de FiltrosProvider');
  return valor;
}
