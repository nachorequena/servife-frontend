import {
  diaDeSemana,
  formatearCentavos,
  formatearFecha,
  formatearFechaHora,
  formatearFechaSola,
  hoyEnArgentina,
  nombresDeDias,
  pesosACentavos,
} from '../formato';

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

describe('fecha sola (AAAA-MM-DD)', () => {
  afterEach(() => jest.useRealTimers());

  it('formatearFechaSola no se corre por la zona horaria', () => {
    expect(formatearFechaSola('2026-09-18')).toBe('18/09/2026');
    expect(formatearFechaSola('2026-01-01')).toBe('01/01/2026');
  });

  it('hoyEnArgentina a las 22:30 ART (01:30 UTC del día siguiente) sigue siendo el día argentino', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-19T01:30:00Z'));
    expect(hoyEnArgentina()).toBe('2026-09-18');
  });

  it('hoyEnArgentina a las 00:30 ART ya es el día nuevo', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-19T03:30:00Z'));
    expect(hoyEnArgentina()).toBe('2026-09-19');
  });

  it('diaDeSemana: 1 = lunes … 7 = domingo', () => {
    expect(diaDeSemana('2026-09-14')).toBe(1); // lunes
    expect(diaDeSemana('2026-09-18')).toBe(5); // viernes
    expect(diaDeSemana('2026-09-20')).toBe(7); // domingo
  });
});

describe('hoyEnArgentina sin Intl con zonas', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('si Intl falla calcula el día con UTC-3', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-19T01:30:00Z'));
    jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
      throw new RangeError('timeZone no soportada');
    });
    expect(hoyEnArgentina()).toBe('2026-09-18');
  });
});

describe('pesosACentavos', () => {
  it.each([
    ['8000', 800000],
    ['8.000', 800000],
    ['1.234.567', 123456700],
    ['1.234,56', 123456],
    ['8000,5', 800050],
    ['1500.50', 150050],
    ['1.5', 150],
    ['0', 0],
    ['0,00', 0],
    [' 99,05 ', 9905],
  ])('acepta "%s" -> %i', (texto, centavos) => {
    expect(pesosACentavos(texto)).toBe(centavos);
  });

  it.each(['', '.5', '1500,', '1.23.4', '-5', '1,234', '1500.505', 'mucho', '1.2345', '99999999999999999999'])(
    'rechaza "%s"',
    (texto) => {
      expect(pesosACentavos(texto)).toBeNull();
    },
  );
});
