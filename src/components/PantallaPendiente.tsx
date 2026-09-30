import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { colores, espaciado, tipografia } from '../theme';

interface Props {
  titulo: string;
  /** Caso de uso o decisión que respalda la pantalla. */
  respaldo: string;
  /** IDs de los endpoints que consume, según el prototipo. */
  endpoints?: string[];
  /** Pantalla que la maqueta no tiene (D10): no inventarla, esperar el diseño. */
  sinDisenio?: boolean;
  children?: ReactNode;
}

/**
 * Marcador temporal de una pantalla sin implementar. Cuando el dueño del módulo arma la
 * pantalla real, reemplaza este componente. Cuando no quede ningún uso, se borra.
 */
export function PantallaPendiente({ titulo, respaldo, endpoints = [], sinDisenio = false, children }: Props) {
  return (
    <ScrollView contentContainerStyle={estilos.contenedor}>
      <Text style={estilos.titulo}>{titulo}</Text>
      <Text style={estilos.dato}>{respaldo}</Text>
      {endpoints.length > 0 && <Text style={estilos.dato}>Endpoints: {endpoints.join(', ')}</Text>}
      <Text style={estilos.dato}>
        {sinDisenio ? 'Sin diseño en la maqueta (D10). No inventarla.' : 'Pendiente de implementar.'}
      </Text>
      {children}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { padding: espaciado.l, gap: espaciado.s, backgroundColor: colores.fondo, flexGrow: 1 },
  titulo: { ...tipografia.titulo, color: colores.tinta, marginBottom: espaciado.m },
  dato: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
});
