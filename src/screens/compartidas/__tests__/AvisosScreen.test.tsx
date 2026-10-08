import { fireEvent, render, screen } from '@testing-library/react-native';

import { listarAvisos, marcarAvisoLeido, type Aviso } from '../../../api/notificaciones';
import type { Pagina } from '../../../api/paginacion';
import { AvisosScreen } from '../AvisosScreen';

jest.mock('../../../api/notificaciones', () => ({ listarAvisos: jest.fn(), marcarAvisoLeido: jest.fn() }));

const mockListar = listarAvisos as jest.Mock;
const mockMarcar = marcarAvisoLeido as jest.Mock;

function aviso(n: number, extra: Partial<Aviso> = {}): Aviso {
  return {
    uuid: `a${n}`,
    tipo: 'VALIDACION',
    titulo: `Título ${n}`,
    cuerpo: `Cuerpo ${n}`,
    uuidSolicitud: null,
    leida: false,
    creadoEn: '2026-10-07T15:30:00Z',
    ...extra,
  };
}

function pagina(contenido: Aviso[], numero = 0, totalPaginas = 1): Pagina<Aviso> {
  return { contenido, pagina: numero, tamanio: 20, totalElementos: contenido.length, totalPaginas };
}

beforeEach(() => {
  mockListar.mockReset();
  mockMarcar.mockReset();
});

describe('AvisosScreen', () => {
  it('lista los avisos con título, cuerpo y fecha', async () => {
    mockListar.mockResolvedValue(pagina([aviso(1), aviso(2, { leida: true })]));
    await render(<AvisosScreen />);
    expect(await screen.findByText('Título 1')).toBeOnTheScreen();
    expect(screen.getByText('Cuerpo 2')).toBeOnTheScreen();
    expect(screen.getAllByText('07/10/2026, 12:30')).toHaveLength(2);
    expect(screen.getAllByTestId('punto-no-leido')).toHaveLength(1);
  });

  it('un aviso sin cuerpo muestra solo el título y la fecha', async () => {
    mockListar.mockResolvedValue(pagina([aviso(1, { cuerpo: null })]));
    await render(<AvisosScreen />);
    expect(await screen.findByText('Título 1')).toBeOnTheScreen();
    expect(screen.queryByText('null')).toBeNull();
    expect(screen.getByText('07/10/2026, 12:30')).toBeOnTheScreen();
  });

  it('tocar un aviso no leído lo marca como leído', async () => {
    mockListar.mockResolvedValue(pagina([aviso(1)]));
    mockMarcar.mockResolvedValue(undefined);
    await render(<AvisosScreen />);
    await fireEvent.press(await screen.findByText('Título 1'));
    expect(mockMarcar).toHaveBeenCalledWith('a1');
    expect(screen.queryByTestId('punto-no-leido')).toBeNull();
  });

  it('si falla el marcado vuelve a dejarlo sin leer', async () => {
    mockListar.mockResolvedValue(pagina([aviso(1)]));
    mockMarcar.mockRejectedValue(new Error('falló'));
    await render(<AvisosScreen />);
    await fireEvent.press(await screen.findByText('Título 1'));
    expect(await screen.findByTestId('punto-no-leido')).toBeOnTheScreen();
  });

  it('tocar un aviso ya leído no llama a la API', async () => {
    mockListar.mockResolvedValue(pagina([aviso(1, { leida: true })]));
    await render(<AvisosScreen />);
    await fireEvent.press(await screen.findByText('Título 1'));
    expect(mockMarcar).not.toHaveBeenCalled();
  });

  it('muestra el vacío', async () => {
    mockListar.mockResolvedValue(pagina([]));
    await render(<AvisosScreen />);
    expect(await screen.findByText('No tenés avisos.')).toBeOnTheScreen();
  });

  it('muestra el error y reintenta', async () => {
    mockListar.mockRejectedValueOnce(new Error('sin red')).mockResolvedValue(pagina([aviso(1)]));
    await render(<AvisosScreen />);
    expect(await screen.findByText('No pudimos cargar los avisos.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Título 1')).toBeOnTheScreen();
  });

  it('carga la página siguiente al llegar al final', async () => {
    mockListar.mockResolvedValueOnce(pagina([aviso(1)], 0, 2)).mockResolvedValueOnce(pagina([aviso(2)], 1, 2));
    await render(<AvisosScreen />);
    const lista = await screen.findByTestId('lista-avisos');
    await fireEvent(lista, 'endReached');
    expect(await screen.findByText('Título 2')).toBeOnTheScreen();
    expect(mockListar).toHaveBeenLastCalledWith({ page: 1, size: 20 });
  });
});
