import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { contarAvisosNoLeidos } from '../api/notificaciones';
import { colores, espaciado, radios, tamanios, tipografia } from '../theme';

const REFRESCO_MS = 30_000;
const TOPE_VISIBLE = 9;

/** Campana del encabezado de las tabs: cuenta los avisos sin leer y abre la pantalla Avisos. */
export function Campanita() {
  const navigation = useNavigation<{ navigate: (ruta: 'Avisos') => void }>();
  const [cantidad, setCantidad] = useState(0);
  const montada = useRef(true);
  const pedido = useRef(0);

  useEffect(() => {
    montada.current = true;
    return () => {
      montada.current = false;
    };
  }, []);

  const consultar = useCallback(() => {
    const id = ++pedido.current;
    contarAvisosNoLeidos()
      .then((resultado) => {
        if (montada.current && id === pedido.current) setCantidad(resultado.cantidad);
      })
      .catch(() => {
        // Falla silenciosa: se conserva el último valor conocido.
      });
  }, []);

  // Solo consulta la instancia de la pantalla enfocada: al perder el foco se corta el intervalo.
  useFocusEffect(
    useCallback(() => {
      consultar();
      const intervalo = setInterval(consultar, REFRESCO_MS);
      return () => clearInterval(intervalo);
    }, [consultar]),
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Avisos, ${cantidad} sin leer`}
      hitSlop={espaciado.s}
      onPress={() => navigation.navigate('Avisos')}
      style={estilos.boton}
    >
      <Ionicons name="notifications-outline" size={tamanios.icono} color={colores.tinta} />
      {cantidad > 0 && (
        <View style={estilos.globo}>
          <Text style={estilos.numero}>{cantidad > TOPE_VISIBLE ? `${TOPE_VISIBLE}+` : String(cantidad)}</Text>
        </View>
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  boton: { marginRight: espaciado.m },
  globo: {
    position: 'absolute',
    top: -espaciado.xs,
    right: -espaciado.s,
    minWidth: tamanios.globo,
    height: tamanios.globo,
    paddingHorizontal: espaciado.xs,
    borderRadius: radios.pill,
    backgroundColor: colores.verde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numero: { ...tipografia.globo, color: colores.blanco },
});
