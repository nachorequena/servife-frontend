import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';

import { ApiError } from '../../../api/errores';
import { IngresarScreen } from '../IngresarScreen';

const mockIngresar = jest.fn();
jest.mock('../../../store/sesion', () => ({ useSesion: () => ({ ingresar: mockIngresar }) }));

const mockHuella = {
  huellaDisponible: jest.fn(),
  correoConHuella: jest.fn(),
  guardarConHuella: jest.fn(),
  leerConHuella: jest.fn(),
  olvidarHuella: jest.fn(),
};
jest.mock('../../../api/huella', () => ({
  huellaDisponible: () => mockHuella.huellaDisponible(),
  correoConHuella: () => mockHuella.correoConHuella(),
  guardarConHuella: (...args: unknown[]) => mockHuella.guardarConHuella(...args),
  leerConHuella: () => mockHuella.leerConHuella(),
  olvidarHuella: () => mockHuella.olvidarHuella(),
}));

const navigation = { navigate: jest.fn() } as any;

async function montar(params?: { aviso?: string; rol?: 'CLIENTE' | 'PRESTADOR' }) {
  await render(<IngresarScreen navigation={navigation} route={{ key: 'i', name: 'Ingresar', params } as any} />);
}

async function completar(correo: string, contrasenia: string) {
  const usuario = userEvent.setup();
  await usuario.type(screen.getByLabelText('Correo'), correo);
  await usuario.type(screen.getByLabelText('Contraseña'), contrasenia);
  await usuario.press(screen.getByRole('button', { name: 'Continuar' }));
}

beforeEach(() => {
  mockIngresar.mockReset();
  navigation.navigate.mockReset();
  mockHuella.huellaDisponible.mockReset().mockResolvedValue(false);
  mockHuella.correoConHuella.mockReset().mockResolvedValue(null);
  mockHuella.guardarConHuella.mockReset().mockResolvedValue(true);
  mockHuella.leerConHuella.mockReset();
  mockHuella.olvidarHuella.mockReset().mockResolvedValue(undefined);
});

