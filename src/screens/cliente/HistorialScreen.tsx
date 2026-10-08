import { StyleSheet, Text } from 'react-native';

import { PantallaPendiente } from '../../components';
import { useAvisoDeRuta } from '../../hooks/useAvisoDeRuta';
import { colores, espaciado, tipografia } from '../../theme';

/** Solicitudes del cliente; desde acá se completa una valoración pospuesta (D07). */
export function HistorialScreen() {
  const aviso = useAvisoDeRuta();
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
