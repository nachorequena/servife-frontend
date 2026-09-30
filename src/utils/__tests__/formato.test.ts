import { formatearCentavos, formatearFecha, formatearFechaHora } from '../formato';

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
