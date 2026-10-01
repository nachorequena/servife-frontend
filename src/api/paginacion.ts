/** Respuesta paginada del backend (servife-ia/.ai/05-api-contract.md). */
export interface Pagina<T> {
  contenido: T[];
  pagina: number;
  tamanio: number;
  totalElementos: number;
  totalPaginas: number;
}

export interface ParametrosDePagina {
  page?: number;
  size?: number;
}
