import { View } from 'react-native';

/**
 * Ionicons para los tests: no carga fuentes (jest.resetAllMocks reinicia los mocks internos de jest-expo y la
 * carga de la fuente fallaba). Queda un View con el nombre del ícono como testID y su accessibilityLabel, si tiene.
 */
function Ionicons({ name, testID, accessibilityLabel }: { name: string; testID?: string; accessibilityLabel?: string }) {
  return <View testID={testID ?? `icono-${name}`} accessibilityLabel={accessibilityLabel} />;
}

Ionicons.glyphMap = {} as Record<string, number>;

export default Ionicons;
