import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  cambiarEstadoDeUsuario,
  eliminarUsuario,
  listarUsuarios,
  type EstadoDeCuenta,
  type RolDeUsuario,
  type UsuarioAdmin,
} from '../../api/gestion';
import type { ParametrosDePagina } from '../../api/paginacion';
import { Button, Card, Chip, EstadoVacio, Input } from '../../components';
import { useListaPaginada } from '../../hooks/useListaPaginada';
import type { GestorStackParams } from '../../navigation/tipos';
import { useSesion } from '../../store/sesion';
import { colores, espaciado, tipografia } from '../../theme';
import { mensajeDe } from '../../utils/errores';

/** Límites del backend: texto de E3 y motivo de E4. */
const MAXIMO_TEXTO = 120;
const MAXIMO_MOTIVO = 255;

const ROLES: { etiqueta: string; valor?: RolDeUsuario }[] = [
  { etiqueta: 'Todos' },
  { etiqueta: 'Clientes', valor: 'CLIENTE' },
  { etiqueta: 'Prestadores', valor: 'PRESTADOR' },
  { etiqueta: 'Gestores', valor: 'GESTOR' },
];

const ESTADOS: { etiqueta: string; valor?: EstadoDeCuenta }[] = [
  { etiqueta: 'Todas' },
  { etiqueta: 'Activas', valor: 'ACTIVA' },
  { etiqueta: 'Suspendidas', valor: 'SUSPENDIDA' },
];

const NOMBRE_DE_ROL: Record<RolDeUsuario, string> = { CLIENTE: 'Cliente', PRESTADOR: 'Prestador', GESTOR: 'Gestor' };
const NOMBRE_DE_VALIDACION = { PENDIENTE: 'pendiente de validación', APROBADO: 'aprobado', RECHAZADO: 'rechazado' } as const;

type Accion = 'SUSPENDER' | 'REACTIVAR' | 'ELIMINAR';

const claveDe = (u: UsuarioAdmin) => u.uuid;

/**
 * Usuarios · CU12 y sus extensiones CU15 a CU17 (D06) · E3, E4, E13, E14, E15. Sin maqueta (D10): lista
 * paginada con búsqueda (nombre, email o uuid) y filtros por rol y estado; cada tarjeta permite editar,
 * suspender o reactivar (con motivo, que le llega por correo) y dar de baja, con confirmación. Sobre la
 * propia cuenta solo se puede editar.
 */