describe('IngresarScreen', () => {
  it('ya no ofrece atajos "Entrar como"', async () => {
    await montar();
    expect(screen.queryByText(/Entrar como/)).toBeNull();
  });

  it('muestra el aviso que llega por parámetro', async () => {
    await montar({ aviso: 'Contraseña actualizada.' });
    expect(screen.getByText('Contraseña actualizada.')).toBeTruthy();
  });

  it('envía correo y contraseña a mockIngresar', async () => {
    mockIngresar.mockResolvedValue(undefined);
    await montar();
    await completar('ana@mail.com', 'Clave123');
    expect(mockIngresar).toHaveBeenCalledWith('ana@mail.com', 'Clave123');
  });

  it('credenciales inválidas muestran el mensaje del backend', async () => {
    mockIngresar.mockRejectedValue(
      new ApiError(401, 'CREDENCIALES_INVALIDAS', 'El correo o la contraseña no son correctos.'),
    );
    await montar();
    await completar('ana@mail.com', 'mala');
    expect(await screen.findByText('El correo o la contraseña no son correctos.')).toBeTruthy();
  });

  it('cuenta suspendida muestra el mensaje del backend', async () => {
    mockIngresar.mockRejectedValue(new ApiError(403, 'CUENTA_SUSPENDIDA', 'Tu cuenta está suspendida.'));
    await montar();
    await completar('ana@mail.com', 'Clave123');
    expect(await screen.findByText('Tu cuenta está suspendida.')).toBeTruthy();
  });

  it('los errores de validación van debajo de cada campo', async () => {
    mockIngresar.mockRejectedValue(
      new ApiError(400, 'VALIDACION', 'Datos inválidos.', [{ campo: 'email', detalle: 'Correo inválido.' }]),
    );
    await montar();
    await completar('x', 'Clave123');
    expect(await screen.findByText('Correo inválido.')).toBeTruthy();
  });

  it('un error de red muestra un mensaje genérico', async () => {
    mockIngresar.mockRejectedValue(new TypeError('Network request failed'));
    await montar();
    await completar('ana@mail.com', 'Clave123');
    expect(await screen.findByText('No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.')).toBeTruthy();
  });

  it('los enlaces llevan a Recuperar y a Registro como cliente', async () => {
    await montar();
    const usuario = userEvent.setup();
    await usuario.press(screen.getByRole('link', { name: '¿Olvidaste tu contraseña?' }));
    expect(navigation.navigate).toHaveBeenCalledWith('Recuperar');
    await usuario.press(screen.getByRole('link', { name: '¿No tenés cuenta? Registrate' }));
    expect(navigation.navigate).toHaveBeenCalledWith('Registro', { rol: 'CLIENTE' });
  });

  it('si viene de "Prestador", el registro abre con el rol de prestador', async () => {
    await montar({ rol: 'PRESTADOR' });
    await userEvent.setup().press(screen.getByRole('link', { name: '¿No tenés cuenta? Registrate' }));
    expect(navigation.navigate).toHaveBeenCalledWith('Registro', { rol: 'PRESTADOR' });
  });

  describe('ingreso con huella', () => {
    it('sin huella disponible no muestra el switch ni el botón', async () => {
      await montar();
      expect(screen.queryByLabelText('Usar mi huella para ingresar')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Ingresar con huella' })).toBeNull();
    });

    it('con huella disponible y nada guardado muestra el switch apagado y no el botón', async () => {
      mockHuella.huellaDisponible.mockResolvedValue(true);
      await montar();
      const interruptor = await screen.findByLabelText('Usar mi huella para ingresar');
      expect(interruptor.props.value).toBe(false);
      expect(screen.queryByRole('button', { name: 'Ingresar con huella' })).toBeNull();
    });

    it('con el switch apagado no guarda nada al ingresar', async () => {
      mockHuella.huellaDisponible.mockResolvedValue(true);
      mockIngresar.mockResolvedValue(undefined);
      await montar();
      await screen.findByLabelText('Usar mi huella para ingresar');
      await completar('ana@mail.com', 'Clave123');
      expect(mockIngresar).toHaveBeenCalled();
      expect(mockHuella.guardarConHuella).not.toHaveBeenCalled();
    });

    it('con el switch prendido guarda la huella después de un ingreso exitoso', async () => {
      mockHuella.huellaDisponible.mockResolvedValue(true);
      mockIngresar.mockResolvedValue(undefined);
      await montar();
      await fireEvent(await screen.findByLabelText('Usar mi huella para ingresar'), 'valueChange', true);
      await completar('ana@mail.com', 'Clave123');
      expect(mockHuella.guardarConHuella).toHaveBeenCalledWith('ana@mail.com', 'Clave123');
      expect(mockIngresar.mock.invocationCallOrder[0]).toBeLessThan(
        mockHuella.guardarConHuella.mock.invocationCallOrder[0],
      );
    });

    it('con el switch prendido no guarda nada si las credenciales son inválidas', async () => {
      mockHuella.huellaDisponible.mockResolvedValue(true);
      mockIngresar.mockRejectedValue(new ApiError(401, 'CREDENCIALES_INVALIDAS', 'No son correctas.'));
      await montar();
      await fireEvent(await screen.findByLabelText('Usar mi huella para ingresar'), 'valueChange', true);
      await completar('ana@mail.com', 'mala');
      expect(await screen.findByText('No son correctas.')).toBeTruthy();
      expect(mockHuella.guardarConHuella).not.toHaveBeenCalled();
    });

    describe('con una huella guardada', () => {
      beforeEach(() => {
        mockHuella.huellaDisponible.mockResolvedValue(true);
        mockHuella.correoConHuella.mockResolvedValue('ana@mail.com');
      });

      async function ingresarConHuella() {
        await userEvent.setup().press(await screen.findByRole('button', { name: 'Ingresar con huella' }));
      }

      it('muestra el botón con el correo, el enlace para olvidarla y oculta el switch', async () => {
        await montar();
        expect(await screen.findByRole('button', { name: 'Ingresar con huella' })).toBeTruthy();
        expect(screen.getByText('como ana@mail.com')).toBeTruthy();
        expect(screen.getByRole('link', { name: 'No usar más la huella' })).toBeTruthy();
        expect(screen.queryByLabelText('Usar mi huella para ingresar')).toBeNull();
      });

      it('ingresa con las credenciales guardadas', async () => {
        mockHuella.leerConHuella.mockResolvedValue({ estado: 'ok', correo: 'ana@mail.com', contrasenia: 'Clave123' });
        mockIngresar.mockResolvedValue(undefined);
        await montar();
        await ingresarConHuella();
        expect(mockIngresar).toHaveBeenCalledWith('ana@mail.com', 'Clave123');
      });

      it('si el backend responde 401 olvida la huella y avisa que cambió la contraseña', async () => {
        mockHuella.leerConHuella.mockResolvedValue({ estado: 'ok', correo: 'ana@mail.com', contrasenia: 'vieja' });
        mockIngresar.mockRejectedValue(
          new ApiError(401, 'CREDENCIALES_INVALIDAS', 'El correo o la contraseña no son correctos.'),
        );
        await montar();
        await ingresarConHuella();
        expect(
          await screen.findByText(
            'Tu contraseña cambió. Ingresá con correo y contraseña para volver a activar la huella.',
          ),
        ).toBeTruthy();
        expect(mockHuella.olvidarHuella).toHaveBeenCalled();
        expect(screen.queryByRole('button', { name: 'Ingresar con huella' })).toBeNull();
        expect(screen.getByLabelText('Usar mi huella para ingresar')).toBeTruthy();
      });

      it('si la huella cambió en el teléfono avisa y deja de ofrecerla', async () => {
        mockHuella.leerConHuella.mockResolvedValue({ estado: 'invalidada' });
        await montar();
        await ingresarConHuella();
        expect(
          await screen.findByText(
            'La huella cambió en este teléfono. Ingresá con correo y contraseña para volver a activarla.',
          ),
        ).toBeTruthy();
        expect(mockIngresar).not.toHaveBeenCalled();
        expect(screen.queryByRole('button', { name: 'Ingresar con huella' })).toBeNull();
      });

      it('si el usuario cancela no pasa nada', async () => {
        mockHuella.leerConHuella.mockResolvedValue({ estado: 'cancelado' });
        await montar();
        await ingresarConHuella();
        expect(mockIngresar).not.toHaveBeenCalled();
        expect(mockHuella.olvidarHuella).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: 'Ingresar con huella' })).toBeTruthy();
        expect(screen.queryByText(/huella cambió/)).toBeNull();
      });

      it('un error de red muestra el mensaje genérico y conserva la huella', async () => {
        mockHuella.leerConHuella.mockResolvedValue({ estado: 'ok', correo: 'ana@mail.com', contrasenia: 'Clave123' });
        mockIngresar.mockRejectedValue(new TypeError('Network request failed'));
        await montar();
        await ingresarConHuella();
        expect(await screen.findByText('No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.')).toBeTruthy();
        expect(mockHuella.olvidarHuella).not.toHaveBeenCalled();
      });

      it('"No usar más la huella" la olvida y muestra el switch', async () => {
        await montar();
        await userEvent.setup().press(await screen.findByRole('link', { name: 'No usar más la huella' }));
        expect(mockHuella.olvidarHuella).toHaveBeenCalled();
        expect(screen.queryByRole('button', { name: 'Ingresar con huella' })).toBeNull();
        expect(screen.getByLabelText('Usar mi huella para ingresar')).toBeTruthy();
      });
    });
  });
});
