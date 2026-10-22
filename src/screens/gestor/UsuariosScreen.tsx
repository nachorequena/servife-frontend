import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  cambiarEstadoDeUsuario,
  eliminarUsuario,
  listarUsuarios,
  type EstadoDeCuenta,
  type RolDeUsuario,
  type UsuarioAdmin,
} from '../../api/gestion';
import type { ParametrosDePagina } from '../../api/paginacion';
import {
  Avatar,
  BotonFlotante,
  Button,
  Card,
  Chip,
  Dialogo,
  EstadoVacio,
  Etiqueta,
  HojaInferior,
  Input,
  useAvisoFlotante,
  type TonoDeEtiqueta,
} from '../../components';
import { useListaPaginada } from '../../hooks/useListaPaginada';
import type { NombreDeIcono } from '../../navigation/iconos';
import type { GestorStackParams } from '../../navigation/tipos';
import { useSesion } from '../../store/sesion';
import { bordes, colores, espaciado, radios, tamanios, tipografia } from '../../theme';
import { mensajeDe } from '../../utils/errores';
import { TarjetasCargando } from './TarjetasCargando';

/** Límites del backend: texto de E3 y motivo de E4. */
const MAXIMO_TEXTO = 120;
const MAXIMO_MOTIVO = 255;
/** Espera entre la última tecla y la búsqueda. */
const ESPERA_DE_BUSQUEDA_MS = 400;

const ROLES: { etiqueta: string; valor: RolDeUsuario }[] = [
  { etiqueta: 'Clientes', valor: 'CLIENTE' },
  { etiqueta: 'Prestadores', valor: 'PRESTADOR' },
  { etiqueta: 'Gestores', valor: 'GESTOR' },
];
const ESTADOS: { etiqueta: string; valor: EstadoDeCuenta }[] = [
  { etiqueta: 'Activas', valor: 'ACTIVA' },
  { etiqueta: 'Suspendidas', valor: 'SUSPENDIDA' },
];

const NOMBRE_DE_ROL: Record<RolDeUsuario, string> = { CLIENTE: 'Cliente', PRESTADOR: 'Prestador', GESTOR: 'Gestor' };
const VALIDACION: Record<'PENDIENTE' | 'APROBADO' | 'RECHAZADO', { texto: string; tono: TonoDeEtiqueta }> = {
  PENDIENTE: { texto: 'Pendiente de validación', tono: 'advertencia' },
  APROBADO: { texto: 'Aprobado', tono: 'exito' },
  RECHAZADO: { texto: 'Rechazado', tono: 'error' },
};

type Accion = 'SUSPENDER' | 'REACTIVAR' | 'ELIMINAR';

const claveDe = (u: UsuarioAdmin) => u.uuid;

/**
 * Usuarios · CU12 y sus extensiones CU15 a CU17 (D06) · E3, E4, E13, E14, E15. Sin maqueta (D10). Búsqueda que
 * se aplica sola mientras se escribe, filtros de rol y estado en una hoja inferior ("Filtros (n)", con los
 * activos como chips), tarjetas blancas con etiquetas y un menú "⋯" con Editar, Suspender o Reactivar y Dar de
 * baja. Suspender pide el motivo en una hoja (le llega por correo); dar de baja y reactivar piden confirmar en
 * un diálogo. Los resultados se avisan con un aviso flotante. Sobre la propia cuenta solo se puede editar.
 */
