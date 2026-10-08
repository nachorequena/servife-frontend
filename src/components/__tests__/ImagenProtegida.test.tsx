import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { ImagenProtegida } from '../ImagenProtegida';

const mockDescargar = jest.fn();
jest.mock('../../api/archivos', () => ({ descargarImagen: (uuid: string) => mockDescargar(uuid) }));

describe('ImagenProtegida', () => {
  beforeEach(() => mockDescargar.mockReset());

  it('mientras descarga muestra un marcador', async () => {
    mockDescargar.mockReturnValue(new Promise(() => {}));
    await render(<ImagenProtegida uuid="a-1" accessibilityLabel="Foto" />);
    expect(screen.getByTestId('imagen-protegida-espera')).toBeTruthy();
    expect(screen.queryByLabelText('Foto')).toBeNull();
  });

  it('al terminar muestra la imagen con el uri local, sin headers', async () => {
    mockDescargar.mockResolvedValue('file:///cache/archivos/a-1');
    await render(<ImagenProtegida uuid="a-1" accessibilityLabel="Foto" />);
    const imagen = await screen.findByLabelText('Foto');
    expect(imagen.props.source).toEqual({ uri: 'file:///cache/archivos/a-1' });
    expect(mockDescargar).toHaveBeenCalledWith('a-1');
  });

  it('si la descarga falla muestra el ícono', async () => {
    mockDescargar.mockRejectedValue(new Error('401'));
    await render(<ImagenProtegida uuid="a-1" accessibilityLabel="Foto" />);
    expect(await screen.findByTestId('imagen-protegida-error')).toBeTruthy();
  });

  it('si la imagen local no se puede decodificar muestra el ícono', async () => {
    mockDescargar.mockResolvedValue('file:///cache/archivos/a-1');
    await render(<ImagenProtegida uuid="a-1" accessibilityLabel="Foto" />);
    await fireEvent(await screen.findByLabelText('Foto'), 'error');
    expect(await screen.findByTestId('imagen-protegida-error')).toBeTruthy();
  });

  it('al cambiar el uuid vuelve a descargar e ignora el resultado del anterior', async () => {
    let resolverViejo: (uri: string) => void = () => {};
    mockDescargar.mockImplementation((uuid: string) =>
      uuid === 'a-1' ? new Promise<string>((r) => (resolverViejo = r)) : Promise.resolve('file:///cache/archivos/a-2'),
    );
    const { rerender } = await render(<ImagenProtegida uuid="a-1" accessibilityLabel="Foto" />);
    await rerender(<ImagenProtegida uuid="a-2" accessibilityLabel="Foto" />);
    expect((await screen.findByLabelText('Foto')).props.source.uri).toMatch(/a-2$/);
    await act(async () => resolverViejo('file:///cache/archivos/a-1'));
    expect(screen.getByLabelText('Foto').props.source.uri).toMatch(/a-2$/);
  });

  it('un fallo de un uuid anterior no pisa la imagen del vigente', async () => {
    let rechazarViejo: (e: Error) => void = () => {};
    mockDescargar.mockImplementation((uuid: string) =>
      uuid === 'a-1' ? new Promise<string>((_, r) => (rechazarViejo = r)) : Promise.resolve('file:///cache/archivos/a-2'),
    );
    const { rerender } = await render(<ImagenProtegida uuid="a-1" accessibilityLabel="Foto" />);
    await rerender(<ImagenProtegida uuid="a-2" accessibilityLabel="Foto" />);
    await screen.findByLabelText('Foto');
    await act(async () => rechazarViejo(new Error('x')));
    expect(screen.queryByTestId('imagen-protegida-error')).toBeNull();
  });

  it('al desmontar no actualiza el estado', async () => {
    let resolver: (uri: string) => void = () => {};
    mockDescargar.mockReturnValue(new Promise<string>((r) => (resolver = r)));
    const errores = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = await render(<ImagenProtegida uuid="a-1" />);
    await unmount();
    await act(async () => resolver('file:///x'));
    expect(errores).not.toHaveBeenCalled();
    errores.mockRestore();
  });
});
