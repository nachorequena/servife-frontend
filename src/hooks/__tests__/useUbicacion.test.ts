import { renderHook, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';

import { useUbicacion } from '../useUbicacion';

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

const mockPermiso = Location.requestForegroundPermissionsAsync as jest.Mock;
const mockPosicion = Location.getCurrentPositionAsync as jest.Mock;

beforeEach(() => {
  mockPermiso.mockReset();
  mockPosicion.mockReset();
});

describe('useUbicacion', () => {
  it('con permiso devuelve la posición', async () => {
    mockPermiso.mockResolvedValue({ status: 'granted' });
    mockPosicion.mockResolvedValue({ coords: { latitude: -31.6, longitude: -60.7 } });
    const { result } = await renderHook(() => useUbicacion());
    await waitFor(() => expect(result.current.estado).toBe('concedida'));
    expect(result.current.ubicacion).toEqual({ lat: -31.6, lng: -60.7 });
    expect(mockPosicion).toHaveBeenCalledWith({ accuracy: 3 });
  });

  it('sin permiso devuelve null y no pide la posición', async () => {
    mockPermiso.mockResolvedValue({ status: 'denied' });
    const { result } = await renderHook(() => useUbicacion());
    await waitFor(() => expect(result.current.estado).toBe('denegada'));
    expect(result.current.ubicacion).toBeNull();
    expect(mockPosicion).not.toHaveBeenCalled();
  });

  it('si falla no rompe', async () => {
    mockPermiso.mockResolvedValue({ status: 'granted' });
    mockPosicion.mockRejectedValue(new Error('sin gps'));
    const { result } = await renderHook(() => useUbicacion());
    await waitFor(() => expect(result.current.estado).toBe('error'));
    expect(result.current.ubicacion).toBeNull();
  });
});
