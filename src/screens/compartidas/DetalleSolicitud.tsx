import { useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  cambiarEstadoDeSolicitud,
  obtenerSolicitud,
  type AccionSobreSolicitud,
  type CambioDeEstado,
  type Solicitud,
} from '../../api/solicitudes';
import { Button, EtiquetaDeEstado, Input } from '../../components';
import { ImagenProtegida } from '../../components/ImagenProtegida';
import { useSesion } from '../../store/sesion';
import { colores, espaciado, radios, tamanios, tipografia } from '../../theme';
import { mensajeDe } from '../../utils/errores';
import { formatearCentavos, formatearFechaSola } from '../../utils/formato';

const AVISO_MS = 3000;
const CODIGOS_QUE_RECARGAN = ['TRANSICION_INVALIDA', 'TODAVIA_NO_ES_LA_FECHA'];

const ETIQUETA_DE_ACCION: Record<AccionSobreSolicitud, string> = {
  CANCELAR: 'Cancelar solicitud',
  RECHAZAR: 'Rechazar',
  ACEPTAR: 'Aceptar',
  INICIAR: 'Iniciar trabajo',
  FINALIZAR: 'Finalizar trabajo',
};

const ETIQUETA_DE_CONFIRMACION: Record<AccionSobreSolicitud, string> = {
  CANCELAR: 'Confirmar cancelación',
  RECHAZAR: 'Confirmar rechazo',
  ACEPTAR: 'Confirmar',
  INICIAR: 'Confirmar',
  FINALIZAR: 'Confirmar',
};

const PREGUNTA_DE_CONFIRMACION: Partial<Record<AccionSobreSolicitud, string>> = {
  INICIAR: '¿Querés iniciar el trabajo?',
  FINALIZAR: '¿Querés dar el trabajo por finalizado?',
};

/** "1500,5" → 150050 centavos. Solo dígitos con coma y hasta 2 decimales; null si no es válido. */
function pesosACentavos(texto: string): number | null {
  const m = /^(\d+)(?:,(\d{1,2}))?$/.exec(texto);
  if (!m) return null;
  const centavos = Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'));
  return Number.isSafeInteger(centavos) && centavos > 0 ? centavos : null;
}

