import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import {
  actualizarTipoServicio,
  crearTipoServicio,
  listarTiposServicio,
  type TipoServicio,
} from '../../../api/catalogo';
import { ApiError } from '../../../api/errores';
import { FormularioTipoServicio } from '../FormularioTipoServicio';

jest.mock('../../../api/catalogo', () => ({
  listarTiposServicio: jest.fn(),
  crearTipoServicio: jest.fn(),
  actualizarTipoServicio: jest.fn(),
}));

const mockGoBack = jest.fn();
let mockParams: { uuid?: string };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({ params: mockParams }),
}));

const mockCrear = crearTipoServicio as jest.Mock;
const mockActualizar = actualizarTipoServicio as jest.Mock;
const mockListar = listarTiposServicio as jest.Mock;

const plomero: TipoServicio = { uuid: 't1', nombre: 'Plomero', icono: 'water', requiereMatricula: true };

beforeEach(() => {
  mockParams = {};
  mockGoBack.mockReset();
  mockCrear.mockReset();
  mockActualizar.mockReset();
  mockListar.mockReset().mockResolvedValue([plomero]);
});

describe('FormularioTipoServicio', () => {
  it('crea un tipo con nombre, ícono y matrícula', async () => {
    mockCrear.mockResolvedValue({ ...plomero, uuid: 'nuevo' });
    await render(<FormularioTipoServicio />);
    await fireEvent.changeText(screen.getByLabelText('Nombre'), 'Electricista');
    await fireEvent.press(screen.getByLabelText('Ícono flash'));
    await fireEvent(screen.getByLabelText('Requiere matrícula'), 'valueChange', true);
    await fireEvent.press(screen.getByText('Guardar'));
    await waitFor(() =>
      expect(mockCrear).toHaveBeenCalledWith({ nombre: 'Electricista', icono: 'flash', requiereMatricula: true }),
    );
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('crear duplicado muestra el error bajo Nombre', async () => {
    mockCrear.mockRejectedValue(
      new ApiError(409, 'TIPO_SERVICIO_DUPLICADO', 'Duplicado', [
        { campo: 'nombre', detalle: 'Ya existe un tipo con ese nombre' },
      ]),
    );
    await render(<FormularioTipoServicio />);
    await fireEvent.changeText(screen.getByLabelText('Nombre'), 'Plomero');
    await fireEvent.press(screen.getByLabelText('Ícono water'));
    await fireEvent.press(screen.getByText('Guardar'));
    expect(await screen.findByText('Ya existe un tipo con ese nombre')).toBeOnTheScreen();
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('exige nombre e ícono antes de enviar', async () => {
    await render(<FormularioTipoServicio />);
    await fireEvent.press(screen.getByText('Guardar'));
    expect(await screen.findByText('Ingresá un nombre')).toBeOnTheScreen();
    expect(screen.getByText('Elegí un ícono')).toBeOnTheScreen();
    expect(mockCrear).not.toHaveBeenCalled();
  });

  it('edita un tipo existente precargado', async () => {
    mockParams = { uuid: 't1' };
    mockActualizar.mockResolvedValue(plomero);
    await render(<FormularioTipoServicio />);
    await waitFor(() => expect(screen.getByLabelText('Nombre').props.value).toBe('Plomero'));
    await fireEvent.changeText(screen.getByLabelText('Nombre'), 'Plomero gasista');
    await fireEvent.press(screen.getByText('Guardar'));
    await waitFor(() =>
      expect(mockActualizar).toHaveBeenCalledWith('t1', {
        nombre: 'Plomero gasista',
        icono: 'water',
        requiereMatricula: true,
      }),
    );
    expect(mockGoBack).toHaveBeenCalled();
  });
});
