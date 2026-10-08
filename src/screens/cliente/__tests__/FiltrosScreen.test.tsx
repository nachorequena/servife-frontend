import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { listarTiposServicio } from '../../../api/catalogo';
import { FiltrosProvider, useFiltros } from '../../../store/filtros';
import { FiltrosScreen } from '../FiltrosScreen';

jest.mock('../../../api/catalogo', () => ({ listarTiposServicio: jest.fn() }));

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ goBack: mockGoBack }) }));

const mockTipos = listarTiposServicio as jest.Mock;

function Sonda() {
  const { filtros } = useFiltros();
  return <Text testID="estado">{JSON.stringify(filtros)}</Text>;
}

async function renderizar(inicial?: Parameters<typeof FiltrosProvider>[0]['inicial']) {
  await render(
    <FiltrosProvider inicial={inicial}>
      <FiltrosScreen />
      <Sonda />
    </FiltrosProvider>,
  );
  await screen.findByText('Plomero');
}

const estado = () => JSON.parse(screen.getByTestId('estado').props.children);

beforeEach(() => {
  mockGoBack.mockReset();
  mockTipos.mockReset();
  mockTipos.mockResolvedValue([
    { uuid: 't1', nombre: 'Plomero', icono: 'water', requiereMatricula: false },
    { uuid: 't2', nombre: 'Electricista', icono: 'flash', requiereMatricula: true },
  ]);
});

describe('FiltrosScreen', () => {
  it('muestra las secciones y los chips', async () => {
    await renderizar();
    expect(screen.getByText('Filtrar por:')).toBeOnTheScreen();
    expect(screen.getByText('Cercanía')).toBeOnTheScreen();
    expect(screen.getByText('Categoría')).toBeOnTheScreen();
    expect(screen.getByText('Valoración')).toBeOnTheScreen();
    expect(screen.getByText('Disponibilidad')).toBeOnTheScreen();
    expect(screen.getByText('De más cerca a más lejos')).toBeOnTheScreen();
    expect(screen.getByText('Mejor valorados')).toBeOnTheScreen();
    expect(screen.getByText('3 ★ o más')).toBeOnTheScreen();
  });

  it('no aplica nada hasta tocar Aplicar; entonces guarda y vuelve', async () => {
    await renderizar();
    await fireEvent.press(screen.getByText('Electricista'));
    await fireEvent.press(screen.getByText('4 ★ o más'));
    await fireEvent.press(screen.getByLabelText('Lunes'));
    await fireEvent.press(screen.getByLabelText('Miércoles'));
    await fireEvent.press(screen.getByText('Mejor valorados'));
    expect(estado()).toEqual({ dias: [], orden: 'cercania' });

    await fireEvent.press(screen.getByRole('button', { name: 'Aplicar' }));
    expect(estado()).toEqual({ tipoServicioId: 't2', puntajeMin: 4, dias: [1, 3], orden: 'valoracion' });
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('tocar de nuevo un chip seleccionado lo desmarca', async () => {
    await renderizar();
    await fireEvent.press(screen.getByText('Plomero'));
    expect(screen.getByRole('button', { name: 'Plomero', selected: true })).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Plomero'));
    expect(screen.getByRole('button', { name: 'Plomero', selected: false })).toBeOnTheScreen();
  });

  it('Limpiar reinicia el borrador', async () => {
    await renderizar({ tipoServicioId: 't1', puntajeMin: 3, dias: [2], orden: 'valoracion' });
    expect(screen.getByRole('button', { name: 'Plomero', selected: true })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Limpiar' }));
    expect(screen.getByRole('button', { name: 'Plomero', selected: false })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Aplicar' }));
    expect(estado()).toEqual({ dias: [], orden: 'cercania' });
  });

  it('si no cargan las categorías muestra el aviso y Reintentar', async () => {
    mockTipos.mockReset();
    mockTipos.mockRejectedValueOnce(new Error('red')).mockResolvedValueOnce([]);
    await render(
      <FiltrosProvider>
        <FiltrosScreen />
      </FiltrosProvider>,
    );
    expect(await screen.findByText('No pudimos cargar las categorías.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(mockTipos).toHaveBeenCalledTimes(2);
  });
});
