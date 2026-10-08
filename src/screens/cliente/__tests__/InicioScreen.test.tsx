import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { buscarPrestadores, type PrestadorEnLista } from '../../../api/catalogo';
import type { Pagina } from '../../../api/paginacion';
import { FiltrosProvider } from '../../../store/filtros';
import { InicioScreen } from '../InicioScreen';

jest.mock('../../../api/catalogo', () => ({ buscarPrestadores: jest.fn() }));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }) }));

let mockUbicacion: { ubicacion: { lat: number; lng: number } | null; estado: string };
jest.mock('../../../hooks/useUbicacion', () => ({ useUbicacion: () => mockUbicacion }));

const mockBuscar = buscarPrestadores as jest.Mock;

const plomero = { uuid: 't1', nombre: 'Plomero', icono: 'water', requiereMatricula: false };

function prestador(n: number, extra: Partial<PrestadorEnLista> = {}): PrestadorEnLista {
  return {
    uuid: `p${n}`,
    nombreApellido: `Nombre${n} Apellido${n}`,
    tipoServicio: plomero,
    zona: null,
    valoracionPromedio: null,
    distanciaKm: null,
    verificado: false,
    ...extra,
  };
}

function pagina(contenido: PrestadorEnLista[], numero = 0, totalPaginas = 1): Pagina<PrestadorEnLista> {
  return { contenido, pagina: numero, tamanio: 20, totalElementos: contenido.length, totalPaginas };
}

async function renderizar(inicial?: Parameters<typeof FiltrosProvider>[0]['inicial']) {
  await render(
    <FiltrosProvider inicial={inicial}>
      <InicioScreen />
    </FiltrosProvider>,
  );
}

beforeEach(() => {
  mockBuscar.mockReset();
  mockNavigate.mockReset();
  mockUbicacion = { ubicacion: { lat: -31.6, lng: -60.7 }, estado: 'concedida' };
});

