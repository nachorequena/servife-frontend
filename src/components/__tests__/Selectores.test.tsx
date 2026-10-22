import { fireEvent, render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { SelectorDeFecha } from '../SelectorDeFecha';
import { SelectorDeHora } from '../SelectorDeHora';

const mockAbrir = jest.fn();
let mockCambiarEnIos: ((evento: unknown, fecha: Date) => void) | undefined;
jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: (props: { mode: string; onValueChange: (evento: unknown, fecha: Date) => void }) => {
    mockCambiarEnIos = props.onValueChange;
    return require('react').createElement(require('react-native').Text, null, `picker-ios:${props.mode}`);
  },
  DateTimePickerAndroid: { open: (opciones: unknown) => mockAbrir(opciones) },
}));

beforeEach(() => {
  mockAbrir.mockReset();
  mockCambiarEnIos = undefined;
});
afterEach(() => jest.restoreAllMocks());

describe('SelectorDeFecha', () => {
  it('sin valor muestra el placeholder y con valor la fecha DD/MM/AAAA', async () => {
    const { rerender } = await render(<SelectorDeFecha etiqueta="Fecha" value="" onChange={jest.fn()} />);
    expect(screen.getByText('Elegir fecha')).toBeOnTheScreen();
    await rerender(<SelectorDeFecha etiqueta="Fecha" value="2026-10-09" onChange={jest.fn()} />);
    expect(screen.getByText('09/10/2026')).toBeOnTheScreen();
  });

  it('muestra el error', async () => {
    await render(<SelectorDeFecha etiqueta="Fecha" value="" onChange={jest.fn()} error="Elegí una fecha." />);
    expect(screen.getByText('Elegí una fecha.')).toBeOnTheScreen();
  });

  it('en Android abre el calendario con el mínimo y entrega AAAA-MM-DD', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const onChange = jest.fn();
    await render(<SelectorDeFecha etiqueta="Fecha" value="2026-10-12" minimo="2026-10-08" onChange={onChange} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Fecha' }));

    const opciones = mockAbrir.mock.calls[0][0];
    expect(opciones.mode).toBe('date');
    expect((opciones.value as Date).getDate()).toBe(12);
    expect((opciones.minimumDate as Date).getDate()).toBe(8);

    opciones.onValueChange({}, new Date(2026, 9, 9, 23, 30));
    expect(onChange).toHaveBeenCalledWith('2026-10-09');
  });

  it('en iOS muestra el selector al tocar, entrega la fecha y lo oculta al tocar de nuevo', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const onChange = jest.fn();
    await render(<SelectorDeFecha etiqueta="Fecha" value="" onChange={onChange} />);
    expect(screen.queryByText('picker-ios:date')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Fecha' }));
    expect(screen.getByText('picker-ios:date')).toBeOnTheScreen();
    mockCambiarEnIos?.({}, new Date(2026, 10, 3, 12));
    expect(onChange).toHaveBeenCalledWith('2026-11-03');

    await fireEvent.press(screen.getByRole('button', { name: 'Fecha' }));
    expect(screen.queryByText('picker-ios:date')).toBeNull();
  });
});

describe('SelectorDeHora', () => {
  it('sin valor muestra el placeholder y no ofrece Quitar hora', async () => {
    await render(<SelectorDeHora etiqueta="Hora" value="" onChange={jest.fn()} />);
    expect(screen.getByText('Elegir hora (opcional)')).toBeOnTheScreen();
    expect(screen.queryByText('Quitar hora')).toBeNull();
  });

  it('con valor muestra HH:mm hs y Quitar hora la vacía', async () => {
    const onChange = jest.fn();
    await render(<SelectorDeHora etiqueta="Hora" value="14:30" onChange={onChange} />);
    expect(screen.getByText('14:30 hs')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Quitar hora'));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('en Android abre el reloj de 24 h y entrega HH:mm', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const onChange = jest.fn();
    await render(<SelectorDeHora etiqueta="Hora" value="" onChange={onChange} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Hora' }));

    const opciones = mockAbrir.mock.calls[0][0];
    expect(opciones.mode).toBe('time');
    expect(opciones.is24Hour).toBe(true);
    opciones.onValueChange({}, new Date(2026, 9, 9, 8, 5));
    expect(onChange).toHaveBeenCalledWith('08:05');
  });

  it('en iOS muestra el selector de hora al tocar', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const onChange = jest.fn();
    await render(<SelectorDeHora etiqueta="Hora" value="" onChange={onChange} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Hora' }));
    expect(screen.getByText('picker-ios:time')).toBeOnTheScreen();
    mockCambiarEnIos?.({}, new Date(2026, 9, 9, 17, 45));
    expect(onChange).toHaveBeenCalledWith('17:45');
  });
});
