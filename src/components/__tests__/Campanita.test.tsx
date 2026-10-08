import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { contarAvisosNoLeidos } from '../../api/notificaciones';
import { Campanita } from '../Campanita';

jest.mock('../../api/notificaciones', () => ({ contarAvisosNoLeidos: jest.fn() }));

let mockEnfocada = true;
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: (efecto: () => void | (() => void)) =>
    require('react').useEffect(() => (mockEnfocada ? efecto() : undefined), [efecto, mockEnfocada]),
}));

const mockContar = contarAvisosNoLeidos as jest.Mock;

beforeEach(() => {
  mockContar.mockReset();
  mockNavigate.mockReset();
  mockEnfocada = true;
});

afterEach(() => {
  jest.useRealTimers();
});

describe('Campanita', () => {
  it('muestra la cantidad de avisos sin leer', async () => {
    mockContar.mockResolvedValue({ cantidad: 3 });
    await render(<Campanita />);
    expect(await screen.findByText('3')).toBeOnTheScreen();
    expect(screen.getByLabelText('Avisos, 3 sin leer')).toBeOnTheScreen();
  });

  it('muestra 9+ cuando hay más de nueve', async () => {
    mockContar.mockResolvedValue({ cantidad: 25 });
    await render(<Campanita />);
    expect(await screen.findByText('9+')).toBeOnTheScreen();
    expect(screen.getByLabelText('Avisos, 25 sin leer')).toBeOnTheScreen();
  });

  it('oculta el globo cuando no hay avisos sin leer', async () => {
    mockContar.mockResolvedValue({ cantidad: 0 });
    await render(<Campanita />);
    expect(await screen.findByLabelText('Avisos, 0 sin leer')).toBeOnTheScreen();
    expect(screen.queryByText('0')).toBeNull();
  });

  it('abre Avisos al tocarla', async () => {
    mockContar.mockResolvedValue({ cantidad: 1 });
    await render(<Campanita />);
    await fireEvent.press(await screen.findByLabelText('Avisos, 1 sin leer'));
    expect(mockNavigate).toHaveBeenCalledWith('Avisos');
  });

  it('consulta cada 30 segundos y deja de hacerlo al desmontar', async () => {
    jest.useFakeTimers();
    mockContar.mockResolvedValue({ cantidad: 1 });
    const { unmount } = await render(<Campanita />);
    const inicial = mockContar.mock.calls.length;
    await act(async () => {
      jest.advanceTimersByTime(30_000);
    });
    expect(mockContar.mock.calls.length).toBe(inicial + 1);
    await unmount();
    await act(async () => {
      jest.advanceTimersByTime(90_000);
    });
    expect(mockContar.mock.calls.length).toBe(inicial + 1);
  });

  it('al perder el foco deja de consultar y al recuperarlo vuelve a hacerlo', async () => {
    jest.useFakeTimers();
    mockContar.mockResolvedValue({ cantidad: 1 });
    const { rerender } = await render(<Campanita />);
    mockEnfocada = false;
    await rerender(<Campanita />);
    const alPerderFoco = mockContar.mock.calls.length;
    await act(async () => {
      jest.advanceTimersByTime(90_000);
    });
    expect(mockContar.mock.calls.length).toBe(alPerderFoco);
    mockEnfocada = true;
    await rerender(<Campanita />);
    expect(mockContar.mock.calls.length).toBe(alPerderFoco + 1);
  });

  it('una respuesta vieja no pisa a una más nueva', async () => {
    jest.useFakeTimers();
    let resolverVieja: (v: { cantidad: number }) => void = () => {};
    mockContar
      .mockReturnValueOnce(new Promise((resolver) => (resolverVieja = resolver)))
      .mockResolvedValue({ cantidad: 5 });
    await render(<Campanita />);
    await act(async () => {
      jest.advanceTimersByTime(30_000);
    });
    expect(await screen.findByText('5')).toBeOnTheScreen();
    await act(async () => resolverVieja({ cantidad: 2 }));
    expect(screen.getByText('5')).toBeOnTheScreen();
  });

  it('si falla la consulta conserva el último valor', async () => {
    jest.useFakeTimers();
    mockContar.mockResolvedValueOnce({ cantidad: 4 }).mockRejectedValue(new Error('sin red'));
    await render(<Campanita />);
    expect(await screen.findByText('4')).toBeOnTheScreen();
    await act(async () => {
      jest.advanceTimersByTime(30_000);
    });
    expect(screen.getByText('4')).toBeOnTheScreen();
  });
});
