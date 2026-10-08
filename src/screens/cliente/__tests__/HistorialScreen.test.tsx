import { act, render, screen } from '@testing-library/react-native';

import { HistorialScreen } from '../HistorialScreen';

const mockSetParams = jest.fn();
let mockParams: { aviso?: string } | undefined;
const mockNavegacion = { setParams: mockSetParams, addListener: () => () => undefined };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavegacion,
  useRoute: () => ({ params: mockParams }),
}));

beforeEach(() => {
  mockSetParams.mockReset();
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

describe('HistorialScreen', () => {
  it('muestra el aviso, limpia el parámetro y lo oculta a los 4 s', async () => {
    mockParams = { aviso: 'Solicitud enviada.' };
    await render(<HistorialScreen />);
    expect(screen.getByText('Solicitud enviada.')).toBeOnTheScreen();
    expect(mockSetParams).toHaveBeenCalledWith({ aviso: undefined });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(4100);
    });
    expect(screen.queryByText('Solicitud enviada.')).toBeNull();
  });

  it('sin aviso no muestra nada', async () => {
    mockParams = undefined;
    await render(<HistorialScreen />);
    expect(screen.queryByText('Solicitud enviada.')).toBeNull();
    expect(mockSetParams).not.toHaveBeenCalled();
  });
});
