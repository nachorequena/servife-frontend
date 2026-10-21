import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../../api/errores';
import { listarValidacionesPendientes, validarPrestador, type PrestadorPendiente } from '../../api/gestion';
import { Button, Card, EstadoVacio, Input } from '../../components';
import { useListaPaginada } from '../../hooks/useListaPaginada';
import { colores, espaciado, tipografia } from '../../theme';
import { formatearFecha } from '../../utils/formato';
import { mensajeDe } from '../../utils/errores';

/** Límite del motivo en E6 (DecisionDeValidacionRequest). */
const MAXIMO_MOTIVO = 255;

type Decision = 'APROBAR' | 'RECHAZAR';

/**
 * Validaciones pendientes · CU14 · E5 y E6. Sin maqueta propia: lista paginada con acentos lilas del
 * gestor. Aprobar y rechazar piden confirmación; el rechazo admite un motivo que le llega al prestador.
 */
export function ValidacionesScreen() {
  const { items, cargando, cargandoMas, refrescando, error, errorMas, errorAlActualizar, cargarMas, refrescar, reintentar, quitar } =
    useListaPaginada(listarValidacionesPendientes);
  const [confirmando, setConfirmando] = useState<{ uuid: string; decision: Decision } | null>(null);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string>();
  const [errorDeDecision, setErrorDeDecision] = useState<string>();

  function abrir(uuid: string, decision: Decision) {
    setMotivo('');
    setAviso(undefined);
    setErrorDeDecision(undefined);
    setConfirmando({ uuid, decision });
  }

  async function resolver(uuid: string, decision: Decision) {
    setAviso(undefined);
    setErrorDeDecision(undefined);
    setEnviando(true);
    try {
      const texto = motivo.trim();
      await validarPrestador(uuid, decision === 'RECHAZAR' && texto !== '' ? { decision, motivo: texto } : { decision });
      setConfirmando(null);
      setAviso(decision === 'APROBAR' ? 'Prestador aprobado.' : 'Prestador rechazado.');
      // Se saca de la lista ya y se vuelve a pedir la primera página, así entra el siguiente pendiente.
      quitar(uuid);
      refrescar();
    } catch (e) {
      setErrorDeDecision(mensajeDe(e));
      if (e instanceof ApiError && e.codigo === 'VALIDACION_YA_RESUELTA') {
        setConfirmando(null);
        refrescar();
      }
    } finally {
      setEnviando(false);
    }
  }

  function acciones(p: PrestadorPendiente) {
    if (confirmando?.uuid !== p.uuid) {
      return (
        <View style={estilos.acciones}>
          <Button etiqueta="Aprobar" onPress={() => abrir(p.uuid, 'APROBAR')} deshabilitado={enviando} />
          <Button etiqueta="Rechazar" variante="secundario" onPress={() => abrir(p.uuid, 'RECHAZAR')} deshabilitado={enviando} />
        </View>
      );
    }
    const aprobar = confirmando.decision === 'APROBAR';
    return (
      <View style={estilos.acciones}>
        {aprobar ? (
          <Text style={estilos.dato}>¿Aprobar a {p.nombreApellido}? Va a aparecer en las búsquedas.</Text>
        ) : (
          <Input
            etiqueta="Motivo (opcional)"
            value={motivo}
            onChangeText={setMotivo}
            maxLength={MAXIMO_MOTIVO}
            multiline
          />
        )}
        <Button
          etiqueta={aprobar ? 'Confirmar aprobación' : 'Confirmar rechazo'}
          variante={aprobar ? 'primario' : 'secundario'}
          onPress={() => resolver(p.uuid, confirmando.decision)}
          deshabilitado={enviando}
        />
        <Button etiqueta="Cancelar" variante="terciario" onPress={() => setConfirmando(null)} deshabilitado={enviando} />
      </View>
    );
  }

  return (
    <View style={estilos.pantalla}>
      <Text style={estilos.titulo}>Validaciones</Text>
      {aviso !== undefined && <Text style={estilos.mensaje}>{aviso}</Text>}
      {errorDeDecision !== undefined && <Text style={estilos.mensaje}>{errorDeDecision}</Text>}
      {cargando && !refrescando ? (
        <ActivityIndicator color={colores.lila} size="large" style={estilos.cargando} />
      ) : error && items.length === 0 ? (
        <View style={estilos.error}>
          <Text style={estilos.textoError}>No pudimos cargar las validaciones.</Text>
          <Button etiqueta="Reintentar" onPress={reintentar} />
        </View>
      ) : (
        <FlatList
          testID="lista-validaciones"
          data={items}
          keyExtractor={(p) => p.uuid}
          renderItem={({ item: p }) => (
            <Card>
              <View style={estilos.cuerpo}>
                <Text style={estilos.nombre}>{p.nombreApellido}</Text>
                <Text style={estilos.dato}>{p.email}</Text>
                <Text style={estilos.dato}>{p.tipoServicio.nombre}</Text>
                <Text style={estilos.dato}>Postulado el {formatearFecha(p.postuladoEn)}</Text>
                {acciones(p)}
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
          ListEmptyComponent={<EstadoVacio mensaje="No hay prestadores pendientes." />}
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
  titulo: { ...tipografia.titulo, color: colores.lila, margin: espaciado.l, marginBottom: espaciado.m },
  mensaje: { ...tipografia.cuerpo, color: colores.tinta, marginHorizontal: espaciado.l, marginBottom: espaciado.m },
  lista: { paddingHorizontal: espaciado.l, paddingBottom: espaciado.l, gap: espaciado.m },
  cargando: { marginTop: espaciado.xl },
  error: { padding: espaciado.l, gap: espaciado.m },
  textoError: { ...tipografia.cuerpo, color: colores.tinta, textAlign: 'center' },
  cuerpo: { flex: 1 },
  nombre: { ...tipografia.seccion, color: colores.tinta },
  dato: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
  acciones: { marginTop: espaciado.m, gap: espaciado.s },
});
