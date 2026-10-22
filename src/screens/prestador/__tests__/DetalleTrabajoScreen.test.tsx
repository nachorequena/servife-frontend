import { fireEvent, render, screen } from '@testing-library/react-native';

import { ApiError } from '../../../api/errores';
import { eliminarPublicacion, type Publicacion } from '../../../api/reputacion';
import { DetalleTrabajoScreen } from '../DetalleTrabajoScreen';

jest.mock('../../../api/reputacion', () => ({ eliminarPublicacion: jest.fn() }));
jest.mock('../../../components/ImagenProtegida', () => ({
  ImagenProtegida: ({ uuid }: { uuid: string }) =>
    require('react').createElement(require('react-native').Text, null, `img:${uuid}`),
}));

const publicacion: Publicacion = {
  uuid: 'pub-1',
  titulo: 'Cambio de cañería',
  descripcion: 'Se cambió toda la cañería del baño.',
  fechaTrabajo: '2026-10-09',
  imagenIds: ['img-1', 'img-2'],
  puntaje: 5,
  uuidSolicitud: 's1',
  creadoEn: '2026-10-10T12:00:00Z',
};

let mockParams: { publicacion: Publicacion } = { publicacion };
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: mockParams }),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

const mockEliminar = eliminarPublicacion as jest.Mock;

beforeEach(() => {
  mockParams = { publicacion };
  [mockEliminar, mockNavigate, mockGoBack].forEach((m) => m.mockReset());
});

describe('DetalleTrabajoScreen', () => {
  it('muestra el trabajo completo con todas las fotos y estrellas', async () => {
    await render(<DetalleTrabajoScreen soloLectura />);
    expect(screen.getByText('Cambio de cañería')).toBeOnTheScreen();
    expect(screen.getByLabelText('5 de 5 estrellas')).toBeOnTheScreen();
    expect(screen.getByText('Fecha del trabajo: 09/10/2026')).toBeOnTheScreen();
    expect(screen.getByText('Se cambió toda la cañería del baño.')).toBeOnTheScreen();
    expect(screen.getByText('img:img-1')).toBeOnTheScreen();
    expect(screen.getByText('img:img-2')).toBeOnTheScreen();
  });

  it('el cliente no ve Editar ni Eliminar', async () => {
    await render(<DetalleTrabajoScreen soloLectura />);
    expect(screen.queryByText('Editar')).toBeNull();
    expect(screen.queryByText('Eliminar')).toBeNull();
  });

  it('sin puntaje no hay estrellas', async () => {
    mockParams = { publicacion: { ...publicacion, puntaje: null, uuidSolicitud: null } };
    await render(<DetalleTrabajoScreen soloLectura />);
    expect(screen.queryByLabelText(/de 5 estrellas/)).toBeNull();
  });

  it('Editar abre el formulario con el trabajo', async () => {
    await render(<DetalleTrabajoScreen soloLectura={false} />);
    await fireEvent.press(screen.getByText('Editar'));
    expect(mockNavigate).toHaveBeenCalledWith('NuevoTrabajo', { publicacion });
  });

  it('Eliminar pide confirmación, elimina y vuelve', async () => {
    mockEliminar.mockResolvedValue(undefined);
    await render(<DetalleTrabajoScreen soloLectura={false} />);

    await fireEvent.press(screen.getByText('Eliminar'));
    expect(mockEliminar).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText('Sí, eliminar'));
    expect(mockEliminar).toHaveBeenCalledWith('pub-1');
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('Volver cancela la confirmación', async () => {
    await render(<DetalleTrabajoScreen soloLectura={false} />);
    await fireEvent.press(screen.getByText('Eliminar'));
    await fireEvent.press(screen.getByText('Volver'));
    expect(screen.getByText('Editar')).toBeOnTheScreen();
    expect(mockEliminar).not.toHaveBeenCalled();
  });

  it('si eliminar falla muestra el error y no vuelve', async () => {
    mockEliminar.mockRejectedValue(new ApiError(404, 'NO_ENCONTRADO', 'No existe.', []));
    await render(<DetalleTrabajoScreen soloLectura={false} />);

    await fireEvent.press(screen.getByText('Eliminar'));
    await fireEvent.press(screen.getByText('Sí, eliminar'));
    expect(await screen.findByText('No existe.')).toBeOnTheScreen();
    expect(mockGoBack).not.toHaveBeenCalled();
  });
});
