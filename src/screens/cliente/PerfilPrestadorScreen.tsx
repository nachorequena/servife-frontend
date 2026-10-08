import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { obtenerPrestador, type PrestadorDetalle } from '../../api/catalogo';
import { ApiError } from '../../api/errores';
import { Avatar, Button, Logo, Stars } from '../../components';
import type { ClienteStackParams } from '../../navigation/tipos';
import { colores, espaciado, radios, tamanios, tipografia } from '../../theme';
import { nombresDeDias } from '../../utils/formato';

type Estado =
  | { tipo: 'cargando' }
  | { tipo: 'listo'; prestador: PrestadorDetalle }
  | { tipo: 'noDisponible' }
  | { tipo: 'error' };

/** CU05 · Perfil del prestador para el cliente (B6). Sin tarifa (D02). */
export function PerfilPrestadorScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ClienteStackParams>>();
  const { uuidPrestador } = useRoute<RouteProp<ClienteStackParams, 'PerfilPrestador'>>().params;
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    setEstado({ tipo: 'cargando' });
    obtenerPrestador(uuidPrestador)
      .then((prestador) => vigente && setEstado({ tipo: 'listo', prestador }))
      .catch((e) => {
        if (!vigente) return;
        setEstado(e instanceof ApiError && e.status === 404 ? { tipo: 'noDisponible' } : { tipo: 'error' });
      });
    return () => {
      vigente = false;
    };
  }, [uuidPrestador, intento]);

  const reintentar = useCallback(() => setIntento((n) => n + 1), []);

  if (estado.tipo === 'cargando') {
    return <ActivityIndicator color={colores.verde} size="large" style={estilos.cargando} />;
  }
  if (estado.tipo === 'noDisponible') {
    return (
      <View style={estilos.aviso}>
        <Text style={estilos.mensaje}>Este prestador ya no está disponible.</Text>
        <Button etiqueta="Volver" onPress={() => navigation.goBack()} />
      </View>
    );
  }
  if (estado.tipo === 'error') {
    return (
      <View style={estilos.aviso}>
        <Text style={estilos.mensaje}>No pudimos cargar el perfil.</Text>
        <Button etiqueta="Reintentar" onPress={reintentar} />
      </View>
    );
  }

  const p = estado.prestador;
  const dias = nombresDeDias(p.dias);
  return (
    <ScrollView style={estilos.pantalla} contentContainerStyle={estilos.contenido}>
      <View style={estilos.banda}>
        <View style={estilos.logo}>
          <Logo />
        </View>
        <Text style={estilos.nombre}>{p.nombreApellido}</Text>
        <View style={estilos.avatar}>
          <Avatar nombre={p.nombreApellido} tamanio={tamanios.avatarGrande} />
        </View>
      </View>
      <View style={estilos.hoja}>
        <Fila icono="person" texto={`Servicio: ${p.tipoServicio.nombre}`} />
        <Fila icono="calendar" texto={dias ? `Disponibilidad: ${dias}` : 'Sin días cargados'} />
        {p.zona ? <Fila icono="location" texto={`Zona: ${p.zona}`} /> : null}
        {p.descripcion ? <Text style={estilos.descripcion}>{p.descripcion}</Text> : null}
        <View style={estilos.fila}>
          <View style={estilos.icono}>
            <Ionicons name="star-outline" size={tamanios.icono} color={colores.tinta} />
          </View>
          {p.valoracionPromedio === null ? (
            <Text style={estilos.texto}>Sin valoraciones todavía</Text>
          ) : (
            <Stars valor={p.valoracionPromedio} />
          )}
        </View>
        <Fila icono="briefcase" texto={`${p.serviciosRealizados} servicios realizados`} />
        {p.verificado ? <Fila icono="shield-checkmark" texto="Verificado" color={colores.verde} /> : null}
        <View style={estilos.botones}>
          <Button
            etiqueta="Ver trabajos realizados"
            variante="secundario"
            onPress={() => navigation.navigate('TrabajosRealizados', { uuidPrestador })}
          />
          <Button
            etiqueta="Solicitar servicio"
            onPress={() => navigation.navigate('FormularioSolicitud', { uuidPrestador })}
          />
        </View>
      </View>
    </ScrollView>
  );
}

interface FilaProps {
  icono: keyof typeof Ionicons.glyphMap;
  texto: string;
  color?: string;
}

function Fila({ icono, texto, color = colores.tinta }: FilaProps) {
  return (
    <View style={estilos.fila}>
      <View style={estilos.icono}>
        <Ionicons name={icono} size={tamanios.icono} color={color} />
      </View>
      <Text style={estilos.texto}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.verde },
  contenido: { flexGrow: 1 },
  cargando: { flex: 1 },
  aviso: { flex: 1, justifyContent: 'center', padding: espaciado.l, gap: espaciado.m, backgroundColor: colores.fondo },
  mensaje: { ...tipografia.seccion, color: colores.tinta, textAlign: 'center' },
  banda: { backgroundColor: colores.verde, alignItems: 'center', paddingBottom: espaciado.l },
  logo: { alignSelf: 'flex-start', paddingHorizontal: espaciado.m },
  nombre: { ...tipografia.seccion, color: colores.tinta, marginVertical: espaciado.s },
  avatar: { borderWidth: 3, borderColor: colores.blanco, borderRadius: radios.pill },
  hoja: {
    flex: 1,
    backgroundColor: colores.blanco,
    borderTopLeftRadius: radios.hoja,
    borderTopRightRadius: radios.hoja,
    marginTop: -espaciado.m,
    padding: espaciado.l,
    gap: espaciado.m,
  },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espaciado.m },
  icono: { width: espaciado.l + espaciado.xs, alignItems: 'center' },
  texto: { ...tipografia.cuerpo, color: colores.tinta, flexShrink: 1 },
  descripcion: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
  botones: { gap: espaciado.m, marginTop: espaciado.m },
});
