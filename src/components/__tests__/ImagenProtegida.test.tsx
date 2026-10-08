import { fireEvent, render, screen } from '@testing-library/react-native';

import { ImagenProtegida } from '../ImagenProtegida';

const mockToken = jest.fn();
jest.mock('../../api/tokens', () => ({ obtenerAccessToken: () => mockToken() }));
jest.mock('../../api/cliente', () => ({ URL_BASE: 'http://api.test/api/v1' }));

describe('ImagenProtegida', () => {
  beforeEach(() => mockToken.mockReset());

  it('sin token muestra un marcador y no pide la imagen', async () => {
    mockToken.mockReturnValue(null);
    await render(<ImagenProtegida uuid="a-1" accessibilityLabel="Foto" />);
    expect(screen.getByTestId('imagen-protegida-espera')).toBeTruthy();
    expect(screen.queryByLabelText('Foto')).toBeNull();
  });

  it('con token pide /archivos/{uuid} con el header Authorization', async () => {
    mockToken.mockReturnValue('tok-1');
    await render(<ImagenProtegida uuid="a-1" accessibilityLabel="Foto" />);
    const imagen = screen.getByLabelText('Foto');
    expect(imagen.props.source).toEqual({
      uri: 'http://api.test/api/v1/archivos/a-1',
      headers: { Authorization: 'Bearer tok-1' },
    });
  });

  it('si la imagen falla muestra un ícono', async () => {
    mockToken.mockReturnValue('tok-1');
    await render(<ImagenProtegida uuid="a-1" accessibilityLabel="Foto" />);
    await fireEvent(screen.getByLabelText('Foto'), 'error');
    expect(screen.getByTestId('imagen-protegida-error')).toBeTruthy();
    expect(screen.queryByTestId('imagen-protegida-espera')).toBeNull();
  });
});
