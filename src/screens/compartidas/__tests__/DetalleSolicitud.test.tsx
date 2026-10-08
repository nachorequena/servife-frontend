import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ApiError } from '../../../api/errores';
import {
  cambiarEstadoDeSolicitud,
  obtenerSolicitud,
  type AccionSobreSolicitud,
  type Solicitud,
} from '../../../api/solicitudes';
import { DetalleSolicitud } from '../DetalleSolicitud';

jest.mock('../../../api/solicitudes', () => ({ obtenerSolicitud: jest.fn(), cambiarEstadoDeSolicitud: jest.fn() }));
jest.mock('../../../components/ImagenProtegida', () => ({
  ImagenProtegida: ({ uuid }: { uuid: string }) =>
    require('react').createElement(require('react-native').Text, null, `img:${uuid}`),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (efecto: () => void | (() => void)) => require('react').useEffect(() => efecto(), [efecto]),
}));

let mockRol = 'CLIENTE';
jest.mock('../../../store/sesion', () => ({ useSesion: () => ({ sesion: { rol: mockRol } }) }));

const mockObtener = obtenerSolicitud as jest.Mock;
const mockCambiar = cambiarEstadoDeSolicitud as jest.Mock;

const base = (cambios: Partial<Solicitud> = {}): Solicitud => ({
  uuid: 's1',
  estado: 'PENDIENTE',
  cliente: { uuid: 'c1', nombreApellido: 'Clara Cliente', telefono: null },
  prestador: { uuid: 'p1', nombreApellido: 'Pablo Prestador', telefono: null },
  tipoServicio: { uuid: 't', nombre: 'Plomero', icono: null } as Solicitud['tipoServicio'],
  fechaDeseada: '2026-10-09',
  horaPreferida: 'a la mañana',
  direccion: 'Calle 1',
  descripcion: 'Pierde el caño',
  imagenIds: ['i1', 'i2'],
  precioAcordado: null,
  motivo: null,
  canceladaPor: null,
  creadoEn: '2026-10-01T10:00:00Z',
  actualizadoEn: '2026-10-01T10:00:00Z',
  accionesDisponibles: [],
  ...cambios,
});

const con = (acciones: AccionSobreSolicitud[], cambios: Partial<Solicitud> = {}) =>
  base({ accionesDisponibles: acciones, ...cambios });

beforeEach(() => {
  mockObtener.mockReset();
  mockCambiar.mockReset();
  mockRol = 'CLIENTE';
});

async function abrir(s: Solicitud) {
  mockObtener.mockResolvedValue(s);
  await render(<DetalleSolicitud uuidSolicitud="s1" />);
  await screen.findByText('Plomero');
}

