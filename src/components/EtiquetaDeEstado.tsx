import { StyleSheet, Text, View } from 'react-native';

import type { EstadoSolicitud } from '../api/solicitudes';
import { colores, espaciado, radios, tipografia } from '../theme';

const TEXTOS: Record<EstadoSolicitud, string> = {
  PENDIENTE: 'Pendiente',
  ACEPTADA: 'Aceptada',
  EN_CURSO: 'En curso',
  FINALIZADA: 'Finalizada',
  VALORADA: 'Valorada',
  RECHAZADA: 'Rechazada',
  CANCELADA: 'Cancelada',
};

const FONDOS: Record<EstadoSolicitud, string> = {
  PENDIENTE: colores.lila,
  ACEPTADA: colores.verde,
  EN_CURSO: colores.verde,
  FINALIZADA: colores.verde,
  VALORADA: colores.verdeOscuro,
  RECHAZADA: colores.tintaSecundaria,
  CANCELADA: colores.tintaSecundaria,
};

/** Píldora con el estado de una solicitud. */
export function EtiquetaDeEstado({ estado }: { estado: EstadoSolicitud }) {
  return (
    <View style={[estilos.pill, { backgroundColor: FONDOS[estado] }]}>
      <Text style={estilos.texto}>{TEXTOS[estado]}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: radios.pill,
    paddingVertical: espaciado.xs,
    paddingHorizontal: espaciado.s,
  },
  texto: { ...tipografia.globo, color: colores.blanco },
});
