import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ApiError } from '../../../api/errores';
import { cambiarEstadoDeSolicitud, listarMisSolicitudes, type SolicitudEnLista } from '../../../api/solicitudes';
import { SolicitudesScreen } from '../SolicitudesScreen';

jest.mock('../../../api/solicitudes', () => ({ listarMisSolicitudes: jest.fn(), cambiarEstadoDeSolicitud: jest.fn() }));

const mockNavigate = jest.fn();
const mockNavegacion = { setParams: jest.fn(), navigate: mockNavigate, addListener: () => () => undefined };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavegacion,
  useRoute: () => ({ params: undefined }),
  useFocusEffect: (efecto: () => void | (() => void)) => require('react').useEffect(() => efecto(), [efecto]),
}));

const mockListar = listarMisSolicitudes as jest.Mock;
const mockCambiar = cambiarEstadoDeSolicitud as jest.Mock;

const item = (n: number, extra: Partial<SolicitudEnLista> = {}): SolicitudEnLista => ({
  uuid: `s${n}`,
  estado: 'PENDIENTE',
  contraparte: { uuid: `c${n}`, nombreApellido: `Juan Perez ${n}`, telefono: null },
  tipoServicio: { uuid: 't', nombre: 'Plomero', icono: null } as SolicitudEnLista['tipoServicio'],
  fechaDeseada: '2025-11-11',
  horaPreferida: '10:30',
  descripcion: `El calefón no enciende ${n}`,
  direccion: `Calle ${n} 123`,
  creadoEn: '2025-11-01T10:00:00Z',
  ...extra,
});

const pagina = (contenido: SolicitudEnLista[], numero = 0, totalPaginas = 1) => ({
  contenido,
  pagina: numero,
  tamanio: 20,
  totalElementos: contenido.length,
  totalPaginas,
});

beforeEach(() => {
  mockNavigate.mockReset();
  mockListar.mockReset();
  mockCambiar.mockReset();
  mockListar.mockResolvedValue(pagina([]));
});

