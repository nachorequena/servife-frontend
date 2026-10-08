import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { ImagenProtegida } from '../ImagenProtegida';

const mockToken = jest.fn();
const mockRenovar = jest.fn();
jest.mock('../../api/tokens', () => ({ obtenerAccessToken: () => mockToken() }));
jest.mock('../../api/cliente', () => ({
  URL_BASE: 'http://api.test/api/v1',
  renovarSesionParaRecursos: () => mockRenovar(),
}));

describe('ImagenProtegida', () => {
  beforeEach(() => {
    mockToken.mockReset();
    mockRenovar.mockReset();
  });

  it('sin token muestra un marcador y no pide la imagen', async () => {
    mockToken.mockReturnValue(null);
    await render(<ImagenProtegida uuid="a-1" accessibilityLabel="Foto" />);
    expect(screen.getByTestId('imagen-protegida-espera')).toBeTruthy();
    expect(screen.queryByLabelText('Foto')).toBeNull();
  });

  it('con token pide /archivos/{uuid} con el header Authorization', async () => {
    mockToken.mockReturnValue('tok-1');
    await render(<ImagenProtegida uuid="a-1" accessibilityLabel="Foto" />);
    expect(screen.getByLabelText('Foto').props.source).toEqual({
      uri: 'http://api.test/api/v1/archivos/a-1',
      headers: { Authorization: 'Bearer tok-1' },
    });
  });

  it('ante el primer error renueva el token y reintenta con el nuevo', async () => {
    mockToken.mockReturnValue('viejo');
    mockRenovar.mockImplementation(() => {
      mockToken.mockReturnValue('nuevo');
      return Promise.resolve(true);
    });
    await render(<ImagenProtegida uuid="a-1" accessibilityLabel="Foto" />);
    await fireEvent(screen.getByLabelText('Foto'), 'error');
    const imagen = await screen.findByLabelText('Foto');
    expect(mockRenovar).toHaveBeenCalledTimes(1);
    expect(imagen.props.source.headers).toEqual({ Authorization: 'Bearer nuevo' });
  });

  it('si el reintento también falla muestra el ícono, sin renovar de nuevo', async () => {
    mockToken.mockReturnValue('viejo');
    mockRenovar.mockResolvedValue(true);
    await render(<ImagenProtegida uuid="a-1" accessibilityLabel="Foto" />);
    await fireEvent(screen.getByLabelText('Foto'), 'error');
    await fireEvent(await screen.findByLabelText('Foto'), 'error');
    expect(await screen.findByTestId('imagen-protegida-error')).toBeTruthy();
    expect(mockRenovar).toHaveBeenCalledTimes(1);
  });

  it('si no se pudo renovar muestra el ícono', async () => {
    mockToken.mockReturnValue('viejo');
    mockRenovar.mockResolvedValue(false);
    await render(<ImagenProtegida uuid="a-1" accessibilityLabel="Foto" />);
    await fireEvent(screen.getByLabelText('Foto'), 'error');
    expect(await screen.findByTestId('imagen-protegida-error')).toBeTruthy();
  });

  it('al cambiar el uuid se vuelve a intentar', async () => {
    mockToken.mockReturnValue('tok');
    mockRenovar.mockResolvedValue(false);
    const { rerender } = await render(<ImagenProtegida uuid="a-1" accessibilityLabel="Foto" />);
    await fireEvent(screen.getByLabelText('Foto'), 'error');
    await screen.findByTestId('imagen-protegida-error');
    await rerender(<ImagenProtegida uuid="a-2" accessibilityLabel="Foto" />);
    expect((await screen.findByLabelText('Foto')).props.source.uri).toMatch(/\/archivos\/a-2$/);
  });

  it('ignora el resultado de una renovación vieja si cambió el uuid', async () => {
    mockToken.mockReturnValue('tok');
    let resolver: (v: boolean) => void = () => {};
    mockRenovar.mockReturnValue(new Promise<boolean>((r) => (resolver = r)));
    const { rerender } = await render(<ImagenProtegida uuid="a-1" accessibilityLabel="Foto" />);
    await fireEvent(screen.getByLabelText('Foto'), 'error');
    await rerender(<ImagenProtegida uuid="a-2" accessibilityLabel="Foto" />);
    await act(async () => resolver(false));
    expect((await screen.findByLabelText('Foto')).props.source.uri).toMatch(/a-2$/);
    expect(screen.queryByTestId('imagen-protegida-error')).toBeNull();
  });

  it('si el token ya cambió reintenta con el vigente sin renovar', async () => {
    mockToken.mockReturnValue('viejo');
    await render(<ImagenProtegida uuid="a-1" accessibilityLabel="Foto" />);
    mockToken.mockReturnValue('nuevo');
    await fireEvent(screen.getByLabelText('Foto'), 'error');
    expect(mockRenovar).not.toHaveBeenCalled();
    expect((await screen.findByLabelText('Foto')).props.source.headers).toEqual({ Authorization: 'Bearer nuevo' });
  });
});
