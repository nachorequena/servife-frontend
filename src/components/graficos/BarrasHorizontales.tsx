import { StyleSheet, Text, View } from 'react-native';

import { colores, espaciado, tipografia } from '../../theme';

export interface Barra {
  /** Identidad estable de la fila (nombre del servicio, estado, cliente...). */
  clave: string;
  etiqueta: string;
  valor: number;
  /** Texto chico extra al lado del valor (por ejemplo, "3 realizados"). */
  detalle?: string;
}

interface Props {
  barras: Barra[];
  /** Mensaje cuando no hay datos. */
  vacio: string;
  testID?: string;
}

/**
 * Ranking en barras horizontales: un solo color (magnitud, no identidad), etiqueta arriba y el valor escrito al
 * lado, así se lee sin depender del color ni del largo. Se usa para "por servicio", "por estado", "por cliente"
 * y "top prestadores". Hecho con Views: no necesita la librería de gráficos.
 */
export function BarrasHorizontales({ barras, vacio, testID }: Props) {
  if (barras.length === 0) {
    return <Text style={estilos.vacio}>{vacio}</Text>;
  }
  const maximo = Math.max(...barras.map((b) => b.valor), 1);
  return (
    <View testID={testID} style={estilos.lista}>
      {barras.map((b) => {
        const texto = b.detalle ? `${b.valor} · ${b.detalle}` : `${b.valor}`;
        return (
          <View key={b.clave} accessible accessibilityLabel={`${b.etiqueta}: ${texto}`} style={estilos.fila}>
            <Text style={estilos.etiqueta} numberOfLines={1}>
              {b.etiqueta}
            </Text>
            <View style={estilos.filaBarra}>
              <View style={estilos.pista}>
                <View style={[estilos.barra, { flex: b.valor / maximo }]} />
                <View style={{ flex: 1 - b.valor / maximo }} />
              </View>
              <Text style={estilos.valor}>{texto}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Alto de la barra: fina, como pide la guía de gráficos. */
const ALTO_BARRA = espaciado.s + espaciado.xs;

const estilos = StyleSheet.create({
  lista: { gap: espaciado.s },
  fila: { gap: espaciado.xs },
  etiqueta: { ...tipografia.cuerpo, color: colores.tinta },
  filaBarra: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s },
  pista: { flex: 1, flexDirection: 'row', height: ALTO_BARRA },
  barra: { backgroundColor: colores.lila, borderTopRightRadius: espaciado.xs, borderBottomRightRadius: espaciado.xs, minWidth: 2 },
  valor: { ...tipografia.etiqueta, color: colores.tintaSecundaria, minWidth: espaciado.xl },
  vacio: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
});
