import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { actualizarTipoServicio, crearTipoServicio, listarTiposServicio } from '../../api/catalogo';
import { ApiError } from '../../api/errores';
import { Button, Input } from '../../components';
import type { GestorStackParams } from '../../navigation/tipos';
import { bordes, colores, espaciado, radios, tamanios, tipografia } from '../../theme';
import { ICONOS_DE_SERVICIO } from '../../utils/iconosDeServicio';
import { MENSAJE_DE_RED } from '../../utils/errores';

const CAMPOS = ['nombre', 'icono', 'requiereMatricula'];

/** Alta y edición de un tipo de servicio · CU13 · B2 y B3. Provisoria: sin maqueta (D10). */
export function FormularioTipoServicio() {
  const navigation = useNavigation<NativeStackNavigationProp<GestorStackParams>>();
  const { params } = useRoute<NativeStackScreenProps<GestorStackParams, 'FormularioTipoServicio'>['route']>();
  const uuid = params?.uuid;
  const [nombre, setNombre] = useState('');
  const [icono, setIcono] = useState<string>();
  const [requiereMatricula, setRequiereMatricula] = useState(false);
  const [errorLocal, setErrorLocal] = useState<{ nombre?: string; icono?: string }>({});
  const [fallo, setFallo] = useState<{ api: ApiError | null; red: boolean }>({ api: null, red: false });
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (uuid === undefined) return;
    let vigente = true;
    listarTiposServicio()
      .then((lista) => {
        const actual = lista.find((t) => t.uuid === uuid);
        if (!vigente || !actual) return;
        setNombre(actual.nombre);
        setIcono(actual.icono ?? undefined);
        setRequiereMatricula(actual.requiereMatricula);
      })
      .catch(() => vigente && setFallo({ api: null, red: true }));
    return () => {
      vigente = false;
    };
  }, [uuid]);

  async function guardar() {
    setFallo({ api: null, red: false });
    const local: typeof errorLocal = {};
    if (nombre.trim() === '') local.nombre = 'Ingresá un nombre';
    if (icono === undefined) local.icono = 'Elegí un ícono';
    setErrorLocal(local);
    if (icono === undefined || local.nombre !== undefined) return;

    const cuerpo = { nombre: nombre.trim(), icono, requiereMatricula };
    setGuardando(true);
    try {
      if (uuid === undefined) {
        await crearTipoServicio(cuerpo);
      } else {
        await actualizarTipoServicio(uuid, cuerpo);
      }
      navigation.goBack();
    } catch (e) {
      setFallo(e instanceof ApiError ? { api: e, red: false } : { api: null, red: true });
    } finally {
      setGuardando(false);
    }
  }

  const { api } = fallo;
  const general = api && !CAMPOS.some((campo) => api.errorDe(campo)) ? api.message : undefined;

  return (
    <ScrollView contentContainerStyle={estilos.contenedor}>
      <Text style={estilos.aviso}>Pantalla provisoria: sin diseño en la maqueta (D10).</Text>
      <Input
        etiqueta="Nombre"
        value={nombre}
        onChangeText={setNombre}
        error={errorLocal.nombre ?? api?.errorDe('nombre')}
      />

      <Text style={estilos.etiqueta}>Ícono</Text>
      <View style={estilos.grilla}>
        {ICONOS_DE_SERVICIO.map((nombreIcono) => {
          const elegido = icono === nombreIcono;
          return (
            <Pressable
              key={nombreIcono}
              accessibilityRole="button"
              accessibilityLabel={`Ícono ${nombreIcono}`}
              accessibilityState={{ selected: elegido }}
              onPress={() => setIcono(nombreIcono)}
              style={[estilos.celda, elegido && estilos.celdaElegida]}
            >
              <Ionicons name={nombreIcono} size={tamanios.icono} color={elegido ? colores.blanco : colores.tinta} />
            </Pressable>
          );
        })}
      </View>
      {(errorLocal.icono ?? api?.errorDe('icono')) !== undefined && (
        <Text style={estilos.mensaje}>{errorLocal.icono ?? api?.errorDe('icono')}</Text>
      )}

      <View style={estilos.fila}>
        <Text style={estilos.etiquetaFila}>Requiere matrícula</Text>
        <Switch
          accessibilityLabel="Requiere matrícula"
          value={requiereMatricula}
          onValueChange={setRequiereMatricula}
          thumbColor={colores.blanco}
          trackColor={{ false: colores.tarjeta, true: colores.lila }}
        />
      </View>

      <Button etiqueta="Guardar" onPress={guardar} deshabilitado={guardando} />
      {general !== undefined && <Text style={estilos.mensaje}>{general}</Text>}
      {fallo.red && <Text style={estilos.mensaje}>{MENSAJE_DE_RED}</Text>}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { padding: espaciado.l },
  aviso: { ...tipografia.cuerpo, color: colores.tintaSecundaria, marginBottom: espaciado.m },
  etiqueta: { ...tipografia.cuerpo, color: colores.tinta, marginBottom: espaciado.xs },
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.s, marginBottom: espaciado.m },
  celda: {
    width: tamanios.celdaIcono,
    height: tamanios.celdaIcono,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.blanco,
    borderWidth: bordes.fino,
    borderColor: colores.tinta,
    borderRadius: radios.input,
  },
  celdaElegida: { backgroundColor: colores.lila, borderColor: colores.lila },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: espaciado.l },
  etiquetaFila: { ...tipografia.cuerpo, color: colores.tinta },
  mensaje: { ...tipografia.cuerpo, color: colores.tinta, marginBottom: espaciado.m },
});
