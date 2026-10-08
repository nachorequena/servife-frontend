import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ApiError } from '../../../api/errores';
import { listarValidacionesPendientes, validarPrestador, type PrestadorPendiente } from '../../../api/gestion';
import type { Pagina } from '../../../api/paginacion';
import { ValidacionesScreen } from '../ValidacionesScreen';

jest.mock('../../../api/gestion', () => ({ listarValidacionesPendientes: jest.fn(), validarPrestador: jest.fn() }));

const mockListar = listarValidacionesPendientes as jest.Mock;
const mockValidar = validarPrestador as jest.Mock;

function pendiente(n: number): PrestadorPendiente {
  return {
    uuid: `p${n}`,
    nombreApellido: `Prestador${n} Apellido`,
    email: `p${n}@mail.com`,
    tipoServicio: { uuid: 't1', nombre: 'Plomero', icono: 'water', requiereMatricula: true },
    creadoEn: '2026-09-18T13:12:04Z',
  };
}

function pagina(contenido: PrestadorPendiente[]): Pagina<PrestadorPendiente> {
  return { contenido, pagina: 0, tamanio: 20, totalElementos: contenido.length, totalPaginas: 1 };
}

beforeEach(() => {
  mockListar.mockReset();
  mockValidar.mockReset();
});

describe('ValidacionesScreen', () => {
  it('muestra nombre, email, rubro y fecha de cada pendiente', async () => {
    mockListar.mockResolvedValue(pagina([pendiente(1)]));
    await render(<ValidacionesScreen />);
    expect(await screen.findByText('Prestador1 Apellido')).toBeOnTheScreen();
    expect(screen.getByText('p1@mail.com')).toBeOnTheScreen();
    expect(screen.getByText('Plomero')).toBeOnTheScreen();
    expect(screen.getByText('18/09/2026')).toBeOnTheScreen();
  });

  it('muestra el estado vacío', async () => {
    mockListar.mockResolvedValue(pagina([]));
    await render(<ValidacionesScreen />);
    expect(await screen.findByText('No hay prestadores pendientes.')).toBeOnTheScreen();
  });

  it('aprobar llama a E6 y saca al prestador de la lista', async () => {
    mockListar.mockResolvedValue(pagina([pendiente(1), pendiente(2)]));
    mockValidar.mockResolvedValue({ uuid: 'p1', estadoValidacion: 'APROBADO' });
    await render(<ValidacionesScreen />);
    await screen.findByText('Prestador1 Apellido');
    await fireEvent.press(screen.getAllByText('Aprobar')[0]);
    await waitFor(() => expect(mockValidar).toHaveBeenCalledWith('p1', { decision: 'APROBAR' }));
    await waitFor(() => expect(screen.queryByText('Prestador1 Apellido')).toBeNull());
    expect(screen.getByText('Prestador aprobado.')).toBeOnTheScreen();
    expect(screen.getByText('Prestador2 Apellido')).toBeOnTheScreen();
  });

  it('rechazar exige confirmar y envía el motivo', async () => {
    mockListar.mockResolvedValue(pagina([pendiente(1)]));
    mockValidar.mockResolvedValue({ uuid: 'p1', estadoValidacion: 'RECHAZADO' });
    await render(<ValidacionesScreen />);
    await screen.findByText('Prestador1 Apellido');
    await fireEvent.press(screen.getByText('Rechazar'));
    expect(mockValidar).not.toHaveBeenCalled();
    await fireEvent.changeText(screen.getByLabelText('Motivo (opcional)'), 'Sin matrícula');
    await fireEvent.press(screen.getByText('Confirmar rechazo'));
    await waitFor(() =>
      expect(mockValidar).toHaveBeenCalledWith('p1', { decision: 'RECHAZAR', motivo: 'Sin matrícula' }),
    );
    await waitFor(() => expect(screen.queryByText('Prestador1 Apellido')).toBeNull());
    expect(screen.getByText('Prestador rechazado.')).toBeOnTheScreen();
  });

  it('cancelar el rechazo no llama a E6', async () => {
    mockListar.mockResolvedValue(pagina([pendiente(1)]));
    await render(<ValidacionesScreen />);
    await screen.findByText('Prestador1 Apellido');
    await fireEvent.press(screen.getByText('Rechazar'));
    await fireEvent.press(screen.getByText('Cancelar'));
    expect(screen.queryByLabelText('Motivo (opcional)')).toBeNull();
    expect(mockValidar).not.toHaveBeenCalled();
  });

  it('VALIDACION_YA_RESUELTA avisa y recarga la lista', async () => {
    mockListar.mockResolvedValueOnce(pagina([pendiente(1)])).mockResolvedValueOnce(pagina([]));
    mockValidar.mockRejectedValue(new ApiError(409, 'VALIDACION_YA_RESUELTA', 'Ya fue resuelta.'));
    await render(<ValidacionesScreen />);
    await screen.findByText('Prestador1 Apellido');
    await fireEvent.press(screen.getByText('Aprobar'));
    expect(await screen.findByText('Ya fue resuelta.')).toBeOnTheScreen();
    await waitFor(() => expect(mockListar).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('No hay prestadores pendientes.')).toBeOnTheScreen();
  });
});
