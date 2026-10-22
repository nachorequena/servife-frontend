import Ionicons from '@expo/vector-icons/Ionicons';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { bordes, colores, duraciones, elevaciones, espaciado, radios, tamanios, tipografia } from '../theme';

export type TipoDeAviso = 'exito' | 'error';

interface Aviso {
  id: number;
  mensaje: string;
  tipo: TipoDeAviso;
}

interface ValorDeAvisos {
  /** Muestra un aviso abajo de la pantalla que se va solo a los 3 s. Uno nuevo reemplaza al anterior. */
  mostrar: (mensaje: string, tipo?: TipoDeAviso) => void;
}

/** Sin proveedor (por ejemplo, en un test de una pantalla suelta) no hace nada. */
const ContextoDeAvisos = createContext<ValorDeAvisos>({ mostrar: () => undefined });

/**
 * Avisos flotantes (toast) para confirmar una acción ("Gestor creado") o informar un error que no es de un
 * campo. Va una sola vez, en App.tsx; las pantallas usan useAvisoFlotante().
 */
export function ProveedorDeAvisosFlotantes({ children }: { children: ReactNode }) {
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const contador = useRef(0);

  const mostrar = useCallback((mensaje: string, tipo: TipoDeAviso = 'exito') => {
    setAviso({ id: ++contador.current, mensaje, tipo });
  }, []);
  const valor = useMemo(() => ({ mostrar }), [mostrar]);

  return (
    <ContextoDeAvisos.Provider value={valor}>
      {children}
      {aviso !== null && <AvisoVisible key={aviso.id} aviso={aviso} alTerminar={() => setAviso(null)} />}
    </ContextoDeAvisos.Provider>
  );
}

export function useAvisoFlotante(): ValorDeAvisos {
  return useContext(ContextoDeAvisos);
}

function AvisoVisible({ aviso, alTerminar }: { aviso: Aviso; alTerminar: () => void }) {
  const { bottom } = useSafeAreaInsets();
  const opacidad = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacidad, { toValue: 1, duration: duraciones.animacion, useNativeDriver: true }).start();
    const temporizador = setTimeout(alTerminar, duraciones.aviso);
    return () => clearTimeout(temporizador);
  }, [opacidad, alTerminar]);

  const error = aviso.tipo === 'error';
  return (
    <Animated.View
      style={[estilos.contenedor, { bottom: bottom + espaciado.xl * 2, opacity: opacidad }]}
      pointerEvents="box-none"
    >
      <Pressable
        testID="aviso-flotante"
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        accessibilityHint="Tocá para cerrar"
        onPress={alTerminar}
        style={[estilos.aviso, error ? estilos.error : estilos.exito]}
      >
        <Ionicons
          name={error ? 'close-circle' : 'checkmark-circle'}
          size={tamanios.icono}
          color={error ? colores.rojo : colores.verdeTexto}
        />
        <Text style={[estilos.texto, { color: error ? colores.rojo : colores.verdeTexto }]}>{aviso.mensaje}</Text>
      </Pressable>
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { position: 'absolute', left: espaciado.m, right: espaciado.m, alignItems: 'center' },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.s,
    paddingVertical: espaciado.m,
    paddingHorizontal: espaciado.m,
    borderRadius: radios.tarjeta,
    borderWidth: bordes.fino,
    alignSelf: 'stretch',
    ...elevaciones.flotante,
  },
  exito: { backgroundColor: colores.verdeClaro, borderColor: colores.verdeTexto },
  error: { backgroundColor: colores.rojoClaro, borderColor: colores.rojo },
  texto: { ...tipografia.cuerpo, fontWeight: '600', flex: 1 },
});
