import { render, screen, userEvent, waitFor } from '@testing-library/react-native';

import {
  actualizarMiPerfilDePrestador,
  listarTiposServicio,
  obtenerMiPerfilDeServicio,
  type PerfilDeServicio,
} from '../../../api/catalogo';
import { obtenerDisponibilidad, reemplazarMiDisponibilidad } from '../../../api/disponibilidad';
import { ApiError } from '../../../api/errores';
import { obtenerUbicacionActual } from '../../../hooks/useUbicacion';
import { MiServicio } from '../MiServicio';

jest.mock('../../../api/catalogo', () => ({
  listarTiposServicio: jest.fn(),
  obtenerMiPerfilDeServicio: jest.fn(),
  actualizarMiPerfilDePrestador: jest.fn(),
}));
jest.mock('../../../api/disponibilidad', () => ({
  obtenerDisponibilidad: jest.fn(),
  reemplazarMiDisponibilidad: jest.fn(),
}));
jest.mock('../../../hooks/useUbicacion', () => ({ obtenerUbicacionActual: jest.fn() }));
jest.mock('../../../store/sesion', () => ({
  useSesion: () => ({ sesion: { rol: 'PRESTADOR', usuario: { uuid: 'p1' } } }),
}));

const mockTipos = listarTiposServicio as jest.Mock;
const mockPerfil = obtenerMiPerfilDeServicio as jest.Mock;
const mockB7 = actualizarMiPerfilDePrestador as jest.Mock;
const mockC5 = obtenerDisponibilidad as jest.Mock;
const mockB8 = reemplazarMiDisponibilidad as jest.Mock;
const mockUbicacion = obtenerUbicacionActual as jest.Mock;

const plomeria = { uuid: 't1', nombre: 'Plomería', icono: 'water', requiereMatricula: true };
const electricidad = { uuid: 't2', nombre: 'Electricidad', icono: 'flash', requiereMatricula: true };
const perfil: PerfilDeServicio = {
  idTipoServicio: 't1',
  tipoServicio: plomeria,
  zona: 'Centro',
  lat: -31.6,
  lng: -60.7,
  radioKm: 10,
  descripcion: 'Hago de todo',
  estadoValidacion: 'APROBADO',
};

beforeEach(() => {
  jest.resetAllMocks();
  mockTipos.mockResolvedValue([plomeria, electricidad]);
  mockPerfil.mockResolvedValue(perfil);
  mockC5.mockResolvedValue({ dias: [1, 3] });
  mockB7.mockResolvedValue(perfil);
  mockB8.mockResolvedValue({ dias: [1, 3] });
});

