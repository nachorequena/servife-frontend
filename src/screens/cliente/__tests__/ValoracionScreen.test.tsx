import { fireEvent, render, screen } from '@testing-library/react-native';

import { ApiError } from '../../../api/errores';
import { valorarSolicitud } from '../../../api/reputacion';
import { ValoracionScreen } from '../ValoracionScreen';

jest.mock('../../../api/reputacion', () => ({ valorarSolicitud: jest.fn() }));

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({ params: { uuidSolicitud: 'sol-1' } }),
}));

const mockValorar = valorarSolicitud as jest.Mock;

async function aLasEstrellas() {
  await render(<ValoracionScreen />);
  await fireEvent.press(screen.getByText('Sí, se realizó'));
}

beforeEach(() => {
  mockValorar.mockReset();
  mockGoBack.mockReset();
});

test('primero pregunta si el servicio se realizó', async () => {
  await render(<ValoracionScreen />);

  expect(screen.getByText('¿Se realizó el servicio?')).toBeTruthy();
  expect(screen.queryByText('Enviar valoración')).toBeNull();
});

test('si no se realizó, explica que ya figura como realizada y vuelve sin valorar', async () => {
  await render(<ValoracionScreen />);
  await fireEvent.press(screen.getByText('No'));

  expect(screen.getByText(/ya figura como realizada/)).toBeTruthy();
  await fireEvent.press(screen.getByText('Volver'));
  expect(mockGoBack).toHaveBeenCalled();
  expect(mockValorar).not.toHaveBeenCalled();
});

test('"Más tarde" pospone sin valorar', async () => {
  await render(<ValoracionScreen />);
  await fireEvent.press(screen.getByText('Más tarde'));

  expect(mockGoBack).toHaveBeenCalled();
  expect(mockValorar).not.toHaveBeenCalled();
});

test('sin estrellas no envía', async () => {
  await aLasEstrellas();
  await fireEvent.press(screen.getByText('Enviar valoración'));

  expect(screen.getByText('Elegí de 1 a 5 estrellas.')).toBeTruthy();
  expect(mockValorar).not.toHaveBeenCalled();
});

test('envía las estrellas y el comentario recortado, y vuelve al detalle', async () => {
  mockValorar.mockResolvedValue({});
  await aLasEstrellas();

  await fireEvent.press(screen.getByLabelText('4 de 5 estrellas'));
  await fireEvent.changeText(screen.getByLabelText('Comentario (opcional)'), '  Muy prolijo  ');
  await fireEvent.press(screen.getByText('Enviar valoración'));

  expect(mockValorar).toHaveBeenCalledWith('sol-1', { puntaje: 4, comentario: 'Muy prolijo' });
  expect(mockGoBack).toHaveBeenCalled();
});

test('sin comentario no lo manda', async () => {
  mockValorar.mockResolvedValue({});
  await aLasEstrellas();

  await fireEvent.press(screen.getByLabelText('5 de 5 estrellas'));
  await fireEvent.changeText(screen.getByLabelText('Comentario (opcional)'), '   ');
  await fireEvent.press(screen.getByText('Enviar valoración'));

  expect(mockValorar).toHaveBeenCalledWith('sol-1', { puntaje: 5 });
});

test('muestra el error de campo del backend', async () => {
  mockValorar.mockRejectedValue(
    new ApiError(400, 'VALIDACION', 'Datos inválidos', [
      { campo: 'comentario', detalle: 'tiene que tener como máximo 500 caracteres' },
    ]),
  );
  await aLasEstrellas();

  await fireEvent.press(screen.getByLabelText('3 de 5 estrellas'));
  await fireEvent.press(screen.getByText('Enviar valoración'));

  expect(await screen.findByText('tiene que tener como máximo 500 caracteres')).toBeTruthy();
  expect(mockGoBack).not.toHaveBeenCalled();
});

test('si ya se valoró, muestra el mensaje del 409 y no vuelve', async () => {
  mockValorar.mockRejectedValue(
    new ApiError(409, 'TRANSICION_INVALIDA', 'Solo se puede valorar una solicitud finalizada.'),
  );
  await aLasEstrellas();

  await fireEvent.press(screen.getByLabelText('5 de 5 estrellas'));
  await fireEvent.press(screen.getByText('Enviar valoración'));

  expect(await screen.findByText('Solo se puede valorar una solicitud finalizada.')).toBeTruthy();
  expect(mockGoBack).not.toHaveBeenCalled();
});
