import { formatearCentavos, formatearFecha, formatearFechaHora, nombresDeDias } from '../formato';

describe('formato', () => {
  it('muestra una fecha UTC en hora de Argentina (UTC-3)', () => {
    expect(formatearFechaHora('2026-09-18T13:12:04Z')).toContain('10:12');
  });

  it('una hora UTC de madrugada todavía es el día anterior en Argentina', () => {
    expect(formatearFecha('2026-09-18T02:00:00Z')).toBe('17/09/2026');
  });

  it('formatea centavos como pesos', () => {
    expect(formatearCentavos(800000)).toMatch(/\$\s?8\.000$/);
  });
});

describe('nombresDeDias', () => {
  it('convierte números (1 = lunes) en abreviaturas', () => {
    expect(nombresDeDias([1, 3, 5])).toBe('Lun, Mié, Vie');
  });

  it('ordena los días y no modifica el arreglo recibido', () => {
    const dias = [7, 2, 6];
    expect(nombresDeDias(dias)).toBe('Mar, Sáb, Dom');
    expect(dias).toEqual([7, 2, 6]);
  });

  it('sin días devuelve texto vacío', () => {
    expect(nombresDeDias([])).toBe('');
  });
});
