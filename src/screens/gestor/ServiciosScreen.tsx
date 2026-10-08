import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { eliminarTipoServicio, listarTiposServicio, type TipoServicio } from '../../api/catalogo';
import { Button, Card, EstadoVacio } from '../../components';
import type { NombreDeIcono } from '../../navigation/iconos';
import type { GestorStackParams } from '../../navigation/tipos';
import { colores, espaciado, tamanios, tipografia } from '../../theme';
import { mensajeDe } from '../../utils/errores';

/** Tipos de servicio · CU13 · B1, B4 (alta y edición en FormularioTipoServicio). Provisoria: sin maqueta (D10). */
export function ServiciosScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GestorStackParams>>();
  const [tipos, setTipos] = useState<TipoServicio[] | null>(null);
  const [errorGeneral, setErrorGeneral] = useState<string>();
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [errorDeItem, setErrorDeItem] = useState<{ uuid: string; mensaje: string }>();
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(() => {
    let vigente = true;
    setErrorGeneral(undefined);
    listarTiposServicio()
      .then((lista) => vigente && setTipos(lista))
      .catch((e) => {
        if (!vigente) return;
        setErrorGeneral(mensajeDe(e));
        setTipos((actual) => actual ?? []);
      });
    return () => {
      vigente = false;
    };
  }, []);
  useFocusEffect(cargar);

  async function darDeBaja(uuid: string) {
    setErrorDeItem(undefined);
    setEnviando(true);
    try {
      await eliminarTipoServicio(uuid);
      setConfirmando(null);
      setTipos(await listarTiposServicio());
    } catch (e) {
      setConfirmando(null);
      setErrorDeItem({ uuid, mensaje: mensajeDe(e) });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={estilos.contenedor}>
      <Text style={estilos.aviso}>Pantalla provisoria: sin diseño en la maqueta (D10).</Text>
      <Text style={estilos.titulo}>Servicios</Text>
      <Button etiqueta="Añadir tipo de servicio" onPress={() => navigation.navigate('FormularioTipoServicio', {})} />
      {errorGeneral !== undefined && <Text style={estilos.mensaje}>{errorGeneral}</Text>}
      {tipos !== null && tipos.length === 0 && <EstadoVacio mensaje="Todavía no hay tipos de servicio." />}
      <View style={estilos.lista}>
        {(tipos ?? []).map((t) => (
          <View key={t.uuid}>
            <Card>
              <Ionicons
                name={(t.icono ?? 'construct') as NombreDeIcono}
                size={tamanios.icono}
                color={colores.lila}
                style={estilos.icono}
              />
              <View style={estilos.cuerpo}>
                <Text style={estilos.nombre}>{t.nombre}</Text>
                {t.requiereMatricula && <Text style={estilos.dato}>Requiere matrícula</Text>}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Editar ${t.nombre}`}
                hitSlop={espaciado.s}
                onPress={() => navigation.navigate('FormularioTipoServicio', { uuid: t.uuid })}
              >
                <Ionicons name="create-outline" size={tamanios.icono} color={colores.tinta} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Dar de baja ${t.nombre}`}
                hitSlop={espaciado.s}
                style={estilos.baja}
                onPress={() => {
                  setErrorDeItem(undefined);
                  setConfirmando(t.uuid);
                }}
              >
                <Ionicons name="trash-outline" size={tamanios.icono} color={colores.tinta} />
              </Pressable>
            </Card>
            {confirmando === t.uuid && (
              <View style={estilos.confirmacion}>
                <Text style={estilos.mensaje}>
                  {`¿Dar de baja ${t.nombre}? Los prestadores ya no podrán elegirlo.`}
                </Text>
                <Button etiqueta="Confirmar" variante="secundario" onPress={() => darDeBaja(t.uuid)} deshabilitado={enviando} />
                <Button etiqueta="Cancelar" variante="terciario" onPress={() => setConfirmando(null)} />
              </View>
            )}
            {errorDeItem?.uuid === t.uuid && <Text style={estilos.mensaje}>{errorDeItem.mensaje}</Text>}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { padding: espaciado.l },
  aviso: { ...tipografia.cuerpo, color: colores.tintaSecundaria, marginBottom: espaciado.s },
  titulo: { ...tipografia.titulo, color: colores.lila, marginBottom: espaciado.m },
  lista: { marginTop: espaciado.m },
  icono: { marginRight: espaciado.m },
  cuerpo: { flex: 1 },
  nombre: { ...tipografia.seccion, color: colores.tinta },
  dato: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
  baja: { marginLeft: espaciado.m },
  confirmacion: { gap: espaciado.s, marginBottom: espaciado.m },
  mensaje: { ...tipografia.cuerpo, color: colores.tinta, marginBottom: espaciado.s },
});