export function UsuariosScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<GestorStackParams>>();
  const { sesion } = useSesion();
  const { mostrar } = useAvisoFlotante();
  const [rol, setRol] = useState<RolDeUsuario>();
  const [estado, setEstado] = useState<EstadoDeCuenta>();
  const [busqueda, setBusqueda] = useState('');
  const [texto, setTexto] = useState<string>();
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [borrador, setBorrador] = useState<{ rol?: RolDeUsuario; estado?: EstadoDeCuenta }>({});
  const [menu, setMenu] = useState<UsuarioAdmin | null>(null);
  const [confirmando, setConfirmando] = useState<{ usuario: UsuarioAdmin; accion: Accion } | null>(null);
  const [motivo, setMotivo] = useState('');
  const [errorDeMotivo, setErrorDeMotivo] = useState<string>();
  const [enviando, setEnviando] = useState(false);

  // La búsqueda se aplica sola un rato después de la última tecla.
  useEffect(() => {
    const limpio = busqueda.trim();
    const temporizador = setTimeout(() => setTexto(limpio === '' ? undefined : limpio), ESPERA_DE_BUSQUEDA_MS);
    return () => clearTimeout(temporizador);
  }, [busqueda]);

  const cargarPagina = useCallback(
    (pagina: ParametrosDePagina) => listarUsuarios({ rol, estado, texto, ...pagina }),
    [rol, estado, texto],
  );
  const { items, cargando, cargandoMas, refrescando, error, errorMas, errorAlActualizar, cargarMas, refrescar, reintentar, quitar } =
    useListaPaginada(cargarPagina, claveDe);

  const cantidadDeFiltros = (rol ? 1 : 0) + (estado ? 1 : 0);
  const hayFiltros = cantidadDeFiltros > 0 || texto !== undefined;

  function abrirFiltros() {
    setBorrador({ rol, estado });
    setFiltrosAbiertos(true);
  }

  function aplicarFiltros() {
    setRol(borrador.rol);
    setEstado(borrador.estado);
    setFiltrosAbiertos(false);
  }

  function limpiarFiltros() {
    setRol(undefined);
    setEstado(undefined);
    setBusqueda('');
    setTexto(undefined);
  }

  function elegir(accion: Accion | 'EDITAR', u: UsuarioAdmin) {
    setMenu(null);
    if (accion === 'EDITAR') {
      navigation.navigate('FormularioUsuario', { usuario: u });
      return;
    }
    setMotivo('');
    setErrorDeMotivo(undefined);
    setConfirmando({ usuario: u, accion });
  }

  async function confirmar() {
    if (confirmando === null) return;
    const { usuario: u, accion } = confirmando;
    const textoMotivo = motivo.trim();
    if (accion === 'SUSPENDER' && textoMotivo === '') {
      setErrorDeMotivo('Escribí el motivo: le llega al usuario por correo.');
      return;
    }
    setEnviando(true);
    try {
      if (accion === 'ELIMINAR') {
        await eliminarUsuario(u.uuid);
        quitar(u.uuid);
        mostrar(`${u.nombreApellido} fue dado de baja.`);
      } else if (accion === 'SUSPENDER') {
        await cambiarEstadoDeUsuario(u.uuid, { estado: 'SUSPENDIDA', motivo: textoMotivo });
        mostrar(`Suspendiste a ${u.nombreApellido}. Le avisamos por correo.`);
      } else {
        await cambiarEstadoDeUsuario(u.uuid, { estado: 'ACTIVA' });
        mostrar(`${u.nombreApellido} está activo de nuevo.`);
      }
      setConfirmando(null);
      refrescar();
    } catch (e) {
      setConfirmando(null);
      mostrar(mensajeDe(e), 'error');
    } finally {
      setEnviando(false);
    }
  }

  function tarjeta(u: UsuarioAdmin) {
    return (
      <Card variante="blanca">
        <Avatar nombre={u.nombreApellido} tamanio={tamanios.avatarChico} />
        <View style={estilos.datos}>
          <Text style={estilos.nombre} numberOfLines={1}>
            {u.nombreApellido}
          </Text>
          <Text style={estilos.dato} numberOfLines={1}>
            {u.email}
          </Text>
          {u.telefono !== null && <Text style={estilos.dato}>{u.telefono}</Text>}
          <View style={estilos.etiquetas}>
            <Etiqueta texto={NOMBRE_DE_ROL[u.rol]} tono={u.rol === 'GESTOR' ? 'lila' : 'neutro'} />
            {u.tipoServicio !== null && <Etiqueta texto={u.tipoServicio} />}
            {u.estadoValidacion !== null && (
              <Etiqueta texto={VALIDACION[u.estadoValidacion].texto} tono={VALIDACION[u.estadoValidacion].tono} />
            )}
            {u.estadoCuenta === 'SUSPENDIDA' && <Etiqueta texto="Suspendida" tono="error" icono="ban-outline" />}
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Acciones sobre ${u.nombreApellido}`}
          hitSlop={espaciado.s}
          onPress={() => setMenu(u)}
          style={estilos.menu}
        >
          <Ionicons name="ellipsis-vertical" size={tamanios.icono} color={colores.tinta} />
        </Pressable>
      </Card>
    );
  }

  const esYo = (u: UsuarioAdmin) => u.uuid === sesion?.usuario.uuid;
  const opciones: { accion: Accion | 'EDITAR'; etiqueta: string; icono: NombreDeIcono; peligro?: boolean }[] =
    menu === null
      ? []
      : [
          { accion: 'EDITAR', etiqueta: 'Editar datos', icono: 'create-outline' },
          ...(esYo(menu)
            ? []
            : [
                menu.estadoCuenta === 'ACTIVA'
                  ? { accion: 'SUSPENDER' as const, etiqueta: 'Suspender cuenta', icono: 'pause-circle-outline' as const }
                  : { accion: 'REACTIVAR' as const, etiqueta: 'Reactivar cuenta', icono: 'play-circle-outline' as const },
                { accion: 'ELIMINAR' as const, etiqueta: 'Dar de baja', icono: 'trash-outline' as const, peligro: true },
              ]),
        ];

  return (
    <View style={estilos.pantalla}>
      <View style={estilos.cabecera}>
        <Input
          etiqueta="Buscar por nombre, email o ID"
          icono="search-outline"
          value={busqueda}
          onChangeText={setBusqueda}
          returnKeyType="search"
          autoCapitalize="none"
          maxLength={MAXIMO_TEXTO}
        />
        <View style={estilos.filaFiltros}>
          <Button
            etiqueta={cantidadDeFiltros > 0 ? `Filtros (${cantidadDeFiltros})` : 'Filtros'}
            variante="contorno"
            tamanio="chico"
            icono="options-outline"
            ancho="contenido"
            onPress={abrirFiltros}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.activos}>
            {rol !== undefined && (
              <Chip etiqueta={`${ROLES.find((r) => r.valor === rol)?.etiqueta} ✕`} descripcion="Quitar filtro de rol" seleccionado onPress={() => setRol(undefined)} />
            )}
            {estado !== undefined && (
              <Chip
                etiqueta={`${ESTADOS.find((e) => e.valor === estado)?.etiqueta} ✕`}
                descripcion="Quitar filtro de estado"
                seleccionado
                onPress={() => setEstado(undefined)}
              />
            )}
          </ScrollView>
        </View>
      </View>

      {cargando && !refrescando ? (
        <TarjetasCargando />
      ) : error && items.length === 0 ? (
        <EstadoVacio icono="cloud-offline-outline" mensaje="No pudimos cargar los usuarios." accion={{ etiqueta: 'Reintentar', onPress: reintentar }} />
      ) : (
        <FlatList
          testID="lista-usuarios"
          data={items}
          keyExtractor={claveDe}
          renderItem={({ item }) => tarjeta(item)}
          contentContainerStyle={estilos.lista}
          onEndReached={cargarMas}
          onEndReachedThreshold={0.5}
          refreshing={refrescando}
          onRefresh={refrescar}
          ListHeaderComponent={
            errorAlActualizar ? <Text style={estilos.alerta}>No pudimos actualizar la lista. Deslizá para reintentar.</Text> : null
          }
          ListEmptyComponent={
            <EstadoVacio
              icono="people-outline"
              mensaje={hayFiltros ? 'No hay usuarios con esos filtros.' : 'Todavía no hay usuarios.'}
              accion={hayFiltros ? { etiqueta: 'Limpiar filtros', onPress: limpiarFiltros } : undefined}
            />
          }
          ListFooterComponent={
            errorMas ? (
              <EstadoVacio mensaje="No pudimos cargar más." accion={{ etiqueta: 'Reintentar', onPress: cargarMas }} />
            ) : cargandoMas ? (
              <ActivityIndicator color={colores.lila} />
            ) : null
          }
        />
      )}

      <BotonFlotante icono="person-add-outline" accessibilityLabel="Añadir gestor" onPress={() => navigation.navigate('FormularioUsuario', {})} />

      <HojaInferior visible={filtrosAbiertos} titulo="Filtros" alCerrar={() => setFiltrosAbiertos(false)}>
        <Text style={estilos.grupo}>Rol</Text>
        <View style={estilos.chips}>
          {ROLES.map((r) => (
            <Chip
              key={r.valor}
              etiqueta={r.etiqueta}
              seleccionado={borrador.rol === r.valor}
              onPress={() => setBorrador((b) => ({ ...b, rol: b.rol === r.valor ? undefined : r.valor }))}
            />
          ))}
        </View>
        <Text style={estilos.grupo}>Estado de la cuenta</Text>
        <View style={estilos.chips}>
          {ESTADOS.map((e) => (
            <Chip
              key={e.valor}
              etiqueta={e.etiqueta}
              seleccionado={borrador.estado === e.valor}
              onPress={() => setBorrador((b) => ({ ...b, estado: b.estado === e.valor ? undefined : e.valor }))}
            />
          ))}
        </View>
        <View style={estilos.filaBotones}>
          <View style={estilos.mitad}>
            <Button etiqueta="Limpiar" variante="contorno" onPress={() => setBorrador({})} />
          </View>
          <View style={estilos.mitad}>
            <Button etiqueta="Aplicar" onPress={aplicarFiltros} />
          </View>
        </View>
      </HojaInferior>

      <HojaInferior visible={menu !== null} titulo={menu?.nombreApellido} alCerrar={() => setMenu(null)}>
        {menu !== null &&
          opciones.map((o) => (
            <Pressable
              key={o.accion}
              accessibilityRole="button"
              accessibilityLabel={o.etiqueta}
              onPress={() => elegir(o.accion, menu)}
              style={({ pressed }) => [estilos.opcion, pressed && estilos.opcionPresionada]}
            >
              <Ionicons name={o.icono} size={tamanios.icono} color={o.peligro ? colores.rojo : colores.tinta} />
              <Text style={[estilos.textoOpcion, o.peligro && estilos.textoPeligro]}>{o.etiqueta}</Text>
            </Pressable>
          ))}
      </HojaInferior>

      <HojaInferior
        visible={confirmando?.accion === 'SUSPENDER'}
        titulo={`Suspender a ${confirmando?.usuario.nombreApellido ?? ''}`}
        alCerrar={() => !enviando && setConfirmando(null)}
      >
        <Text style={estilos.dato}>Mientras esté suspendida, la cuenta no va a poder ingresar. Le avisamos por correo con el motivo.</Text>
        <Input
          etiqueta="Motivo"
          value={motivo}
          onChangeText={(t) => {
            setMotivo(t);
            setErrorDeMotivo(undefined);
          }}
          maxLength={MAXIMO_MOTIVO}
          multiline
          error={errorDeMotivo}
        />
        <Button etiqueta="Suspender" variante="peligro" onPress={confirmar} deshabilitado={enviando} />
        <Button etiqueta="Cancelar" variante="texto" onPress={() => setConfirmando(null)} deshabilitado={enviando} />
      </HojaInferior>

      <Dialogo
        visible={confirmando?.accion === 'ELIMINAR'}
        titulo={`¿Dar de baja a ${confirmando?.usuario.nombreApellido ?? ''}?`}
        mensaje="No va a poder volver a ingresar y su email queda reservado."
        etiquetaConfirmar="Dar de baja"
        peligro
        enviando={enviando}
        alConfirmar={confirmar}
        alCancelar={() => setConfirmando(null)}
      />
      <Dialogo
        visible={confirmando?.accion === 'REACTIVAR'}
        titulo={`¿Reactivar a ${confirmando?.usuario.nombreApellido ?? ''}?`}
        mensaje="Va a poder volver a ingresar. Le avisamos por correo."
        etiquetaConfirmar="Reactivar"
        enviando={enviando}
        alConfirmar={confirmar}
        alCancelar={() => setConfirmando(null)}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  cabecera: { paddingHorizontal: espaciado.l, paddingTop: espaciado.m },
  filaFiltros: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s },
  activos: { gap: espaciado.s, alignItems: 'center' },
  lista: { padding: espaciado.l, paddingBottom: tamanios.botonFlotante + espaciado.xl, gap: espaciado.s, flexGrow: 1 },
  alerta: { ...tipografia.cuerpo, color: colores.rojo, marginBottom: espaciado.s },
  datos: { flex: 1, gap: espaciado.xs / 2 },
  nombre: { ...tipografia.seccion, color: colores.tinta },
  dato: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.xs, marginTop: espaciado.xs },
  menu: { alignSelf: 'flex-start', padding: espaciado.xs },
  grupo: { ...tipografia.cuerpo, fontWeight: '700', color: colores.tinta },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.s },
  filaBotones: { flexDirection: 'row', gap: espaciado.s },
  mitad: { flex: 1 },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.m,
    paddingVertical: espaciado.m,
    borderBottomWidth: bordes.fino,
    borderBottomColor: colores.bordeSuave,
  },
  opcionPresionada: { backgroundColor: colores.fondo, borderRadius: radios.input },
  textoOpcion: { ...tipografia.cuerpo, color: colores.tinta, fontWeight: '600' },
  textoPeligro: { color: colores.rojo },
});