export function UsuariosScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GestorStackParams>>();
  const { sesion } = useSesion();
  const [rol, setRol] = useState<RolDeUsuario>();
  const [estado, setEstado] = useState<EstadoDeCuenta>();
  const [busqueda, setBusqueda] = useState('');
  const [texto, setTexto] = useState<string>();
  const [confirmando, setConfirmando] = useState<{ uuid: string; accion: Accion } | null>(null);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string>();
  const [errorDeAccion, setErrorDeAccion] = useState<string>();

  const cargarPagina = useCallback(
    (pagina: ParametrosDePagina) => listarUsuarios({ rol, estado, texto, ...pagina }),
    [rol, estado, texto],
  );
  const { items, cargando, cargandoMas, refrescando, error, errorMas, errorAlActualizar, cargarMas, refrescar, reintentar, quitar } =
    useListaPaginada(cargarPagina, claveDe);

  function buscar() {
    const limpio = busqueda.trim();
    setTexto(limpio === '' ? undefined : limpio);
  }

  function abrir(uuid: string, accion: Accion) {
    setMotivo('');
    setAviso(undefined);
    setErrorDeAccion(undefined);
    setConfirmando({ uuid, accion });
  }

  async function confirmar(u: UsuarioAdmin, accion: Accion) {
    const texto = motivo.trim();
    if (accion === 'SUSPENDER' && texto === '') {
      setErrorDeAccion('Escribí el motivo: le llega al usuario por correo.');
      return;
    }
    setAviso(undefined);
    setErrorDeAccion(undefined);
    setEnviando(true);
    try {
      if (accion === 'ELIMINAR') {
        await eliminarUsuario(u.uuid);
        quitar(u.uuid);
        setAviso(`${u.nombreApellido} fue dado de baja.`);
      } else {
        const suspender = accion === 'SUSPENDER';
        await cambiarEstadoDeUsuario(
          u.uuid,
          texto === '' ? { estado: suspender ? 'SUSPENDIDA' : 'ACTIVA' } : { estado: suspender ? 'SUSPENDIDA' : 'ACTIVA', motivo: texto },
        );
        setAviso(suspender ? `Suspendiste a ${u.nombreApellido}. Le avisamos por correo.` : `${u.nombreApellido} está activo de nuevo.`);
      }
      setConfirmando(null);
      refrescar();
    } catch (e) {
      setErrorDeAccion(mensajeDe(e));
    } finally {
      setEnviando(false);
    }
  }

  function acciones(u: UsuarioAdmin) {
    const esYo = u.uuid === sesion?.usuario.uuid;
    if (confirmando?.uuid !== u.uuid) {
      return (
        <View style={estilos.acciones}>
          <Button
            etiqueta="Editar"
            variante="terciario"
            onPress={() => navigation.navigate('FormularioUsuario', { usuario: u })}
            deshabilitado={enviando}
          />
          {!esYo && (
            <>
              <Button
                etiqueta={u.estadoCuenta === 'ACTIVA' ? 'Suspender' : 'Reactivar'}
                variante="secundario"
                onPress={() => abrir(u.uuid, u.estadoCuenta === 'ACTIVA' ? 'SUSPENDER' : 'REACTIVAR')}
                deshabilitado={enviando}
              />
              <Button etiqueta="Dar de baja" variante="terciario" onPress={() => abrir(u.uuid, 'ELIMINAR')} deshabilitado={enviando} />
            </>
          )}
        </View>
      );
    }
    const { accion } = confirmando;
    return (
      <View style={estilos.acciones}>
        {accion === 'ELIMINAR' ? (
          <Text style={estilos.dato}>¿Dar de baja a {u.nombreApellido}? No va a poder volver a ingresar.</Text>
        ) : (
          <Input
            etiqueta={accion === 'SUSPENDER' ? 'Motivo (le llega por correo)' : 'Motivo (opcional)'}
            value={motivo}
            onChangeText={setMotivo}
            maxLength={MAXIMO_MOTIVO}
            multiline
          />
        )}
        <Button
          etiqueta={
            accion === 'ELIMINAR' ? 'Confirmar baja' : accion === 'SUSPENDER' ? 'Confirmar suspensión' : 'Confirmar reactivación'
          }
          variante="secundario"
          onPress={() => confirmar(u, accion)}
          deshabilitado={enviando}
        />
        <Button etiqueta="Cancelar" variante="terciario" onPress={() => setConfirmando(null)} deshabilitado={enviando} />
      </View>
    );
  }

  return (
    <View style={estilos.pantalla}>
      <Text style={estilos.titulo}>Usuarios</Text>
      <View style={estilos.cabecera}>
        <Input
          etiqueta="Buscar por nombre, email o ID"
          value={busqueda}
          onChangeText={setBusqueda}
          onSubmitEditing={buscar}
          onBlur={buscar}
          returnKeyType="search"
          autoCapitalize="none"
          maxLength={MAXIMO_TEXTO}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.chips}>
          {ROLES.map((r) => (
            <Chip key={r.etiqueta} etiqueta={r.etiqueta} seleccionado={rol === r.valor} onPress={() => setRol(r.valor)} />
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.chips}>
          {ESTADOS.map((e) => (
            <Chip key={e.etiqueta} etiqueta={e.etiqueta} seleccionado={estado === e.valor} onPress={() => setEstado(e.valor)} />
          ))}
        </ScrollView>
        <Button etiqueta="Añadir gestor" onPress={() => navigation.navigate('FormularioUsuario', {})} />
        {aviso !== undefined && <Text style={estilos.mensaje}>{aviso}</Text>}
        {errorDeAccion !== undefined && <Text style={estilos.mensaje}>{errorDeAccion}</Text>}
      </View>
      {cargando && !refrescando ? (
        <ActivityIndicator color={colores.lila} size="large" style={estilos.cargando} />
      ) : error && items.length === 0 ? (
        <View style={estilos.error}>
          <Text style={estilos.textoError}>No pudimos cargar los usuarios.</Text>
          <Button etiqueta="Reintentar" onPress={reintentar} />
        </View>
      ) : (
        <FlatList
          testID="lista-usuarios"
          data={items}
          keyExtractor={(u) => u.uuid}
          renderItem={({ item: u }) => (
            <Card>
              <View style={estilos.cuerpo}>
                <Text style={estilos.nombre}>{u.nombreApellido}</Text>
                <Text style={estilos.dato}>{u.email}</Text>
                <Text style={estilos.dato}>
                  {NOMBRE_DE_ROL[u.rol]}
                  {u.tipoServicio !== null ? ` · ${u.tipoServicio}` : ''}
                  {u.estadoValidacion !== null ? ` · ${NOMBRE_DE_VALIDACION[u.estadoValidacion]}` : ''}
                </Text>
                {u.telefono !== null && <Text style={estilos.dato}>{u.telefono}</Text>}
                {u.estadoCuenta === 'SUSPENDIDA' && <Text style={estilos.suspendida}>Cuenta suspendida</Text>}
                {acciones(u)}
              </View>
            </Card>
          )}
          contentContainerStyle={estilos.lista}
          onEndReached={cargarMas}
          onEndReachedThreshold={0.5}
          refreshing={refrescando}
          onRefresh={refrescar}
          ListHeaderComponent={
            errorAlActualizar ? <Text style={estilos.textoError}>No pudimos actualizar la lista.</Text> : null
          }
          ListEmptyComponent={<EstadoVacio mensaje="No hay usuarios con esos filtros." />}
          ListFooterComponent={
            errorMas ? (
              <View style={estilos.error}>
                <Text style={estilos.textoError}>No pudimos cargar más.</Text>
                <Button etiqueta="Reintentar" variante="terciario" onPress={cargarMas} />
              </View>
            ) : cargandoMas ? (
              <ActivityIndicator color={colores.lila} />
            ) : null
          }
        />
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  titulo: { ...tipografia.titulo, color: colores.lila, marginHorizontal: espaciado.l, marginTop: espaciado.l },
  cabecera: { paddingHorizontal: espaciado.l, paddingTop: espaciado.m, gap: espaciado.s },
  chips: { gap: espaciado.s },
  mensaje: { ...tipografia.cuerpo, color: colores.tinta },
  lista: { padding: espaciado.l, gap: espaciado.m },
  cargando: { marginTop: espaciado.xl },
  error: { padding: espaciado.l, gap: espaciado.m },
  textoError: { ...tipografia.cuerpo, color: colores.tinta, textAlign: 'center' },
  cuerpo: { flex: 1 },
  nombre: { ...tipografia.seccion, color: colores.tinta },
  dato: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
  suspendida: { ...tipografia.cuerpo, fontWeight: '700', color: colores.tinta },
  acciones: { marginTop: espaciado.m, gap: espaciado.s },
});
