import { fireEvent, render, screen } from '@testing-library/react-native';

import { BarrasHorizontales, GraficoPorMes, etiquetaDeMes } from '../graficos';

describe('BarrasHorizontales', () => {
  it('muestra cada fila con su valor y detalle, legible sin color', async () => {
    await render(
      <BarrasHorizontales
        barras={[
          { clave: 'Gas', etiqueta: 'Gas', valor: 5, detalle: '3 realizados' },
          { clave: 'Plomería', etiqueta: 'Plomería', valor: 2 },
        ]}
        vacio="Sin datos"
      />,
    );

    expect(screen.getByText('5 · 3 realizados')).toBeTruthy();
    expect(screen.getByLabelText('Plomería: 2')).toBeTruthy();
  });

  it('sin barras muestra el mensaje de vacío', async () => {
    await render(<BarrasHorizontales barras={[]} vacio="Sin datos" />);
    expect(screen.getByText('Sin datos')).toBeTruthy();
  });
});

describe('GraficoPorMes', () => {
  const puntos = [
    { mes: '2026-03', cantidad: 2 },
    { mes: '2026-04', cantidad: 0 },
  ];

  it('describe cada mes en el label accesible y dibuja la línea al conocer el ancho', async () => {
    await render(<GraficoPorMes testID="grafico" puntos={puntos} />);
    const grafico = screen.getByTestId('grafico');
    await fireEvent(grafico, 'layout', { nativeEvent: { layout: { width: 320, height: 200 } } });

    expect(grafico.props.accessibilityLabel).toBe('Solicitudes por mes. mar 26: 2, abr 26: 0');
    expect(screen.getAllByText('mar').length).toBeGreaterThan(0);
  });

  it('sin solicitudes en el período lo dice en vez de dibujar una línea plana', async () => {
    await render(<GraficoPorMes puntos={[{ mes: '2026-03', cantidad: 0 }]} />);
    expect(screen.getByText('Todavía no hay solicitudes en este período.')).toBeTruthy();
  });

  it('etiquetaDeMes agrega el año corto cuando se pide', async () => {
    expect(etiquetaDeMes('2026-12')).toBe('dic');
    expect(etiquetaDeMes('2026-01', true)).toBe('ene 26');
  });
});
