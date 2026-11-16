import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import { colores, espaciado, tipografia } from '../../theme';

export interface PuntoPorMes {
  /** yyyy-MM */
  mes: string;
  cantidad: number;
}

interface Props {
  puntos: PuntoPorMes[];
  testID?: string;
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "2026-03" → "mar". Con más de 12 meses suma el año corto ("mar 26") para no repetir etiquetas. */
export function etiquetaDeMes(mes: string, conAnio = false): string {
  const [anio, numero] = mes.split('-');
  const nombre = MESES[Number(numero) - 1] ?? mes;
  return conAnio ? `${nombre} ${anio.slice(2)}` : nombre;
}

/** Espacio a la izquierda reservado para los números del eje Y. */
const ANCHO_EJE_Y = espaciado.xl;
const ALTO = 160;

/**
 * Solicitudes por mes: una sola línea (una serie: el título la nombra, sin leyenda), puntos visibles y el valor
 * al tocar un punto. El total de cada mes también va en el accessibilityLabel, que hace de "vista de tabla".
 */
export function GraficoPorMes({ puntos, testID }: Props) {
  const [ancho, setAncho] = useState(0);
  const conAnio = puntos.length > 12;
  const datos = puntos.map((p) => ({
    value: p.cantidad,
    label: etiquetaDeMes(p.mes, conAnio),
    dataPointText: String(p.cantidad),
  }));
  const maximo = Math.max(...puntos.map((p) => p.cantidad), 0);
  const descripcion = puntos.map((p) => `${etiquetaDeMes(p.mes, true)}: ${p.cantidad}`).join(', ');
  const espacio = puntos.length > 1 ? Math.max((ancho - ANCHO_EJE_Y - espaciado.l * 2) / (puntos.length - 1), espaciado.l) : espaciado.l;

  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={`Solicitudes por mes. ${descripcion}`}
      onLayout={(e: LayoutChangeEvent) => setAncho(e.nativeEvent.layout.width)}
    >
      {maximo === 0 ? (
        <Text style={estilos.vacio}>Todavía no hay solicitudes en este período.</Text>
      ) : (
        ancho > 0 && (
          <LineChart
            data={datos}
            width={ancho - ANCHO_EJE_Y}
            height={ALTO}
            spacing={espacio}
            initialSpacing={espaciado.m}
            endSpacing={espaciado.m}
            color={colores.lila}
            thickness={2}
            dataPointsColor={colores.lila}
            dataPointsRadius={4}
            focusEnabled
            showTextOnFocus
            showDataPointOnFocus={false}
            textColor={colores.tinta}
            textFontSize={tipografia.etiqueta.fontSize}
            textShiftY={-espaciado.s}
            noOfSections={4}
            maxValue={Math.max(4, Math.ceil(maximo / 4) * 4)}
            yAxisLabelWidth={ANCHO_EJE_Y}
            yAxisColor={colores.bordeSuave}
            xAxisColor={colores.bordeSuave}
            rulesColor={colores.bordeSuave}
            rulesType="solid"
            yAxisTextStyle={estilos.eje}
            xAxisLabelTextStyle={estilos.eje}
            areaChart
            startFillColor={colores.lila}
            endFillColor={colores.blanco}
            startOpacity={0.15}
            endOpacity={0}
          />
        )
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  eje: { ...tipografia.etiqueta, color: colores.tintaSecundaria },
  vacio: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
});