/** Detalle de una solicitud para cliente o prestador, con las acciones que el backend habilita (D10, provisorio). */
export function DetalleSolicitud({ uuidSolicitud }: { uuidSolicitud: string }) {
  const { sesion } = useSesion();
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [errorDeCarga, setErrorDeCarga] = useState<string | undefined>();
  const [reintento, setReintento] = useState(0);
  const [accion, setAccion] = useState<AccionSobreSolicitud | null>(null);
  const [motivo, setMotivo] = useState('');
  const [precio, setPrecio] = useState('');
  const [errorPrecio, setErrorPrecio] = useState<string | undefined>();
  const [enviando, setEnviando] = useState(false);
  const [errorDeAccion, setErrorDeAccion] = useState<string | undefined>();
  const [listo, setListo] = useState(false);
  const pedido = useRef(0);
  const montado = useRef(true);
  const temporizador = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(
    () => () => {
      montado.current = false;
      clearTimeout(temporizador.current);
    },
    [],
  );

  const cargar = useCallback(() => {
    const id = ++pedido.current;
    return obtenerSolicitud(uuidSolicitud).then(
      (resultado) => {
        if (!montado.current || id !== pedido.current) return;
        setSolicitud(resultado);
        setErrorDeCarga(undefined);
      },
      (e: unknown) => {
        if (!montado.current || id !== pedido.current) return;
        setErrorDeCarga(mensajeDe(e));
      },
    );
  }, [uuidSolicitud]);

  useEffect(() => {
    setSolicitud(null);
    setErrorDeCarga(undefined);
    void cargar();
  }, [cargar, reintento]);

  const abrir = (a: AccionSobreSolicitud) => {
    setAccion(a);
    setMotivo('');
    setPrecio('');
    setErrorPrecio(undefined);
    setErrorDeAccion(undefined);
    setListo(false);
  };

  const confirmar = async () => {
    if (!accion || enviando) return;
    const cuerpo: CambioDeEstado = { accion };
    if (accion === 'CANCELAR' || accion === 'RECHAZAR') {
      if (motivo.trim() !== '') cuerpo.motivo = motivo.trim();
    }
    if (accion === 'ACEPTAR' && precio.trim() !== '') {
      const centavos = pesosACentavos(precio.trim());
      if (centavos === null) {
        setErrorPrecio('Ingresá un monto válido');
        return;
      }
      cuerpo.precioAcordado = centavos;
    }
    setErrorPrecio(undefined);
    setErrorDeAccion(undefined);
    setEnviando(true);
    try {
      const actualizada = await cambiarEstadoDeSolicitud(uuidSolicitud, cuerpo);
      if (!montado.current) return;
      pedido.current++; // una recarga en vuelo ya es vieja
      setSolicitud(actualizada);
      setAccion(null);
      setListo(true);
      clearTimeout(temporizador.current);
      temporizador.current = setTimeout(() => setListo(false), AVISO_MS);
    } catch (e) {
      if (!montado.current) return;
      setErrorDeAccion(mensajeDe(e));
      if (e instanceof Object && 'codigo' in e && CODIGOS_QUE_RECARGAN.includes(String(e.codigo))) {
        setAccion(null);
        void cargar();
      }
    } finally {
      if (montado.current) setEnviando(false);
    }
  };

  if (errorDeCarga !== undefined && solicitud === null) {
    return (
      <View style={estilos.centrado}>
        <Text style={estilos.textoError}>{errorDeCarga}</Text>
        <Button etiqueta="Reintentar" onPress={() => setReintento((n) => n + 1)} />
      </View>
    );
  }
  if (solicitud === null) {
    return <ActivityIndicator color={colores.verde} size="large" style={estilos.cargando} />;
  }

  const esCliente = sesion?.rol === 'CLIENTE';
  const contraparte = esCliente ? solicitud.prestador : solicitud.cliente;

  return (
    <ScrollView style={estilos.pantalla} contentContainerStyle={estilos.contenido}>
      <Text style={estilos.provisoria}>Pantalla provisoria: sin diseño en la maqueta (D10).</Text>
      {listo && <Text style={estilos.aviso}>Listo.</Text>}
      <EtiquetaDeEstado estado={solicitud.estado} />
      {solicitud.canceladaPor !== null && (
        <Text style={estilos.valor}>
          {solicitud.canceladaPor === 'CLIENTE' ? 'Cancelada por el cliente' : 'Cancelada por el prestador'}
        </Text>
      )}

      <Seccion titulo={esCliente ? 'Prestador' : 'Cliente'}>
        <Text style={estilos.valor}>{contraparte.nombreApellido}</Text>
        {contraparte.telefono !== null && <Text style={estilos.valor}>{`Teléfono: ${contraparte.telefono}`}</Text>}
      </Seccion>
      <Seccion titulo="Servicio">
        <Text style={estilos.valor}>{solicitud.tipoServicio.nombre}</Text>
      </Seccion>
      <Seccion titulo="Fecha">
        <Text style={estilos.valor}>{formatearFechaSola(solicitud.fechaDeseada)}</Text>
      </Seccion>
      {solicitud.horaPreferida !== null && (
        <Seccion titulo="Hora">
          <Text style={estilos.valor}>{solicitud.horaPreferida}</Text>
        </Seccion>
      )}
      <Seccion titulo="Dirección">
        <Text style={estilos.valor}>{solicitud.direccion}</Text>
      </Seccion>
      <Seccion titulo="Descripción">
        <Text style={estilos.valor}>{solicitud.descripcion}</Text>
      </Seccion>
      {solicitud.imagenIds.length > 0 && (
        <Seccion titulo="Imágenes">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.imagenes}>
            {solicitud.imagenIds.map((uuid) => (
              <ImagenProtegida key={uuid} uuid={uuid} estilo={estilos.miniatura} accessibilityLabel="Imagen adjunta" />
            ))}
          </ScrollView>
        </Seccion>
      )}
      {solicitud.precioAcordado !== null && (
        <Seccion titulo="Precio acordado">
          <Text style={estilos.valor}>{formatearCentavos(solicitud.precioAcordado)}</Text>
        </Seccion>
      )}
      {solicitud.motivo !== null && solicitud.motivo !== '' && (
        <Seccion titulo="Motivo">
          <Text style={estilos.valor}>{solicitud.motivo}</Text>
        </Seccion>
      )}

      {errorDeAccion !== undefined && <Text style={estilos.textoError}>{errorDeAccion}</Text>}

      {accion === null ? (
        <View style={estilos.acciones}>
          {solicitud.accionesDisponibles.map((a) => (
            <Button
              key={a}
              etiqueta={ETIQUETA_DE_ACCION[a]}
              variante={a === 'CANCELAR' || a === 'RECHAZAR' ? 'secundario' : 'primario'}
              onPress={() => abrir(a)}
            />
          ))}
        </View>
      ) : (
        <View style={estilos.acciones}>
          {PREGUNTA_DE_CONFIRMACION[accion] !== undefined && (
            <Text style={estilos.valor}>{PREGUNTA_DE_CONFIRMACION[accion]}</Text>
          )}
          {(accion === 'CANCELAR' || accion === 'RECHAZAR') && (
            <Input etiqueta="Motivo (opcional)" value={motivo} onChangeText={setMotivo} multiline />
          )}
          {accion === 'ACEPTAR' && (
            <Input
              etiqueta="Precio acordado (opcional)"
              value={precio}
              onChangeText={setPrecio}
              keyboardType="decimal-pad"
              error={errorPrecio}
            />
          )}
          <Button etiqueta={ETIQUETA_DE_CONFIRMACION[accion]} onPress={() => void confirmar()} deshabilitado={enviando} />
          <Button etiqueta="Volver" variante="terciario" onPress={() => setAccion(null)} deshabilitado={enviando} />
        </View>
      )}
    </ScrollView>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={estilos.seccion}>
      <Text style={estilos.titulo}>{titulo}</Text>
      {children}
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espaciado.m, gap: espaciado.m },
  provisoria: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
  aviso: { ...tipografia.cuerpo, color: colores.tinta, backgroundColor: colores.verdeClaro, padding: espaciado.m },
  seccion: { gap: espaciado.xs },
  titulo: { ...tipografia.seccion, color: colores.tinta },
  valor: { ...tipografia.cuerpo, color: colores.tinta },
  imagenes: { gap: espaciado.s },
  miniatura: { width: tamanios.miniatura, height: tamanios.miniatura, borderRadius: radios.input },
  acciones: { gap: espaciado.s },
  centrado: { flex: 1, padding: espaciado.l, gap: espaciado.m, justifyContent: 'center', backgroundColor: colores.fondo },
  textoError: { ...tipografia.cuerpo, color: colores.tinta },
  cargando: { marginTop: espaciado.xl },
});

/** Pantalla de ruta: lee `uuidSolicitud` de los parámetros. La usan las pilas de cliente y prestador. */
export function DetalleSolicitudDeRuta() {
  const { uuidSolicitud } = useRoute().params as { uuidSolicitud: string };
  return <DetalleSolicitud uuidSolicitud={uuidSolicitud} />;
}
