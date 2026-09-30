/** Formato único de error del backend (servife-ia/.ai/05-api-contract.md). */
export interface ErrorCampo {
  campo: string;
  detalle: string;
}

export interface CuerpoDeError {
  timestamp: string;
  status: number;
  codigo: string;
  mensaje: string;
  path: string;
  errores: ErrorCampo[];
}

/** Lo que lanza el cliente HTTP ante cualquier respuesta que no sea 2xx. */
export class ApiError extends Error {
  readonly status: number;
  readonly codigo: string;
  readonly errores: ErrorCampo[];

  constructor(status: number, codigo: string, mensaje: string, errores: ErrorCampo[] = []) {
    super(mensaje);
    this.name = 'ApiError';
    this.status = status;
    this.codigo = codigo;
    this.errores = errores;
  }

  static async desde(respuesta: Response): Promise<ApiError> {
    try {
      const cuerpo = (await respuesta.json()) as Partial<CuerpoDeError>;
      return new ApiError(
        respuesta.status,
        cuerpo.codigo ?? 'ERROR_DESCONOCIDO',
        cuerpo.mensaje ?? 'Ocurrió un error.',
        cuerpo.errores ?? [],
      );
    } catch {
      return new ApiError(respuesta.status, 'ERROR_DESCONOCIDO', 'Ocurrió un error.');
    }
  }

  /** Mensaje de error de un campo del formulario, para mostrarlo debajo del Input. */
  errorDe(campo: string): string | undefined {
    return this.errores.find((e) => e.campo === campo)?.detalle;
  }
}
