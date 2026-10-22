import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ApiError } from '../../../api/errores';
import { espaciado } from '../../../theme';
import { IngresarScreen } from '../IngresarScreen';

const mockIngresar = jest.fn();
const mockSesion: { avisoDeCierre: string | null } = { avisoDeCierre: null };
jest.mock('../../../store/sesion', () => ({
  useSesion: () => ({ ingresar: mockIngresar, avisoDeCierre: mockSesion.avisoDeCierre }),
}));

const mockHuella = {
  huellaDisponible: jest.fn(),
  correoConHuella: jest.fn(),
  guardarConHuella: jest.fn(),
  leerConHuella: jest.fn(),
  olvidarHuella: jest.fn(),
};
jest.mock('../../../api/huella', () => ({
  huellaDisponible: () => mockHuella.huellaDisponible(),
  correoConHuella: (...args: unknown[]) => mockHuella.correoConHuella(...args),
  guardarConHuella: (...args: unknown[]) => mockHuella.guardarConHuella(...args),
  leerConHuella: (...args: unknown[]) => mockHuella.leerConHuella(...args),
  olvidarHuella: (...args: unknown[]) => mockHuella.olvidarHuella(...args),
}));

const navigation = { navigate: jest.fn() } as any;

const metricas = { frame: { x: 0, y: 0, width: 400, height: 800 }, insets: { top: 30, left: 0, right: 0, bottom: 0 } };

async function montar(params?: { aviso?: string }) {
  await render(
    <SafeAreaProvider initialMetrics={metricas}>
      <IngresarScreen navigation={navigation} route={{ key: 'i', name: 'Ingresar', params } as any} />
    </SafeAreaProvider>,
  );
}

async function completar(correo: string, contrasenia: string) {
  const usuario = userEvent.setup();
  await usuario.type(screen.getByLabelText('Correo'), correo);
  await usuario.type(screen.getByLabelText('Contraseña'), contrasenia);
  await usuario.press(screen.getByRole('button', { name: 'Continuar' }));
}

beforeEach(() => {
  mockIngresar.mockReset();
  mockSesion.avisoDeCierre = null;
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
    mockIngresar.mockResolvedValue('CLIENTE');
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

  it('es la primera pantalla: muestra el logo debajo de la barra de estado', async () => {
    await montar();
    expect(screen.getByTestId('barra-logo')).toHaveStyle({ paddingTop: 30 + espaciado.s });
    expect(screen.getByText('Inicio de sesión')).toBeTruthy();
  });

  it('muestra el aviso de cierre si la sesión se cerró por una suspensión', async () => {
    mockSesion.avisoDeCierre = 'Tu cuenta está suspendida.';
    await montar();
    expect(screen.getByText('Tu cuenta está suspendida.')).toBeTruthy();
  });

  it('los enlaces llevan a Recuperar y a Registro, siempre visibles', async () => {
    await montar();
    const usuario = userEvent.setup();
    await usuario.press(screen.getByRole('link', { name: '¿Olvidaste tu contraseña?' }));
    expect(navigation.navigate).toHaveBeenCalledWith('Recuperar');
    await usuario.press(screen.getByRole('link', { name: '¿No tenés cuenta? Registrate' }));
    expect(navigation.navigate).toHaveBeenCalledWith('Registro');
  });

  describe('cuenta de cliente y de prestador con el mismo email (D43)', () => {
    const elegirRol = new ApiError(409, 'ELEGIR_ROL', 'Tenés una cuenta de cliente y una de prestador. Elegí con cuál ingresar.');

    it('pregunta con cuál ingresar y entra con el rol elegido', async () => {
      mockIngresar.mockRejectedValueOnce(elegirRol).mockResolvedValueOnce('PRESTADOR');
      await montar();
      await completar('ana@mail.com', 'Clave123');

      expect(await screen.findByText('¿Cómo querés ingresar?')).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Continuar' })).toBeNull();
      await userEvent.setup().press(screen.getByRole('button', { name: 'Prestador' }));

      expect(mockIngresar).toHaveBeenLastCalledWith('ana@mail.com', 'Clave123', 'PRESTADOR');
      expect(screen.queryByText('Tenés una cuenta de cliente y una de prestador. Elegí con cuál ingresar.')).toBeNull();
    });

    it('si cambian el correo, la elección se descarta', async () => {
      mockIngresar.mockRejectedValueOnce(elegirRol);
      await montar();
      await completar('ana@mail.com', 'Clave123');
      await screen.findByText('¿Cómo querés ingresar?');

      await userEvent.setup().type(screen.getByLabelText('Correo'), 'x');

      expect(screen.queryByText('¿Cómo querés ingresar?')).toBeNull();
      expect(screen.getByRole('button', { name: 'Continuar' })).toBeTruthy();
    });

    it('con el switch prendido guarda la huella recién después de elegir', async () => {
      mockHuella.huellaDisponible.mockResolvedValue(true);
      mockIngresar.mockRejectedValueOnce(elegirRol).mockResolvedValueOnce('CLIENTE');
      await montar();
      await fireEvent(await screen.findByLabelText('Usar mi huella para ingresar'), 'valueChange', true);
      await completar('ana@mail.com', 'Clave123');
      expect(mockHuella.guardarConHuella).not.toHaveBeenCalled();

      await userEvent.setup().press(await screen.findByRole('button', { name: 'Cliente' }));

      expect(mockHuella.guardarConHuella).toHaveBeenCalledWith('ana@mail.com', 'Clave123');
    });

    it('con la huella también pregunta y entra con el rol elegido', async () => {
      mockHuella.huellaDisponible.mockResolvedValue(true);
      mockHuella.correoConHuella.mockResolvedValue('ana@mail.com');
      mockHuella.leerConHuella.mockResolvedValue({ estado: 'ok', correo: 'ana@mail.com', contrasenia: 'Clave123' });
      mockIngresar.mockRejectedValueOnce(elegirRol).mockResolvedValueOnce('CLIENTE');
      await montar();
      await userEvent.setup().press(await screen.findByRole('button', { name: 'Ingresar con huella' }));
      await userEvent.setup().press(await screen.findByRole('button', { name: 'Cliente' }));

      expect(mockIngresar).toHaveBeenLastCalledWith('ana@mail.com', 'Clave123', 'CLIENTE');
      expect(mockHuella.guardarConHuella).not.toHaveBeenCalled();
    });
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
      mockIngresar.mockResolvedValue('CLIENTE');
      await montar();
      await screen.findByLabelText('Usar mi huella para ingresar');
      await completar('ana@mail.com', 'Clave123');
      expect(mockIngresar).toHaveBeenCalled();
      expect(mockHuella.guardarConHuella).not.toHaveBeenCalled();
    });

    it('con el switch prendido guarda la huella después de un ingreso exitoso', async () => {
      mockHuella.huellaDisponible.mockResolvedValue(true);
      mockIngresar.mockResolvedValue('CLIENTE');
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
        mockIngresar.mockResolvedValue('CLIENTE');
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
        expect(mockHuella.olvidarHuella).toHaveBeenCalledWith();
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
        expect(mockHuella.olvidarHuella).toHaveBeenCalledWith();
        expect(screen.queryByRole('button', { name: 'Ingresar con huella' })).toBeNull();
        expect(screen.getByLabelText('Usar mi huella para ingresar')).toBeTruthy();
      });
    });
  });
});
