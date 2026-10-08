import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../../api/errores';
import { listarValidacionesPendientes, validarPrestador, type PrestadorPendiente } from '../../api/gestion';
import { Button, Card, EstadoVacio, Input } from '../../components';
import { colores, espaciado, tipografia } from '../../theme';
import { formatearFecha } from '../../utils/formato';
import { mensajeDe } from '../../utils/errores';

/** Validaciones pendientes · CU14 · E5 y E6. Sin maqueta propia: lista simple con acentos lilas del gestor. */
export function ValidacionesScreen() {
  const [pendientes, setPendientes] = useState<PrestadorPendiente[] | null>(null);
  const [error, setError] = useState<string>();
  const [aviso, setAviso] = useState<string>();
  const [rechazando, setRechazando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [refrescando, setRefrescando] = useState(false);

  const recargar = useCallback(async () => {
    try {
      setPendientes((await listarValidacionesPendientes()).contenido);
    } catch (e) {
      setError(mensajeDe(e));
      setPendientes((actual) => actual ?? []);
    }
  }, []);

  // Al enfocar la pantalla se vuelve a pedir la lista (el estado anterior puede haber quedado viejo).
  useFocusEffect(
    useCallback(() => {
      setError(undefined);
      void recargar();
    }, [recargar]),
  );

  async function refrescar() {
    setRefrescando(true);
    setError(undefined);
    await recargar();
    setRefrescando(false);
  }

  async function resolver(uuid: string, decision: 'APROBAR' | 'RECHAZAR') {
    setAviso(undefined);
    setError(undefined);
    setEnviando(true);
    try {
      const texto = motivo.trim();
      await validarPrestador(uuid, decision === 'RECHAZAR' && texto !== '' ? { decision, motivo: texto } : { decision });
      setPendientes((lista) => (lista ?? []).filter((p) => p.uuid !== uuid));
      setRechazando(null);
      setMotivo('');
      setAviso(decision === 'APROBAR' ? 'Prestador aprobado.' : 'Prestador rechazado.');
    } catch (e) {
      setError(mensajeDe(e));
      if (e instanceof ApiError && e.codigo === 'VALIDACION_YA_RESUELTA') {
        setRechazando(null);
        await recargar();
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={estilos.contenedor}
      testID="lista-validaciones"
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} />}
    >
      <Text style={estilos.titulo}>Validaciones</Text>
      {aviso !== undefined && <Text style={estilos.mensaje}>{aviso}</Text>}
      {error !== undefined && <Text style={estilos.mensaje}>{error}</Text>}
      {pendientes !== null && pendientes.length === 0 && <EstadoVacio mensaje="No hay prestadores pendientes." />}
      {(pendientes ?? []).map((p) => (
        <Card key={p.uuid}>
          <View style={estilos.cuerpo}>
            <Text style={estilos.nombre}>{p.nombreApellido}</Text>
            <Text style={estilos.dato}>{p.email}</Text>
            <Text style={estilos.dato}>{p.tipoServicio.nombre}</Text>
            <Text style={estilos.dato}>{formatearFecha(p.creadoEn)}</Text>
            {rechazando === p.uuid ? (
              <View style={estilos.acciones}>
                <Input etiqueta="Motivo (opcional)" value={motivo} onChangeText={setMotivo} multiline />
                <Button etiqueta="Confirmar rechazo" variante="secundario" onPress={() => resolver(p.uuid, 'RECHAZAR')} deshabilitado={enviando} />
                <Button etiqueta="Cancelar" variante="terciario" onPress={() => setRechazando(null)} />
              </View>
            ) : (
              <View style={estilos.acciones}>
                <Button etiqueta="Aprobar" onPress={() => resolver(p.uuid, 'APROBAR')} deshabilitado={enviando} />
                <Button
                  etiqueta="Rechazar"
                  variante="secundario"
                  onPress={() => {
                    setMotivo('');
                    setRechazando(p.uuid);
                  }}
                  deshabilitado={enviando}
                />
              </View>
            )}
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { padding: espaciado.l },
  titulo: { ...tipografia.titulo, color: colores.lila, marginBottom: espaciado.m },
  mensaje: { ...tipografia.cuerpo, color: colores.tinta, marginBottom: espaciado.m },
  cuerpo: { flex: 1 },
  nombre: { ...tipografia.seccion, color: colores.tinta },
  dato: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
  acciones: { marginTop: espaciado.m, gap: espaciado.s },
});