describe('SolicitudesScreen', () => {
  it('pide las pendientes por defecto y muestra la tarjeta', async () => {
    mockListar.mockResolvedValue(pagina([item(1)]));
    await render(<SolicitudesScreen />);
    expect(await screen.findByText('Juan Perez 1')).toBeOnTheScreen();
    expect(mockListar).toHaveBeenCalledWith(expect.objectContaining({ estados: ['PENDIENTE'], page: 0 }));
    expect(screen.getByText('Calle 1 123')).toBeOnTheScreen();
    expect(screen.getByText('11/11/2025 · 10:30')).toBeOnTheScreen();
    expect(screen.getByText('El calefón no enciende 1')).toBeOnTheScreen();
    expect(screen.getByText('ACEPTAR')).toBeOnTheScreen();
    expect(screen.getByText('RECHAZAR')).toBeOnTheScreen();
  });

  it('sin hora preferida muestra solo la fecha', async () => {
    mockListar.mockResolvedValue(pagina([item(1, { horaPreferida: null })]));
    await render(<SolicitudesScreen />);
    expect(await screen.findByText('11/11/2025')).toBeOnTheScreen();
  });

  it('vacío de pendientes', async () => {
    await render(<SolicitudesScreen />);
    expect(await screen.findByText('No tenés solicitudes pendientes.')).toBeOnTheScreen();
  });

  it.each([
    ['Aceptadas', ['ACEPTADA']],
    ['En curso', ['EN_CURSO']],
  ])('el chip %s pide %j, sin botones y con el vacío genérico', async (etiqueta, estados) => {
    await render(<SolicitudesScreen />);
    await screen.findByText('No tenés solicitudes pendientes.');
    mockListar.mockResolvedValue(pagina([item(1, { estado: estados[0] as SolicitudEnLista['estado'] })]));
    await fireEvent.press(screen.getByLabelText(etiqueta));
    await waitFor(() => expect(mockListar).toHaveBeenLastCalledWith(expect.objectContaining({ estados, page: 0 })));
    expect(await screen.findByText('Juan Perez 1')).toBeOnTheScreen();
    expect(screen.queryByText('ACEPTAR')).toBeNull();
    expect(screen.queryByText('RECHAZAR')).toBeNull();
    mockListar.mockResolvedValue(pagina([]));
    await fireEvent.press(screen.getByLabelText('Pendientes'));
    await fireEvent.press(screen.getByLabelText(etiqueta));
    expect(await screen.findByText('No hay solicitudes en este estado.')).toBeOnTheScreen();
  });

  it('tocar la tarjeta abre el detalle y ACEPTAR lo abre con el precio', async () => {
    mockListar.mockResolvedValue(pagina([item(1)]));
    await render(<SolicitudesScreen />);
    await fireEvent.press(await screen.findByText('Juan Perez 1'));
    expect(mockNavigate).toHaveBeenLastCalledWith('DetalleSolicitud', { uuidSolicitud: 's1' });
    mockNavigate.mockReset();
    await fireEvent.press(screen.getByText('ACEPTAR'));
    expect(mockNavigate).toHaveBeenCalledWith('DetalleSolicitud', { uuidSolicitud: 's1', accion: 'ACEPTAR' });
  });

  it('RECHAZAR pide confirmación, envía el motivo, quita la tarjeta y avisa', async () => {
    mockListar.mockResolvedValue(pagina([item(1), item(2)]));
    mockCambiar.mockResolvedValue({});
    await render(<SolicitudesScreen />);
    await fireEvent.press((await screen.findAllByText('RECHAZAR'))[0]);
    expect(mockCambiar).not.toHaveBeenCalled();
    await fireEvent.changeText(screen.getByLabelText('Motivo (opcional)'), 'No llego esa semana');
    await fireEvent.press(screen.getByText('Confirmar rechazo'));
    await waitFor(() =>
      expect(mockCambiar).toHaveBeenCalledWith('s1', { accion: 'RECHAZAR', motivo: 'No llego esa semana' }),
    );
    expect(await screen.findByText('Solicitud rechazada.')).toBeOnTheScreen();
    expect(screen.queryByText('Juan Perez 1')).toBeNull();
    expect(screen.getByText('Juan Perez 2')).toBeOnTheScreen();
  });

  it('Volver cancela el rechazo; sin motivo no lo envía', async () => {
    mockListar.mockResolvedValue(pagina([item(1)]));
    mockCambiar.mockResolvedValue({});
    await render(<SolicitudesScreen />);
    await fireEvent.press(await screen.findByText('RECHAZAR'));
    await fireEvent.press(screen.getByText('Volver'));
    expect(screen.queryByText('Confirmar rechazo')).toBeNull();
    expect(screen.getByText('ACEPTAR')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('RECHAZAR'));
    await fireEvent.press(screen.getByText('Confirmar rechazo'));
    await waitFor(() => expect(mockCambiar).toHaveBeenCalledWith('s1', { accion: 'RECHAZAR' }));
  });

  it('si el rechazo falla muestra el error en la tarjeta y la conserva', async () => {
    mockListar.mockResolvedValue(pagina([item(1)]));
    mockCambiar.mockRejectedValue(new ApiError(409, 'TRANSICION_INVALIDA', 'La solicitud ya no está pendiente.'));
    await render(<SolicitudesScreen />);
    await fireEvent.press(await screen.findByText('RECHAZAR'));
    await fireEvent.press(screen.getByText('Confirmar rechazo'));
    expect(await screen.findByText('La solicitud ya no está pendiente.')).toBeOnTheScreen();
    expect(screen.getByText('Juan Perez 1')).toBeOnTheScreen();
    expect(screen.queryByText('Solicitud rechazada.')).toBeNull();
  });

  it('error de carga con Reintentar', async () => {
    mockListar.mockRejectedValueOnce(new ApiError(500, 'X', 'boom'));
    await render(<SolicitudesScreen />);
    expect(await screen.findByText('No pudimos cargar las solicitudes.')).toBeOnTheScreen();
    mockListar.mockResolvedValue(pagina([item(1)]));
    await fireEvent.press(screen.getByText('Reintentar'));
    expect(await screen.findByText('Juan Perez 1')).toBeOnTheScreen();
  });
});
