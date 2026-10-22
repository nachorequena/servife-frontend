import Ionicons from '@expo/vector-icons/Ionicons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { AdjuntosDeImagenes as Adjuntos } from '../hooks/useAdjuntosDeImagenes';
import { colores, espaciado, radios, tamanios, tipografia } from '../theme';
import { ImagenProtegida } from './ImagenProtegida';

interface Props {
  /** Lo que devuelve useAdjuntosDeImagenes. */
  adjuntos: Adjuntos;
  etiqueta: string;
  /** Mensaje bajo el botón (límite, tamaño, error del backend en imagenIds). */
  error?: string;
  /** Mientras se envía el formulario no se agrega, reintenta ni quita nada. */
  deshabilitado?: boolean;
}

/**
 * Botón para adjuntar imágenes y sus miniaturas, con el estado de cada subida y las acciones Reintentar y Quitar.
 * Las imágenes nuevas se muestran desde el archivo local; las ya subidas (al editar), con ImagenProtegida.
 */
export function AdjuntosDeImagenes({ adjuntos: a, etiqueta, error, deshabilitado = false }: Props) {
  return (
    <>
      <Pressable accessibilityRole="button" disabled={deshabilitado} style={estilos.subida} onPress={a.elegir}>
        <Text style={estilos.subidaTexto}>{etiqueta}</Text>
        <Ionicons name="add-circle-outline" size={tamanios.icono} color={colores.tintaSecundaria} />
      </Pressable>
      {error !== undefined && <Text style={estilos.error}>{error}</Text>}

      {a.adjuntos.length > 0 && (
        <View style={estilos.miniaturas}>
          {a.adjuntos.map((adjunto, i) => (
            <View key={adjunto.clave} style={estilos.miniatura}>
              {adjunto.uri !== undefined ? (
                <Image
                  source={{ uri: adjunto.uri }}
                  style={estilos.imagen}
                  accessibilityLabel={`Imagen ${i + 1}`}
                  accessibilityIgnoresInvertColors
                />
              ) : (
                <ImagenProtegida uuid={adjunto.uuid ?? ''} estilo={estilos.imagen} accessibilityLabel={`Imagen ${i + 1}`} />
              )}
              <Text style={estilos.estadoImagen}>
                {adjunto.estado === 'subiendo'
                  ? 'Subiendo…'
                  : adjunto.estado === 'lista'
                    ? 'Lista'
                    : (adjunto.mensaje ?? 'No se subió')}
              </Text>
              <View style={estilos.acciones}>
                {adjunto.estado === 'error' && adjunto.reintentable && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Reintentar imagen ${i + 1}`}
                    disabled={deshabilitado}
                    onPress={() => a.reintentar(adjunto)}
                  >
                    <Text style={estilos.enlace}>Reintentar</Text>
                  </Pressable>
                )}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Quitar imagen ${i + 1}`}
                  disabled={deshabilitado}
                  onPress={() => a.quitar(adjunto.clave)}
                >
                  <Text style={estilos.enlace}>Quitar</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

const estilos = StyleSheet.create({
  subida: {
    backgroundColor: colores.tarjeta,
    borderRadius: radios.input,
    padding: espaciado.l,
    alignItems: 'center',
    marginBottom: espaciado.m,
  },
  subidaTexto: { ...tipografia.cuerpo, color: colores.tintaSecundaria, marginBottom: espaciado.xs },
  miniaturas: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.s, marginBottom: espaciado.m },
  miniatura: { width: tamanios.miniatura, alignItems: 'center' },
  imagen: { width: tamanios.miniatura, height: tamanios.miniatura, borderRadius: radios.input },
  estadoImagen: { ...tipografia.globo, color: colores.tintaSecundaria, marginTop: espaciado.xs, textAlign: 'center' },
  acciones: { flexDirection: 'row', gap: espaciado.s },
  enlace: { ...tipografia.cuerpo, color: colores.verdeOscuro, fontWeight: '700' },
  error: { ...tipografia.cuerpo, color: colores.tinta, marginBottom: espaciado.m },
});