describe('InicioScreen', () => {
  it('lista los prestadores con distancia, estrellas y verificado cuando existen', async () => {
    mockBuscar.mockResolvedValue(
      pagina([prestador(1, { distanciaKm: 2.34, valoracionPromedio: 4, verificado: true }), prestador(2)]),
    );
    await renderizar();
    expect(await screen.findByText('Nombre1 Apellido1')).toBeOnTheScreen();
    expect(screen.getAllByText('Plomero')).toHaveLength(2);
    expect(screen.getByText('a 2,3 km')).toBeOnTheScreen();
    expect(screen.getAllByText('Verificado')).toHaveLength(1);
    expect(screen.getAllByLabelText(/de 5 estrellas/)).toHaveLength(1);
  });

  it('sin permiso de ubicación igual lista, sin lat ni lng', async () => {
    mockUbicacion = { ubicacion: null, estado: 'denegada' };
    mockBuscar.mockResolvedValue(pagina([prestador(1)]));
    await renderizar();
    expect(await screen.findByText('Nombre1 Apellido1')).toBeOnTheScreen();
    const consulta = mockBuscar.mock.calls[0][0];
    expect(consulta.lat).toBeUndefined();
    expect(consulta.lng).toBeUndefined();
  });

  it('manda la ubicación en la primera búsqueda', async () => {
    mockBuscar.mockResolvedValue(pagina([prestador(1)]));
    await renderizar();
    await screen.findByText('Nombre1 Apellido1');
    expect(mockBuscar).toHaveBeenCalledTimes(1);
    expect(mockBuscar.mock.calls[0][0]).toMatchObject({ lat: -31.6, lng: -60.7, page: 0 });
  });

  it('no busca mientras la ubicación se está pidiendo', async () => {
    mockUbicacion = { ubicacion: null, estado: 'pidiendo' };
    mockBuscar.mockResolvedValue(pagina([prestador(1)]));
    await renderizar();
    expect(mockBuscar).not.toHaveBeenCalled();
  });

  it('los filtros aplicados llegan a la consulta', async () => {
    mockBuscar.mockResolvedValue(pagina([prestador(1)]));
    await renderizar({ tipoServicioId: 't1', puntajeMin: 4, dias: [1, 3], orden: 'valoracion' });
    await screen.findByText('Nombre1 Apellido1');
    expect(mockBuscar.mock.calls[0][0]).toMatchObject({
      tipoServicioId: 't1',
      puntajeMin: 4,
      dias: [1, 3],
      orden: 'valoracion',
    });
  });

  it('el texto se envía con debounce de 400 ms y solo con 2 o más caracteres', async () => {
    jest.useFakeTimers();
    try {
      mockBuscar.mockResolvedValue(pagina([prestador(1)]));
      await renderizar();
      await act(async () => {});
      mockBuscar.mockClear();

      await fireEvent.changeText(screen.getByPlaceholderText('Buscar'), 'p');
      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      expect(mockBuscar).not.toHaveBeenCalled();

      await fireEvent.changeText(screen.getByPlaceholderText('Buscar'), ' plo ');
      await act(async () => {
        jest.advanceTimersByTime(399);
      });
      expect(mockBuscar).not.toHaveBeenCalled();
      await act(async () => {
        jest.advanceTimersByTime(1);
      });
      expect(mockBuscar).toHaveBeenCalledTimes(1);
      expect(mockBuscar.mock.calls[0][0]).toMatchObject({ q: 'plo', page: 0 });
    } finally {
      jest.useRealTimers();
    }
  });

  it('la ✕ limpia la búsqueda', async () => {
    mockBuscar.mockResolvedValue(pagina([prestador(1)]));
    await renderizar();
    await screen.findByText('Nombre1 Apellido1');
    await fireEvent.changeText(screen.getByPlaceholderText('Buscar'), 'plomero');
    await fireEvent.press(screen.getByLabelText('Limpiar búsqueda'));
    expect(screen.getByPlaceholderText('Buscar').props.value).toBe('');
  });

  it('sin resultados muestra el estado vacío', async () => {
    mockBuscar.mockResolvedValue(pagina([]));
    await renderizar();
    expect(await screen.findByText('No hay prestadores disponibles con esos filtros.')).toBeOnTheScreen();
  });

  it('con error muestra el mensaje y Reintentar vuelve a pedir', async () => {
    mockBuscar.mockRejectedValueOnce(new Error('red')).mockResolvedValueOnce(pagina([prestador(1)]));
    await renderizar();
    expect(await screen.findByText('No pudimos cargar los prestadores.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Nombre1 Apellido1')).toBeOnTheScreen();
  });

  it('al llegar al final carga la página siguiente mientras haya', async () => {
    mockBuscar
      .mockResolvedValueOnce(pagina([prestador(1)], 0, 2))
      .mockResolvedValueOnce(pagina([prestador(2)], 1, 2));
    await renderizar();
    const lista = await screen.findByTestId('lista-prestadores');
    await fireEvent(lista, 'endReached');
    expect(await screen.findByText('Nombre2 Apellido2')).toBeOnTheScreen();
    expect(mockBuscar.mock.calls[1][0]).toMatchObject({ page: 1 });
    expect(screen.getByText('Nombre1 Apellido1')).toBeOnTheScreen();
    await fireEvent(lista, 'endReached');
    expect(mockBuscar).toHaveBeenCalledTimes(2);
  });

  it('tocar una tarjeta abre el perfil del prestador', async () => {
    mockBuscar.mockResolvedValue(pagina([prestador(1)]));
    await renderizar();
    await fireEvent.press(await screen.findByText('Nombre1 Apellido1'));
    expect(mockNavigate).toHaveBeenCalledWith('PerfilPrestador', { uuidPrestador: 'p1' });
  });

  it('el ▼ abre Filtros', async () => {
    mockBuscar.mockResolvedValue(pagina([]));
    await renderizar();
    await fireEvent.press(screen.getByLabelText('Abrir filtros'));
    expect(mockNavigate).toHaveBeenCalledWith('Filtros');
  });
  it('un refresco en vuelo superado por una consulta nueva no deja el spinner ni bloquea el paginado', async () => {
    jest.useFakeTimers();
    try {
      mockBuscar.mockResolvedValueOnce(pagina([prestador(1)], 0, 2));
      await renderizar();
      await act(async () => {});
      const lista = screen.getByTestId('lista-prestadores');
      mockBuscar.mockReturnValueOnce(new Promise(() => {}));
      await act(async () => {
        lista.props.refreshControl.props.onRefresh();
      });
      mockBuscar.mockResolvedValueOnce(pagina([prestador(3)], 0, 2));
      await fireEvent.changeText(screen.getByPlaceholderText('Buscar'), 'plo');
      await act(async () => {
        jest.advanceTimersByTime(400);
      });
      expect(screen.getByText('Nombre3 Apellido3')).toBeOnTheScreen();
      expect(screen.getByTestId('lista-prestadores').props.refreshControl.props.refreshing).toBe(false);
      mockBuscar.mockResolvedValueOnce(pagina([prestador(4)], 1, 2));
      await fireEvent(screen.getByTestId('lista-prestadores'), 'endReached');
      expect(screen.getByText('Nombre4 Apellido4')).toBeOnTheScreen();
    } finally {
      jest.useRealTimers();
    }
  });

  it('si una consulta nueva falla no deja la lista vieja: muestra el error', async () => {
    jest.useFakeTimers();
    try {
      mockBuscar.mockResolvedValueOnce(pagina([prestador(1)]));
      await renderizar();
      await act(async () => {});
      mockBuscar.mockRejectedValueOnce(new Error('red'));
      await fireEvent.changeText(screen.getByPlaceholderText('Buscar'), 'plo');
      await act(async () => {
        jest.advanceTimersByTime(400);
      });
      expect(screen.getByText('No pudimos cargar los prestadores.')).toBeOnTheScreen();
      expect(screen.queryByText('Nombre1 Apellido1')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('si falla una página siguiente conserva la lista y ofrece reintentar', async () => {
    mockBuscar
      .mockResolvedValueOnce(pagina([prestador(1)], 0, 2))
      .mockRejectedValueOnce(new Error('red'))
      .mockResolvedValueOnce(pagina([prestador(2)], 1, 2));
    await renderizar();
    await fireEvent(await screen.findByTestId('lista-prestadores'), 'endReached');
    expect(await screen.findByText('No pudimos cargar más.')).toBeOnTheScreen();
    expect(screen.getByText('Nombre1 Apellido1')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Nombre2 Apellido2')).toBeOnTheScreen();
  });

  it('dos endReached seguidos no piden la misma página dos veces', async () => {
    let resolver: (p: Pagina<PrestadorEnLista>) => void = () => {};
    mockBuscar
      .mockResolvedValueOnce(pagina([prestador(1)], 0, 3))
      .mockReturnValueOnce(new Promise((r) => (resolver = r)));
    await renderizar();
    const lista = await screen.findByTestId('lista-prestadores');
    await fireEvent(lista, 'endReached');
    await fireEvent(lista, 'endReached');
    expect(mockBuscar).toHaveBeenCalledTimes(2);
    await act(async () => resolver(pagina([prestador(1), prestador(2)], 1, 3)));
    expect(screen.getAllByText('Nombre1 Apellido1')).toHaveLength(1);
  });
});
