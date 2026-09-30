import { fireEvent, render, screen } from '@testing-library/react-native';

import { Avatar } from '../Avatar';
import { Button } from '../Button';
import { Input } from '../Input';
import { Stars } from '../Stars';

describe('componentes compartidos', () => {
  it('Button muestra la etiqueta y responde al toque', async () => {
    const onPress = jest.fn();
    await render(<Button etiqueta="Enviar solicitud" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Enviar solicitud' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('Button deshabilitado no responde', async () => {
    const onPress = jest.fn();
    await render(<Button etiqueta="Enviar" onPress={onPress} deshabilitado />);

    await fireEvent.press(screen.getByRole('button', { name: 'Enviar' }));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('Input tiene label visible y muestra el error del campo', async () => {
    await render(<Input etiqueta="Correo" placeholder="email@ejemplo.com" error="ya existe" />);

    expect(screen.getByText('Correo')).toBeTruthy();
    expect(screen.getByText('ya existe')).toBeTruthy();
  });

  it('Stars redondea y acota el puntaje entre 0 y 5', async () => {
    await render(<Stars valor={3.6} />);
    expect(screen.getByLabelText('4 de 5 estrellas')).toBeTruthy();
  });

  it('Avatar sin foto muestra las iniciales', async () => {
    await render(<Avatar nombre="Geronimo Lopez" />);
    expect(screen.getByText('GL')).toBeTruthy();
  });
});
