import { View } from 'react-native';

/**
 * Ionicons para los tests: no carga fuentes (jest.resetAllMocks reinicia los mocks internos de jest-expo y la
 * carga de la fuente fallaba). Queda un View con el nombre del ícono como testID.
 */
function Ionicons({ name, testID }: { name: string; testID?: string }) {
  return <View testID={testID ?? `icono-${name}`} />;
}

Ionicons.glyphMap = {} as Record<string, number>;

export default Ionicons;
