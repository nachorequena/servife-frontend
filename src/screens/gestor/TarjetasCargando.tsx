import { StyleSheet, View } from 'react-native';

import { Card, Esqueleto } from '../../components';
import { espaciado, radios, tamanios } from '../../theme';

/** Tarjetas esqueleto con la forma de una fila de lista del gestor (avatar, nombre y dos datos) mientras carga. */
export function TarjetasCargando({ cantidad = 3 }: { cantidad?: number }) {
  return (
    <View style={estilos.lista} testID="cargando">
      {Array.from({ length: cantidad }, (_, i) => (
        <Card key={i} variante="blanca">
          <Esqueleto ancho={tamanios.avatarChico} alto={tamanios.avatarChico} radio={radios.pill} />
          <View style={estilos.cuerpo}>
            <Esqueleto ancho="60%" alto={espaciado.m} />
            <Esqueleto ancho="85%" alto={espaciado.m - espaciado.xs} />
            <Esqueleto ancho="40%" alto={espaciado.m - espaciado.xs} />
          </View>
        </Card>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  lista: { padding: espaciado.l, gap: espaciado.s },
  cuerpo: { flex: 1, gap: espaciado.s },
});
