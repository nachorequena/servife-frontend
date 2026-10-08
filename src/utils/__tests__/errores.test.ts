import { ApiError } from '../../api/errores';
import { MENSAJE_DE_RED, mensajeDe } from '../errores';

describe('utils/errores', () => {
  it('MENSAJE_DE_RED conserva el texto de siempre', () => {
    expect(MENSAJE_DE_RED).toBe('No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.');
  });

  it('mensajeDe devuelve el mensaje de un ApiError', () => {
    const error = new ApiError(409, 'X', 'Ya existe');
    expect(mensajeDe(error)).toBe('Ya existe');
  });

  it('mensajeDe devuelve el mensaje de red para cualquier otro error', () => {
    expect(mensajeDe(new TypeError('Network request failed'))).toBe(MENSAJE_DE_RED);
    expect(mensajeDe('algo')).toBe(MENSAJE_DE_RED);
  });
});
