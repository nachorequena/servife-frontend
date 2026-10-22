import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { listarConversaciones, type Conversacion } from '../../../api/mensajeria';
import type { Pagina } from '../../../api/paginacion';
import { MensajesScreen } from '../MensajesScreen';

jest.mock('../../../api/mensajeria', () => ({ listarConversaciones: jest.fn() }));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: (efecto: () => void | (() => void)) => require('react').useEffect(() => efecto(), [efecto]),
}));

const mockListar = listarConversaciones as jest.Mock;

const conversacion = (n: number, cambios: Partial<Conversacion> = {}): Conversacion => ({
  uuidChat: `chat-${n}`,
  uuidSolicitud: `s${n}`,
  estadoSolicitud: 'ACEPTADA',
  tipoServicio: 'Plomería',
  contraparte: { uuid: `p${n}`, nombreApellido: `Persona ${n}` },
  ultimoMensaje: { texto: `Mensaje ${n}`, creadoEn: '2026-10-21T13:00:00Z', propio: false },
  noLeidos: 0,
  ...cambios,
});

const pagina = (contenido: Conversacion[], numero = 0, totalPaginas = 1): Pagina<Conversacion> => ({
  contenido,
  pagina: numero,
  tamanio: 20,
  totalElementos: contenido.length,
  totalPaginas,
});

beforeEach(() => {
  mockListar.mockReset();
  mockNavigate.mockReset();
});

describe('MensajesScreen', () => {
  it('lista los chats con la contraparte, el servicio, el último mensaje y los no leídos', async () => {
    mockListar.mockResolvedValue(
      pagina([
        conversacion(1, { noLeidos: 3 }),
        conversacion(2, { ultimoMensaje: { texto: 'Te espero', creadoEn: '2026-10-21T12:00:00Z', propio: true } }),
        conversacion(3, { ultimoMensaje: null }),
      ]),
    );
    await render(<MensajesScreen />);

    expect(await screen.findByText('Persona 1')).toBeOnTheScreen();
    expect(screen.getAllByText('Plomería')).toHaveLength(3);
    expect(screen.getByText('Mensaje 1')).toBeOnTheScreen();
    expect(screen.getByLabelText('3 sin leer')).toBeOnTheScreen();
    expect(screen.getByText('Vos: Te espero')).toBeOnTheScreen();
    expect(screen.getByText('Sin mensajes todavía')).toBeOnTheScreen();
    expect(mockListar).toHaveBeenCalledWith({ page: 0, size: 20 });
  });

  it('muestra 9+ con más de nueve sin leer', async () => {
    mockListar.mockResolvedValue(pagina([conversacion(1, { noLeidos: 12 })]));
    await render(<MensajesScreen />);
    expect(await screen.findByText('9+')).toBeOnTheScreen();
  });

  it('tocar un chat lo abre', async () => {
    mockListar.mockResolvedValue(pagina([conversacion(1)]));
    await render(<MensajesScreen />);
    await fireEvent.press(await screen.findByText('Persona 1'));
    expect(mockNavigate).toHaveBeenCalledWith('Chat', { uuidChat: 'chat-1' });
  });

  it('muestra el vacío', async () => {
    mockListar.mockResolvedValue(pagina([]));
    await render(<MensajesScreen />);
    expect(await screen.findByText('Todavía no tenés conversaciones. Cada solicitud tiene su chat.')).toBeOnTheScreen();
  });

  it('muestra el error y reintenta', async () => {
    mockListar.mockRejectedValueOnce(new Error('sin red')).mockResolvedValue(pagina([conversacion(1)]));
    await render(<MensajesScreen />);
    await fireEvent.press(await screen.findByText('Reintentar'));
    expect(await screen.findByText('Persona 1')).toBeOnTheScreen();
  });

  it('si falla el pull-to-refresh conserva la lista y avisa', async () => {
    mockListar.mockResolvedValueOnce(pagina([conversacion(1)]));
    await render(<MensajesScreen />);
    expect(await screen.findByText('Persona 1')).toBeOnTheScreen();

    mockListar.mockRejectedValueOnce(new Error('sin red'));
    await act(async () => screen.getByTestId('lista-conversaciones').props.refreshControl.props.onRefresh());

    expect(await screen.findByText('No pudimos actualizar los mensajes.')).toBeOnTheScreen();
    expect(screen.getByText('Persona 1')).toBeOnTheScreen();
  });

  it('carga la página siguiente al llegar al final sin repetir', async () => {
    mockListar
      .mockResolvedValueOnce(pagina([conversacion(1)], 0, 2))
      .mockResolvedValueOnce(pagina([conversacion(1), conversacion(2)], 1, 2));
    await render(<MensajesScreen />);
    await screen.findByText('Persona 1');
    await act(async () => screen.getByTestId('lista-conversaciones').props.onEndReached());

    expect(await screen.findByText('Persona 2')).toBeOnTheScreen();
    expect(screen.getAllByText('Persona 1')).toHaveLength(1);
    expect(mockListar).toHaveBeenLastCalledWith({ page: 1, size: 20 });
  });
});