describe('DetalleSolicitud', () => {
  it('muestra los datos, la contraparte según el rol y las imágenes', async () => {
    await abrir(base());
    expect(screen.getByText('Pantalla provisoria: sin diseño en la maqueta (D10).')).toBeOnTheScreen();
    expect(screen.getByText('Pendiente')).toBeOnTheScreen();
    expect(screen.getByText('Pablo Prestador')).toBeOnTheScreen();
    expect(screen.queryByText('Clara Cliente')).toBeNull();
    expect(screen.getByText('09/10/2026')).toBeOnTheScreen();
    expect(screen.getByText('a la mañana')).toBeOnTheScreen();
    expect(screen.getByText('Calle 1')).toBeOnTheScreen();
    expect(screen.getByText('Pierde el caño')).toBeOnTheScreen();
    expect(screen.getByText('img:i1')).toBeOnTheScreen();
    expect(screen.getByText('img:i2')).toBeOnTheScreen();
    expect(screen.queryByText(/Teléfono/)).toBeNull();
  });

  it('el prestador ve al cliente, con teléfono si está, precio y motivo', async () => {
    mockRol = 'PRESTADOR';
    await abrir(
      base({
        estado: 'CANCELADA',
        cliente: { uuid: 'c1', nombreApellido: 'Clara Cliente', telefono: '3425551234' },
        precioAcordado: 800000,
        motivo: 'Ya no lo necesito',
        canceladaPor: 'CLIENTE',
      }),
    );
    expect(screen.getByText('Clara Cliente')).toBeOnTheScreen();
    expect(screen.getByText('Teléfono: 3425551234')).toBeOnTheScreen();
    expect(screen.getByText('$ 8.000')).toBeOnTheScreen();
    expect(screen.getByText('Ya no lo necesito')).toBeOnTheScreen();
    expect(screen.getByText('Cancelada por el cliente')).toBeOnTheScreen();
  });

  it('solo aparecen las acciones disponibles', async () => {
    await abrir(con(['CANCELAR']));
    expect(screen.getByText('Cancelar solicitud')).toBeOnTheScreen();
    expect(screen.queryByText('Aceptar')).toBeNull();
    expect(screen.queryByText('Rechazar')).toBeNull();
    expect(screen.queryByText('Iniciar trabajo')).toBeNull();
  });

  it('sin acciones no hay botones', async () => {
    await abrir(base());
    expect(screen.queryByText('Cancelar solicitud')).toBeNull();
  });

  it('CANCELAR pide confirmación con motivo opcional y manda la acción', async () => {
    await abrir(con(['CANCELAR']));
    await fireEvent.press(screen.getByText('Cancelar solicitud'));
    expect(mockCambiar).not.toHaveBeenCalled();
    mockCambiar.mockResolvedValue(base({ estado: 'CANCELADA', canceladaPor: 'CLIENTE', motivo: 'Cambié de idea' }));
    await fireEvent.changeText(screen.getByLabelText('Motivo (opcional)'), 'Cambié de idea');
    await fireEvent.press(screen.getByText('Confirmar cancelación'));
    await waitFor(() => expect(mockCambiar).toHaveBeenCalledWith('s1', { accion: 'CANCELAR', motivo: 'Cambié de idea' }));
    expect(await screen.findByText('Listo.')).toBeOnTheScreen();
    expect(screen.getByText('Cancelada por el cliente')).toBeOnTheScreen();
    expect(mockObtener).toHaveBeenCalledTimes(1);
  });

  it('CANCELAR sin motivo no manda motivo', async () => {
    await abrir(con(['CANCELAR']));
    await fireEvent.press(screen.getByText('Cancelar solicitud'));
    mockCambiar.mockResolvedValue(base({ estado: 'CANCELADA' }));
    await fireEvent.press(screen.getByText('Confirmar cancelación'));
    await waitFor(() => expect(mockCambiar).toHaveBeenCalledWith('s1', { accion: 'CANCELAR' }));
  });

  it('RECHAZAR manda la acción con el motivo', async () => {
    mockRol = 'PRESTADOR';
    await abrir(con(['ACEPTAR', 'RECHAZAR']));
    await fireEvent.press(screen.getByText('Rechazar'));
    mockCambiar.mockResolvedValue(base({ estado: 'RECHAZADA' }));
    await fireEvent.changeText(screen.getByLabelText('Motivo (opcional)'), 'No llego');
    await fireEvent.press(screen.getByText('Confirmar rechazo'));
    await waitFor(() => expect(mockCambiar).toHaveBeenCalledWith('s1', { accion: 'RECHAZAR', motivo: 'No llego' }));
  });

  it.each([
    ['8000', 800000],
    ['1500,5', 150050],
    ['1500,50', 150050],
    ['99,05', 9905],
    ['8.000', 800000],
    ['1.234,56', 123456],
    ['0', 0],
  ])('ACEPTAR convierte "%s" pesos a %i centavos', async (texto, centavos) => {
    mockRol = 'PRESTADOR';
    await abrir(con(['ACEPTAR', 'RECHAZAR']));
    await fireEvent.press(screen.getByText('Aceptar'));
    mockCambiar.mockResolvedValue(base({ estado: 'ACEPTADA', precioAcordado: centavos }));
    await fireEvent.changeText(screen.getByLabelText('Precio acordado (opcional)'), texto);
    await fireEvent.press(screen.getByText('Confirmar'));
    await waitFor(() => expect(mockCambiar).toHaveBeenCalledWith('s1', { accion: 'ACEPTAR', precioAcordado: centavos }));
  });

  it('ACEPTAR sin precio no manda precio', async () => {
    mockRol = 'PRESTADOR';
    await abrir(con(['ACEPTAR', 'RECHAZAR']));
    await fireEvent.press(screen.getByText('Aceptar'));
    mockCambiar.mockResolvedValue(base({ estado: 'ACEPTADA' }));
    await fireEvent.press(screen.getByText('Confirmar'));
    await waitFor(() => expect(mockCambiar).toHaveBeenCalledWith('s1', { accion: 'ACEPTAR' }));
  });

  it('ACEPTAR con precio inválido no llama al backend', async () => {
    mockRol = 'PRESTADOR';
    await abrir(con(['ACEPTAR', 'RECHAZAR']));
    await fireEvent.press(screen.getByText('Aceptar'));
    await fireEvent.changeText(screen.getByLabelText('Precio acordado (opcional)'), 'mucho');
    await fireEvent.press(screen.getByText('Confirmar'));
    expect(await screen.findByText('Ingresá un monto válido')).toBeOnTheScreen();
    expect(mockCambiar).not.toHaveBeenCalled();
  });

  it.each([
    ['INICIAR', 'Iniciar trabajo'],
    ['FINALIZAR', 'Finalizar trabajo'],
  ] as const)('%s pide confirmación y manda la acción', async (accion, etiqueta) => {
    mockRol = 'PRESTADOR';
    await abrir(con([accion]));
    await fireEvent.press(screen.getByText(etiqueta));
    expect(mockCambiar).not.toHaveBeenCalled();
    mockCambiar.mockResolvedValue(base({ estado: 'EN_CURSO' }));
    await fireEvent.press(screen.getByText('Confirmar'));
    await waitFor(() => expect(mockCambiar).toHaveBeenCalledWith('s1', { accion }));
  });

  it('TRANSICION_INVALIDA muestra el mensaje y recarga el detalle', async () => {
    mockRol = 'PRESTADOR';
    await abrir(con(['INICIAR']));
    await fireEvent.press(screen.getByText('Iniciar trabajo'));
    mockCambiar.mockRejectedValue(
      new ApiError(409, 'TRANSICION_INVALIDA', 'La solicitud cambió mientras tanto. Recargala.'),
    );
    mockObtener.mockResolvedValue(base({ estado: 'CANCELADA', canceladaPor: 'CLIENTE' }));
    await fireEvent.press(screen.getByText('Confirmar'));
    expect(await screen.findByText('La solicitud cambió mientras tanto. Recargala.')).toBeOnTheScreen();
    await waitFor(() => expect(mockObtener).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Cancelada por el cliente')).toBeOnTheScreen();
  });

  it('otros errores muestran el mensaje sin recargar', async () => {
    await abrir(con(['CANCELAR']));
    await fireEvent.press(screen.getByText('Cancelar solicitud'));
    mockCambiar.mockRejectedValue(new ApiError(403, 'ACCESO_DENEGADO', 'No tenés acceso.'));
    await fireEvent.press(screen.getByText('Confirmar cancelación'));
    expect(await screen.findByText('No tenés acceso.')).toBeOnTheScreen();
    expect(mockObtener).toHaveBeenCalledTimes(1);
  });

  it('error al cargar con Reintentar', async () => {
    mockObtener.mockRejectedValueOnce(new ApiError(404, 'X', 'No existe.'));
    await render(<DetalleSolicitud uuidSolicitud="s1" />);
    expect(await screen.findByText('No existe.')).toBeOnTheScreen();
    mockObtener.mockResolvedValue(base());
    await fireEvent.press(screen.getByText('Reintentar'));
    expect(await screen.findByText('Plomero')).toBeOnTheScreen();
  });

  it('un doble toque en Confirmar manda una sola vez', async () => {
    await abrir(con(['CANCELAR']));
    await fireEvent.press(screen.getByText('Cancelar solicitud'));
    let resolver: (s: Solicitud) => void = () => undefined;
    mockCambiar.mockReturnValue(new Promise<Solicitud>((r) => (resolver = r)));
    await fireEvent.press(screen.getByText('Confirmar cancelación'));
    await fireEvent.press(screen.getByText('Confirmar cancelación'));
    expect(mockCambiar).toHaveBeenCalledTimes(1);
    resolver(base({ estado: 'CANCELADA' }));
    expect(await screen.findByText('Listo.')).toBeOnTheScreen();
  });

  it('una recarga fallida con datos en pantalla muestra un error en línea', async () => {
    await abrir(con(['INICIAR']));
    await fireEvent.press(screen.getByText('Iniciar trabajo'));
    mockCambiar.mockRejectedValue(new ApiError(409, 'TRANSICION_INVALIDA', 'Cambió.'));
    mockObtener.mockRejectedValue(new ApiError(500, 'X', 'boom'));
    await fireEvent.press(screen.getByText('Confirmar'));
    expect(await screen.findByText('No pudimos actualizar la solicitud.')).toBeOnTheScreen();
    expect(screen.getByText('Plomero')).toBeOnTheScreen();
  });
});
