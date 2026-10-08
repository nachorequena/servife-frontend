import { useRoute, type RouteProp } from '@react-navigation/native';
import { StyleSheet, Text } from 'react-native';

import { PantallaPendiente } from '../../components';
import type { ClienteTabsParams } from '../../navigation/tipos';
import { colores, espaciado, tipografia } from '../../theme';

/** Solicitudes del cliente; desde acá se completa una valoración pospuesta (D07). */
export function HistorialScreen() {
  const aviso = useRoute<RouteProp<ClienteTabsParams, 'Historial'>>().params?.aviso;
  return (
    <>
      {aviso !== undefined && <Text style={estilos.aviso}>{aviso}</Text>}
      <PantallaPendiente titulo="Historial" respaldo="CU06 · CU08" endpoints={['C2', 'C3']} />
    </>
  );
}

const estilos = StyleSheet.create({
  aviso: { ...tipografia.cuerpo, color: colores.tinta, backgroundColor: colores.verdeClaro, padding: espaciado.m },
});
