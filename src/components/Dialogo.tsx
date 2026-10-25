import { Modal, StyleSheet, Text, View } from 'react-native';

import { colores, elevaciones, espaciado, radios, tipografia } from '../theme';
import { Button } from './Button';

interface Props {
  visible: boolean;
  titulo: string;
  mensaje?: string;
  etiquetaConfirmar: string;
  /** Acción destructiva (dar de baja, rechazar): el botón de confirmar va en rojo. */
  peligro?: boolean;
  /** Mientras se envía, los dos botones quedan deshabilitados. */
  enviando?: boolean;
  alConfirmar: () => void;
  alCancelar: () => void;
}

/** Diálogo centrado para confirmar una acción ("¿Dar de baja a Laura?"). Atrás de Android cancela. */
export function Dialogo({ visible, titulo, mensaje, etiquetaConfirmar, peligro = false, enviando = false, alConfirmar, alCancelar }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={alCancelar} statusBarTranslucent>
      <View style={estilos.velo}>
        <View style={estilos.caja} accessibilityViewIsModal testID="dialogo">
          <Text style={estilos.titulo} accessibilityRole="header">
            {titulo}
          </Text>
          {mensaje !== undefined && <Text style={estilos.mensaje}>{mensaje}</Text>}
          <View style={estilos.acciones}>
            <Button etiqueta="Cancelar" variante="contorno" tamanio="chico" ancho="contenido" onPress={alCancelar} deshabilitado={enviando} />
            <Button
              etiqueta={etiquetaConfirmar}
              variante={peligro ? 'peligro' : 'primario'}
              tamanio="chico"
              ancho="contenido"
              onPress={alConfirmar}
              deshabilitado={enviando}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  velo: { flex: 1, backgroundColor: colores.velo, justifyContent: 'center', padding: espaciado.l },
  caja: { backgroundColor: colores.blanco, borderRadius: radios.hoja, padding: espaciado.l, gap: espaciado.m, ...elevaciones.flotante },
  titulo: { ...tipografia.seccion, color: colores.tinta },
  mensaje: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
  acciones: { flexDirection: 'row', justifyContent: 'flex-end', gap: espaciado.s },
});
