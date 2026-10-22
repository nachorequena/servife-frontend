import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ProveedorDeAvisosFlotantes, useAvisoFlotante } from '../AvisoFlotante';
import { BotonFlotante } from '../BotonFlotante';
import { Button } from '../Button';
import { Card } from '../Card';
import { Dialogo } from '../Dialogo';
import { Esqueleto } from '../Esqueleto';
import { EstadoVacio } from '../EstadoVacio';
import { Etiqueta } from '../Etiqueta';
import { HojaInferior } from '../HojaInferior';
import { Input } from '../Input';

const metricas = { frame: { x: 0, y: 0, width: 400, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const conAreaSegura = (hijo: React.ReactElement) => <SafeAreaProvider initialMetrics={metricas}>{hijo}</SafeAreaProvider>;

describe('Button (bloque A)', () => {
  it('chico, con ícono y variante peligro responde al toque', async () => {
    const onPress = jest.fn();
    await render(<Button etiqueta="Dar de baja" onPress={onPress} variante="peligro" tamanio="chico" icono="trash-outline" />);
    expect(screen.getByTestId('icono-trash-outline')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Dar de baja' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('las variantes de siempre no cambian: secundario sigue ajustado al contenido', async () => {
    await render(<Button etiqueta="Rechazar" onPress={jest.fn()} variante="secundario" />);
    expect(screen.getByRole('button', { name: 'Rechazar' })).toHaveStyle({ alignSelf: 'center' });
  });

  it('ancho pisa el de la variante', async () => {
    await render(<Button etiqueta="Ver" onPress={jest.fn()} variante="contorno" ancho="contenido" />);
    expect(screen.getByRole('button', { name: 'Ver' })).toHaveStyle({ alignSelf: 'flex-start' });
  });
});

describe('Etiqueta y Card', () => {
  it('Etiqueta muestra el texto', async () => {
    await render(<Etiqueta texto="Suspendida" tono="error" icono="ban-outline" />);
    expect(screen.getByText('Suspendida')).toBeOnTheScreen();
  });

  it('Card blanca se toca entera con su nombre accesible', async () => {
    const onPress = jest.fn();
    await render(
      <Card variante="blanca" onPress={onPress} accessibilityLabel="Laura Gasista">
        <Text>Laura</Text>
      </Card>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Laura Gasista' }));
    expect(onPress).toHaveBeenCalled();
  });
});

describe('Input (bloque A)', () => {
  it('con error muestra el ícono de alerta y el mensaje', async () => {
    await render(<Input etiqueta="Email" error="ya existe" />);
    expect(screen.getByText('ya existe')).toBeOnTheScreen();
    expect(screen.getByTestId('icono-alert-circle')).toBeOnTheScreen();
  });

  it('el ojo muestra y oculta la contraseña', async () => {
    await render(<Input etiqueta="Contraseña" secureTextEntry mostrarOcultar />);
    expect(screen.getByLabelText('Contraseña').props.secureTextEntry).toBe(true);
    await fireEvent.press(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(screen.getByLabelText('Contraseña').props.secureTextEntry).toBe(false);
    await fireEvent.press(screen.getByRole('button', { name: 'Ocultar contraseña' }));
    expect(screen.getByLabelText('Contraseña').props.secureTextEntry).toBe(true);
  });

  it('sin mostrarOcultar no hay ojo', async () => {
    await render(<Input etiqueta="Contraseña" secureTextEntry />);
    expect(screen.queryByRole('button', { name: 'Mostrar contraseña' })).toBeNull();
  });
});

describe('EstadoVacio', () => {
  it('con acción muestra el botón', async () => {
    const limpiar = jest.fn();
    await render(<EstadoVacio mensaje="Sin resultados" icono="search-outline" accion={{ etiqueta: 'Limpiar filtros', onPress: limpiar }} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(limpiar).toHaveBeenCalled();
  });
});

describe('AvisoFlotante', () => {
  function Disparador({ tipo }: { tipo?: 'exito' | 'error' }) {
    const { mostrar } = useAvisoFlotante();
    return <Text onPress={() => mostrar('Gestor creado', tipo)}>disparar</Text>;
  }

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('aparece y se va solo a los 3 segundos', async () => {
    await render(conAreaSegura(<ProveedorDeAvisosFlotantes><Disparador /></ProveedorDeAvisosFlotantes>));
    await fireEvent.press(screen.getByText('disparar'));
    expect(screen.getByText('Gestor creado')).toBeOnTheScreen();
    expect(screen.getByTestId('icono-checkmark-circle')).toBeOnTheScreen();
    await act(async () => jest.advanceTimersByTime(3000));
    expect(screen.queryByText('Gestor creado')).toBeNull();
  });

  it('un error lleva el ícono de error y se cierra al tocarlo', async () => {
    await render(conAreaSegura(<ProveedorDeAvisosFlotantes><Disparador tipo="error" /></ProveedorDeAvisosFlotantes>));
    await fireEvent.press(screen.getByText('disparar'));
    expect(screen.getByTestId('icono-close-circle')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('aviso-flotante'));
    expect(screen.queryByText('Gestor creado')).toBeNull();
  });

  it('sin proveedor no hace nada (pantallas sueltas en tests)', async () => {
    await render(<Disparador />);
    await fireEvent.press(screen.getByText('disparar'));
    expect(screen.queryByText('Gestor creado')).toBeNull();
  });
});

describe('HojaInferior y Dialogo', () => {
  it('la hoja muestra el título y el contenido, y el velo la cierra', async () => {
    const cerrar = jest.fn();
    await render(conAreaSegura(<HojaInferior visible titulo="Filtros" alCerrar={cerrar}><Text>contenido</Text></HojaInferior>));
    expect(screen.getByText('Filtros')).toBeOnTheScreen();
    expect(screen.getByText('contenido')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('hoja-velo'));
    expect(cerrar).toHaveBeenCalled();
  });

  it('cerrada no muestra nada', async () => {
    await render(conAreaSegura(<HojaInferior visible={false} alCerrar={jest.fn()}><Text>contenido</Text></HojaInferior>));
    expect(screen.queryByText('contenido')).toBeNull();
  });

  it('el diálogo confirma o cancela, y mientras envía bloquea los dos botones', async () => {
    const confirmar = jest.fn();
    const cancelar = jest.fn();
    const { rerender } = await render(
      <Dialogo visible titulo="¿Dar de baja a Laura?" mensaje="No va a poder volver a ingresar." etiquetaConfirmar="Dar de baja" peligro alConfirmar={confirmar} alCancelar={cancelar} />,
    );
    expect(screen.getByText('No va a poder volver a ingresar.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Dar de baja' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    expect(confirmar).toHaveBeenCalledTimes(1);
    expect(cancelar).toHaveBeenCalledTimes(1);
    await rerender(
      <Dialogo visible titulo="¿Dar de baja a Laura?" etiquetaConfirmar="Dar de baja" peligro enviando alConfirmar={confirmar} alCancelar={cancelar} />,
    );
    expect(screen.getByRole('button', { name: 'Dar de baja' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  });
});

describe('Esqueleto y BotonFlotante', () => {
  it('el esqueleto no se anuncia a lectores de pantalla', async () => {
    await render(<Esqueleto alto={20} />);
    expect(screen.getByTestId('esqueleto', { includeHiddenElements: true }).props.accessibilityElementsHidden).toBe(true);
  });

  it('el botón flotante se toca por su nombre', async () => {
    const onPress = jest.fn();
    await render(<BotonFlotante icono="add" accessibilityLabel="Añadir gestor" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Añadir gestor' }));
    expect(onPress).toHaveBeenCalled();
  });
});