describe('MiServicio', () => {
  it('precarga el perfil y la disponibilidad', async () => {
    await render(<MiServicio />);
    expect(await screen.findByDisplayValue('Centro')).toBeTruthy();
    expect(screen.getByDisplayValue('10')).toBeTruthy();
    expect(screen.getByDisplayValue('Hago de todo')).toBeTruthy();
    expect(screen.getByText('Perfil aprobado. Aparecés en las búsquedas.')).toBeTruthy();
    expect(screen.getByText('Ubicación guardada')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Lunes' }).props.accessibilityState.selected).toBe(true);
    expect(screen.getByRole('button', { name: 'Martes' }).props.accessibilityState.selected).toBe(false);
    expect(mockC5).toHaveBeenCalledWith('p1');
  });

  it('guarda B7 y B8 con el payload y muestra Datos guardados', async () => {
    const user = userEvent.setup();
    await render(<MiServicio />);
    await screen.findByDisplayValue('Centro');
    await user.clear(screen.getByLabelText('Zona'));
    await user.type(screen.getByLabelText('Zona'), 'Norte');
    await user.press(screen.getByRole('button', { name: 'Martes' }));
    await user.press(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Datos guardados.')).toBeTruthy();
    expect(mockB7).toHaveBeenCalledWith({
      idTipoServicio: 't1',
      zona: 'Norte',
      lat: -31.6,
      lng: -60.7,
      radioKm: 10,
      descripcion: 'Hago de todo',
    });
    expect(mockB8).toHaveBeenCalledWith([1, 2, 3]);
  });

  it('cambiar de rubro avisa y el estado pasa a PENDIENTE al guardar', async () => {
    const user = userEvent.setup();
    mockB7.mockResolvedValue({
      ...perfil,
      idTipoServicio: 't2',
      tipoServicio: electricidad,
      estadoValidacion: 'PENDIENTE',
    });
    await render(<MiServicio />);
    await screen.findByDisplayValue('Centro');
    expect(screen.queryByText('Si cambiás el servicio, tu perfil vuelve a revisión.')).toBeNull();
    await user.press(screen.getByRole('button', { name: 'Electricidad' }));
    expect(screen.getByText('Si cambiás el servicio, tu perfil vuelve a revisión.')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Tu perfil está en revisión. Todavía no aparecés en las búsquedas.')).toBeTruthy();
    expect(mockB7.mock.calls[0][0].idTipoServicio).toBe('t2');
  });

  it('sin permiso de ubicación muestra el mensaje', async () => {
    const user = userEvent.setup();
    mockPerfil.mockResolvedValue({ ...perfil, lat: null, lng: null });
    mockUbicacion.mockResolvedValue(null);
    await render(<MiServicio />);
    await screen.findByDisplayValue('Centro');
    expect(screen.queryByText('Ubicación guardada')).toBeNull();
    await user.press(screen.getByRole('button', { name: 'Usar mi ubicación actual' }));
    expect(await screen.findByText('No pudimos obtener tu ubicación.')).toBeTruthy();
  });

  it('con permiso toma las coordenadas del dispositivo y solo las envía si están', async () => {
    const user = userEvent.setup();
    mockPerfil.mockResolvedValue({ ...perfil, lat: null, lng: null, radioKm: null });
    mockUbicacion.mockResolvedValue({ lat: 1, lng: 2 });
    await render(<MiServicio />);
    await screen.findByDisplayValue('Centro');
    await user.press(screen.getByRole('button', { name: 'Guardar' }));
    await screen.findByText('Datos guardados.');
    expect(mockB7.mock.calls[0][0]).not.toHaveProperty('lat');
    expect(mockB7.mock.calls[0][0]).not.toHaveProperty('radioKm');
    await user.press(screen.getByRole('button', { name: 'Usar mi ubicación actual' }));
    expect(await screen.findByText('Ubicación guardada')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(mockB7).toHaveBeenCalledTimes(2));
    expect(mockB7.mock.calls[1][0]).toMatchObject({ lat: 1, lng: 2 });
  });

  it('valida el radio localmente', async () => {
    const user = userEvent.setup();
    await render(<MiServicio />);
    await screen.findByDisplayValue('Centro');
    await user.clear(screen.getByLabelText('Radio en km'));
    await user.type(screen.getByLabelText('Radio en km'), '101');
    await user.press(screen.getByRole('button', { name: 'Guardar' }));
    expect(screen.getByText('tiene que ser un número entre 1 y 100')).toBeTruthy();
    expect(mockB7).not.toHaveBeenCalled();
  });

  it('muestra los errores por campo del backend', async () => {
    const user = userEvent.setup();
    mockB7.mockRejectedValue(new ApiError(400, 'VALIDACION', 'Datos inválidos', [{ campo: 'zona', detalle: 'es obligatoria' }]));
    await render(<MiServicio />);
    await screen.findByDisplayValue('Centro');
    await user.press(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('es obligatoria')).toBeTruthy();
    expect(mockB8).not.toHaveBeenCalled();
  });

  it('ante un fallo de red avisa', async () => {
    const user = userEvent.setup();
    mockB7.mockRejectedValue(new Error('network'));
    await render(<MiServicio />);
    await screen.findByDisplayValue('Centro');
    await user.press(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.')).toBeTruthy();
  });
});
