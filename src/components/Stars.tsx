import { StyleSheet, Text } from 'react-native';

import { colores, tipografia } from '../theme';

interface Props {
  /** Puntaje de 0 a 5; se redondea al entero más cercano. */
  valor: number;
}

const MAXIMO = 5;

/**
 * Estrellas de solo lectura. En "Trabajos realizados" solo se muestran si el trabajo tiene
 * solicitud asociada (D07): si no, el que llama no renderiza este componente.
 */
export function Stars({ valor }: Props) {
  const llenas = Math.max(0, Math.min(MAXIMO, Math.round(valor)));
  return (
    <Text style={estilos.estrellas} accessibilityLabel={`${llenas} de ${MAXIMO} estrellas`}>
      {'★'.repeat(llenas)}
      {'☆'.repeat(MAXIMO - llenas)}
    </Text>
  );
}

const estilos = StyleSheet.create({
  estrellas: { ...tipografia.seccion, color: colores.estrella },
});
