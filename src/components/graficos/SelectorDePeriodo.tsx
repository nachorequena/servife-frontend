import { StyleSheet, View } from 'react-native';

import { espaciado } from '../../theme';
import { hoyEnArgentina } from '../../utils/formato';
import { Chip } from '../Chip';

/** Opciones de período de los dashboards, en meses calendario contando el actual. */
export const PERIODOS_EN_MESES = [3, 6, 12] as const;
export type MesesDePeriodo = (typeof PERIODOS_EN_MESES)[number];

/** Primer día del mes de hace (meses - 1) meses, en hora de Argentina: con 6 y hoy 16/11/2026, "2026-06-01". */
export function desdeHaceMeses(meses: number, hoy: string = hoyEnArgentina()): string {
  const [anio, mes] = hoy.split('-').map(Number);
  const indice = anio * 12 + (mes - 1) - (meses - 1);
  const mesDesde = (indice % 12) + 1;
  return `${Math.floor(indice / 12)}-${String(mesDesde).padStart(2, '0')}-01`;
}

interface Props {
  meses: MesesDePeriodo;
  onCambiar: (meses: MesesDePeriodo) => void;
}

/** Fila de chips arriba de los gráficos (un solo filtro para todos, .ai/09-ux-ui.md). */
export function SelectorDePeriodo({ meses, onCambiar }: Props) {
  return (
    <View style={estilos.fila} accessibilityRole="radiogroup" accessibilityLabel="Período">
      {PERIODOS_EN_MESES.map((m) => (
        <Chip
          key={m}
          etiqueta={`${m} meses`}
          descripcion={`Últimos ${m} meses`}
          seleccionado={m === meses}
          onPress={() => onCambiar(m)}
        />
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', gap: espaciado.s, flexWrap: 'wrap' },
});
