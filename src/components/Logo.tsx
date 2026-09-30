import { StyleSheet, Text } from 'react-native';

import { colores, tipografia } from '../theme';

interface Props {
  /** Solo en el encabezado del chat el logo va en blanco; en el resto, sobre verde también, negro. */
  enChat?: boolean;
}

/** Logo "ServiFe". Es un componente, nunca texto suelto (servife-ia/.ai/09-ux-ui.md). */
export function Logo({ enChat = false }: Props) {
  return <Text style={[estilos.logo, enChat && estilos.enChat]}>ServiFe</Text>;
}

const estilos = StyleSheet.create({
  logo: { ...tipografia.logo, color: colores.tinta },
  enChat: { color: colores.blanco },
});
