import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, type DimensionValue } from 'react-native';

import { colores, duraciones, radios } from '../theme';

interface Props {
  ancho?: DimensionValue;
  alto: number;
  /** Para un avatar redondo, radios.pill. */
  radio?: number;
}

/** Marcador gris que late mientras carga, con la forma del contenido que va a aparecer. */
export function Esqueleto({ ancho = '100%', alto, radio = radios.input }: Props) {
  const opacidad = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulso = Animated.loop(
      Animated.sequence([
        Animated.timing(opacidad, { toValue: 0.4, duration: duraciones.pulso, useNativeDriver: true }),
        Animated.timing(opacidad, { toValue: 1, duration: duraciones.pulso, useNativeDriver: true }),
      ]),
    );
    pulso.start();
    return () => pulso.stop();
  }, [opacidad]);

  return (
    <Animated.View
      testID="esqueleto"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[estilos.base, { width: ancho, height: alto, borderRadius: radio, opacity: opacidad }]}
    />
  );
}

const estilos = StyleSheet.create({
  base: { backgroundColor: colores.esqueleto },
});
