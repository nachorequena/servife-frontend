import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { listarAvisos, marcarAvisoLeido, type Aviso } from '../../api/notificaciones';
import { Button, EstadoVacio } from '../../components';
import { colores, espaciado, radios, tamanios, tipografia } from '../../theme';
import { formatearFechaHora } from '../../utils/formato';

const TAMANIO_PAGINA = 20;

/** Avisos dentro de la app (E11), compartida por los tres roles. */
export function AvisosScreen() {
  const [items, setItems] = useState<Aviso[]>([]);
  const [pagina, setPagina] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState(false);
  const [errorMas, setErrorMas] = useState(false);
  const [reintento, setReintento] = useState(0);
  const solicitud = useRef(0);
  const cargandoMasRef = useRef(false);
  const esRefresco = useRef(false);

  useEffect(() => {
    const id = ++solicitud.current;
    const refresco = esRefresco.current;
    esRefresco.current = false;
    cargandoMasRef.current = false;
    setCargandoMas(false);
    setErrorMas(false);
    setError(false);
    setRefrescando(refresco);
    setCargando(!refresco);
    listarAvisos({ page: 0, size: TAMANIO_PAGINA })
      .then((resultado) => {
        if (id !== solicitud.current) return;
        setItems(resultado.contenido);
        setPagina(resultado.pagina);
        setTotalPaginas(resultado.totalPaginas);
      })
      .catch(() => {
        if (id !== solicitud.current) return;
        setItems([]);
        setError(true);
      })
      .finally(() => {
        if (id !== solicitud.current) return;
        setCargando(false);
        setRefrescando(false);
      });
  }, [reintento]);

  const cargarMas = () => {
    if (cargandoMasRef.current || cargando || refrescando || error || pagina + 1 >= totalPaginas) return;
    const id = solicitud.current;
    cargandoMasRef.current = true;
    setCargandoMas(true);
    setErrorMas(false);
    listarAvisos({ page: pagina + 1, size: TAMANIO_PAGINA })
      .then((resultado) => {
        if (id !== solicitud.current) return;
        setItems((actuales) => {
          const existentes = new Set(actuales.map((a) => a.uuid));
          return [...actuales, ...resultado.contenido.filter((a) => !existentes.has(a.uuid))];
        });
        setPagina(resultado.pagina);
        setTotalPaginas(resultado.totalPaginas);
      })
      .catch(() => {
        if (id === solicitud.current) setErrorMas(true);
      })
      .finally(() => {
        if (id !== solicitud.current) return;
        cargandoMasRef.current = false;
        setCargandoMas(false);
      });
  };

  const refrescar = () => {
    esRefresco.current = true;
    setReintento((n) => n + 1);
  };

  const fijarLeida = useCallback((uuid: string, leida: boolean) => {
    setItems((actuales) => actuales.map((a) => (a.uuid === uuid ? { ...a, leida } : a)));
  }, []);

  const abrir = (aviso: Aviso) => {
    // Cuando el aviso trae `uuidSolicitud`, el Sprint 3 agrega acá la navegación al detalle.
    if (aviso.leida) return;
    fijarLeida(aviso.uuid, true);
    marcarAvisoLeido(aviso.uuid).catch(() => fijarLeida(aviso.uuid, false));
  };

  return (
    <View style={estilos.pantalla}>
      {cargando && !refrescando ? (
        <ActivityIndicator color={colores.verde} size="large" style={estilos.cargando} />
      ) : error && items.length === 0 ? (
        <View style={estilos.error}>
          <Text style={estilos.textoError}>No pudimos cargar los avisos.</Text>
          <Button etiqueta="Reintentar" onPress={() => setReintento((n) => n + 1)} />
        </View>
      ) : (
        <FlatList
          testID="lista-avisos"
          data={items}
          keyExtractor={(aviso) => aviso.uuid}
          renderItem={({ item }) => <FilaAviso aviso={item} onPress={() => abrir(item)} />}
          contentContainerStyle={estilos.lista}
          onEndReached={cargarMas}
          onEndReachedThreshold={0.5}
          refreshing={refrescando}
          onRefresh={refrescar}
          ListEmptyComponent={<EstadoVacio mensaje="No tenés avisos." />}
          ListFooterComponent={
            errorMas ? (
              <View style={estilos.error}>
                <Text style={estilos.textoError}>No pudimos cargar más.</Text>
                <Button etiqueta="Reintentar" variante="terciario" onPress={cargarMas} />
              </View>
            ) : cargandoMas ? (
              <ActivityIndicator color={colores.verde} />
            ) : null
          }
        />
      )}
    </View>
  );
}

function FilaAviso({ aviso, onPress }: { aviso: Aviso; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={aviso.leida ? aviso.titulo : `${aviso.titulo}, sin leer`} onPress={onPress} style={[estilos.fila, !aviso.leida && estilos.filaNoLeida]}>
      {!aviso.leida ? <View testID="punto-no-leido" style={estilos.punto} /> : <View style={estilos.puntoVacio} />}
      <View style={estilos.texto}>
        <Text style={estilos.titulo}>{aviso.titulo}</Text>
        <Text style={estilos.cuerpo}>{aviso.cuerpo}</Text>
        <Text style={estilos.fecha}>{formatearFechaHora(aviso.creadoEn)}</Text>
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  lista: { padding: espaciado.m, gap: espaciado.s },
  cargando: { marginTop: espaciado.xl },
  error: { padding: espaciado.l, gap: espaciado.m },
  textoError: { ...tipografia.cuerpo, color: colores.tinta, textAlign: 'center' },
  fila: {
    flexDirection: 'row',
    gap: espaciado.s,
    padding: espaciado.m,
    borderRadius: radios.tarjeta,
    backgroundColor: colores.blanco,
  },
  filaNoLeida: { backgroundColor: colores.verdeClaro },
  punto: {
    width: tamanios.punto,
    height: tamanios.punto,
    borderRadius: radios.pill,
    backgroundColor: colores.verde,
    marginTop: espaciado.xs,
  },
  puntoVacio: { width: tamanios.punto },
  texto: { flex: 1, gap: espaciado.xs },
  titulo: { ...tipografia.cuerpo, fontWeight: '700', color: colores.tinta },
  cuerpo: { ...tipografia.cuerpo, color: colores.tinta },
  fecha: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
});
