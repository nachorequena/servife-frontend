import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  actualizarDireccion,
  crearDireccion,
  eliminarDireccion,
  listarMisDirecciones,
  marcarDireccionPrincipal,
  principalDe,
  type DireccionGuardada,
} from '../../api/direcciones';
import { ApiError } from '../../api/errores';
import { Button, Card, Dialogo, Esqueleto, Etiqueta, HojaInferior, Input } from '../../components';
import { useSesion } from '../../store/sesion';
import { colores, espaciado, radios, tamanios, tipografia } from '../../theme';
import { mensajeDe } from '../../utils/errores';

/** Lo que está abierto en la hoja: una nueva o la edición de una existente. */
type Edicion = { tipo: 'nueva' } | { tipo: 'editar'; direccion: DireccionGuardada };

interface ErroresDeEdicion {
  alias?: string;
  direccion?: string;
  general?: string;
}

/**
 * Mis direcciones · A10 a A14. Sección del perfil del cliente: listar, agregar, editar, borrar y elegir la
 * principal, que es la que se precarga al pedir un servicio. Cada cambio actualiza la dirección de la sesión,
 * porque el backend copia la principal en usuario.direccion.
 */
export function MisDirecciones() {
  const { sesion, actualizarUsuario } = useSesion();
  const [direcciones, setDirecciones] = useState<DireccionGuardada[] | null>(null);
  const [errorDeCarga, setErrorDeCarga] = useState<string>();
  const [errorDeAccion, setErrorDeAccion] = useState<string>();
  const [edicion, setEdicion] = useState<Edicion | null>(null);
  const [alias, setAlias] = useState('');
  const [texto, setTexto] = useState('');
  const [errores, setErrores] = useState<ErroresDeEdicion>({});
  const [guardando, setGuardando] = useState(false);
  const [aBorrar, setABorrar] = useState<DireccionGuardada | null>(null);
  const [borrando, setBorrando] = useState(false);

  /** Recarga la lista y copia la principal a la sesión (A4 devolvería lo mismo). */
  const recargar = useCallback(async () => {
    const lista = await listarMisDirecciones();
    setDirecciones(lista);
    const usuario = sesion?.usuario;
    const principal = principalDe(lista)?.direccion ?? null;
    if (usuario && usuario.direccion !== principal) {
      actualizarUsuario({ ...usuario, direccion: principal });
    }
  }, [sesion?.usuario, actualizarUsuario]);

  useEffect(() => {
    let vigente = true;
    listarMisDirecciones()
      .then((lista) => vigente && setDirecciones(lista))
      .catch((e) => vigente && setErrorDeCarga(mensajeDe(e)));
    return () => {
      vigente = false;
    };
  }, []);

  function abrir(nueva: Edicion) {
    setEdicion(nueva);
    setAlias(nueva.tipo === 'editar' ? nueva.direccion.alias : direcciones?.length ? '' : 'Casa');
    setTexto(nueva.tipo === 'editar' ? nueva.direccion.direccion : '');
    setErrores({});
  }

  async function guardar() {
    if (edicion === null) return;
    const locales: ErroresDeEdicion = {
      alias: alias.trim() === '' ? 'Es obligatorio.' : undefined,
      direccion: texto.trim() === '' ? 'Es obligatoria.' : undefined,
    };
    setErrores(locales);
    if (locales.alias || locales.direccion) return;
    setGuardando(true);
    try {
      const cuerpo = { alias: alias.trim(), direccion: texto.trim() };
      if (edicion.tipo === 'nueva') {
        await crearDireccion(cuerpo);
      } else {
        await actualizarDireccion(edicion.direccion.uuid, cuerpo);
      }
      await recargar();
      setEdicion(null);
    } catch (e) {
      setErrores(
        e instanceof ApiError && (e.errorDe('alias') || e.errorDe('direccion'))
          ? { alias: e.errorDe('alias'), direccion: e.errorDe('direccion') }
          : { general: mensajeDe(e) },
      );
    } finally {
      setGuardando(false);
    }
  }

  async function hacerPrincipal(direccion: DireccionGuardada) {
    setErrorDeAccion(undefined);
    try {
      await marcarDireccionPrincipal(direccion.uuid);
      await recargar();
    } catch (e) {
      setErrorDeAccion(mensajeDe(e));
    }
  }

  async function borrar() {
    if (aBorrar === null) return;
    setErrorDeAccion(undefined);
    setBorrando(true);
    try {
      await eliminarDireccion(aBorrar.uuid);
      await recargar();
    } catch (e) {
      setErrorDeAccion(mensajeDe(e));
    } finally {
      setBorrando(false);
      setABorrar(null);
    }
  }

  return (
    <View testID="mis-direcciones">
      <Text style={estilos.seccion}>Mis direcciones</Text>
      <Text style={estilos.ayuda}>La principal es la que se completa sola al pedir un servicio.</Text>

      {errorDeCarga !== undefined ? (
        <Text style={estilos.mensaje}>{errorDeCarga}</Text>
      ) : direcciones === null ? (
        <Esqueleto alto={tamanios.avatar + espaciado.l} radio={radios.tarjeta} />
      ) : (
        <View style={estilos.lista}>
          {direcciones.length === 0 && <Text style={estilos.ayuda}>Todavía no guardaste direcciones.</Text>}
          {direcciones.map((d) => (
            <Card key={d.uuid} variante="blanca">
              <View style={estilos.datos}>
                <View accessible accessibilityLabel={`${d.alias}: ${d.direccion}${d.principal ? ', principal' : ''}`}>
                  <View style={estilos.filaAlias}>
                    <Text style={estilos.alias}>{d.alias}</Text>
                    {d.principal && <Etiqueta texto="Principal" tono="exito" />}
                  </View>
                  <Text style={estilos.direccion}>{d.direccion}</Text>
                </View>
                <View style={estilos.acciones}>
                  {!d.principal && (
                    <Button
                      etiqueta="Hacer principal"
                      variante="texto"
                      tamanio="chico"
                      ancho="contenido"
                      descripcion={`Hacer principal ${d.alias}`}
                      onPress={() => void hacerPrincipal(d)}
                    />
                  )}
                  <Button
                    etiqueta="Editar"
                    variante="texto"
                    tamanio="chico"
                    ancho="contenido"
                    descripcion={`Editar ${d.alias}`}
                    onPress={() => abrir({ tipo: 'editar', direccion: d })}
                  />
                  <Button
                    etiqueta="Borrar"
                    variante="texto"
                    tamanio="chico"
                    ancho="contenido"
                    descripcion={`Borrar ${d.alias}`}
                    onPress={() => setABorrar(d)}
                  />
                </View>
              </View>
            </Card>
          ))}
          {errorDeAccion !== undefined && <Text style={estilos.mensaje}>{errorDeAccion}</Text>}
          <Button etiqueta="Agregar dirección" variante="contorno" onPress={() => abrir({ tipo: 'nueva' })} />
        </View>
      )}

      <HojaInferior
        visible={edicion !== null}
        alCerrar={() => setEdicion(null)}
        titulo={edicion?.tipo === 'editar' ? 'Editar dirección' : 'Nueva dirección'}
      >
        <Input etiqueta="Nombre" placeholder="Casa, Trabajo..." value={alias} onChangeText={setAlias} maxLength={40} error={errores.alias} />
        <Input etiqueta="Dirección" value={texto} onChangeText={setTexto} maxLength={255} error={errores.direccion} />
        {errores.general !== undefined && <Text style={estilos.mensaje}>{errores.general}</Text>}
        <Button etiqueta="Guardar dirección" onPress={() => void guardar()} deshabilitado={guardando} />
      </HojaInferior>

      <Dialogo
        visible={aBorrar !== null}
        titulo="¿Borrar esta dirección?"
        mensaje={aBorrar?.principal ? 'Es tu principal: pasará a serlo otra de las que guardaste.' : undefined}
        etiquetaConfirmar="Borrar"
        peligro
        enviando={borrando}
        alConfirmar={() => void borrar()}
        alCancelar={() => setABorrar(null)}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  seccion: { ...tipografia.seccion, color: colores.tinta, marginTop: espaciado.l, marginBottom: espaciado.xs },
  ayuda: { ...tipografia.cuerpo, color: colores.tintaSecundaria, marginBottom: espaciado.m },
  lista: { gap: espaciado.s },
  datos: { flex: 1, gap: espaciado.xs },
  filaAlias: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s },
  alias: { ...tipografia.cuerpo, fontWeight: '700', color: colores.tinta },
  direccion: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.s },
  mensaje: { ...tipografia.cuerpo, color: colores.rojo },
});
