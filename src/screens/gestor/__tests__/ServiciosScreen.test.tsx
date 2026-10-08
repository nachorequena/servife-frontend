import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { eliminarTipoServicio, listarTiposServicio, type TipoServicio } from '../../../api/catalogo';
import { ApiError } from '../../../api/errores';
import { ServiciosScreen } from '../ServiciosScreen';

jest.mock('../../../api/catalogo', () => ({ listarTiposServicio: jest.fn(), eliminarTipoServicio: jest.fn() }));

const mockNavigate = jest.fn();
const mockFoco: { disparar: () => void } = { disparar: () => undefined };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: (efecto: () => void) => {
    require('react').useEffect(efecto, [efecto]);
    mockFoco.disparar = efecto;
  },
}));

const mockListar = listarTiposServicio as jest.Mock;
const mockEliminar = eliminarTipoServicio as jest.Mock;

const plomero: TipoServicio = { uuid: 't1', nombre: 'Plomero', icono: 'water', requiereMatricula: true };
const jardinero: TipoServicio = { uuid: 't2', nombre: 'Jardinero', icono: 'leaf', requiereMatricula: false };

beforeEach(() => {
  mockListar.mockReset().mockResolvedValue([plomero, jardinero]);
  mockEliminar.mockReset();
  mockNavigate.mockReset();
});

describe('ServiciosScreen', () => {
  it('limpia el error general al volver a cargar con éxito', async () => {
    mockListar.mockReset().mockRejectedValue(new Error('red'));
    await render(<ServiciosScreen />);
    expect(await screen.findByText(/No pudimos conectarnos/)).toBeOnTheScreen();
    mockListar.mockResolvedValue([plomero]);
    await act(async () => mockFoco.disparar());
    expect(await screen.findByText('Plomero')).toBeOnTheScreen();
    expect(screen.queryByText(/No pudimos conectarnos/)).toBeNull();
  });


  it('lista los tipos y marca los que requieren matrícula', async () => {
    await render(<ServiciosScreen />);
    expect(await screen.findByText('Plomero')).toBeOnTheScreen();
    expect(screen.getByText('Jardinero')).toBeOnTheScreen();
    expect(screen.getAllByText('Requiere matrícula')).toHaveLength(1);
    expect(screen.getByText('Pantalla provisoria: sin diseño en la maqueta (D10).')).toBeOnTheScreen();
  });

  it('navega al formulario para añadir y para editar', async () => {
    await render(<ServiciosScreen />);
    await screen.findByText('Plomero');
    await fireEvent.press(screen.getByText('Añadir tipo de servicio'));
    expect(mockNavigate).toHaveBeenCalledWith('FormularioTipoServicio', {});
    await fireEvent.press(screen.getByLabelText('Editar Plomero'));
    expect(mockNavigate).toHaveBeenCalledWith('FormularioTipoServicio', { uuid: 't1' });
  });

  it('dar de baja pide confirmación en pantalla y recarga', async () => {
    mockListar.mockResolvedValueOnce([plomero, jardinero]).mockResolvedValueOnce([jardinero]);
    mockEliminar.mockResolvedValue(undefined);
    await render(<ServiciosScreen />);
    await screen.findByText('Plomero');
    await fireEvent.press(screen.getByLabelText('Dar de baja Plomero'));
    expect(screen.getByText('¿Dar de baja Plomero? Los prestadores ya no podrán elegirlo.')).toBeOnTheScreen();
    expect(mockEliminar).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText('Confirmar'));
    await waitFor(() => expect(mockEliminar).toHaveBeenCalledWith('t1'));
    await waitFor(() => expect(screen.queryByText('Plomero')).toBeNull());
  });

  it('cancelar la baja no llama a B4', async () => {
    await render(<ServiciosScreen />);
    await screen.findByText('Plomero');
    await fireEvent.press(screen.getByLabelText('Dar de baja Plomero'));
    await fireEvent.press(screen.getByText('Cancelar'));
    expect(screen.queryByText('Confirmar')).toBeNull();
    expect(mockEliminar).not.toHaveBeenCalled();
  });

  it('baja en uso muestra el 409 bajo el ítem', async () => {
    mockEliminar.mockRejectedValue(new ApiError(409, 'TIPO_SERVICIO_EN_USO', 'Tiene prestadores activos.'));
    await render(<ServiciosScreen />);
    await screen.findByText('Plomero');
    await fireEvent.press(screen.getByLabelText('Dar de baja Plomero'));
    await fireEvent.press(screen.getByText('Confirmar'));
    expect(await screen.findByText('Tiene prestadores activos.')).toBeOnTheScreen();
    expect(screen.getByText('Plomero')).toBeOnTheScreen();
  });
});
