import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { listarTiposServicio, type TipoServicio } from '../../api/catalogo';
import { Button, Chip } from '../../components';
import { FILTROS_INICIALES, useFiltros, type Filtros } from '../../store/filtros';
import { colores, espaciado, radios, tipografia } from '../../theme';

/** Lunes (1) a domingo (7). */
const DIAS = [
  { numero: 1, letra: 'L', nombre: 'Lunes' },
  { numero: 2, letra: 'M', nombre: 'Martes' },
  { numero: 3, letra: 'M', nombre: 'Miércoles' },
  { numero: 4, letra: 'J', nombre: 'Jueves' },
  { numero: 5, letra: 'V', nombre: 'Viernes' },
  { numero: 6, letra: 'S', nombre: 'Sábado' },
  { numero: 7, letra: 'D', nombre: 'Domingo' },
];

const PUNTAJES = [1, 2, 3, 4, 5];

/** Filtros de búsqueda: cercanía, categoría, valoración y disponibilidad. Sin rango de precio (D02). */
export function FiltrosScreen() {
  const navigation = useNavigation();
  const { filtros, aplicar } = useFiltros();
  const [borrador, setBorrador] = useState<Filtros>(filtros);
  const [tipos, setTipos] = useState<TipoServicio[]>([]);
  const [errorTipos, setErrorTipos] = useState(false);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    listarTiposServicio()
      .then((lista) => {
        if (!vigente) return;
        setTipos(lista);
        setErrorTipos(false);
      })
      .catch(() => {
        if (vigente) setErrorTipos(true);
      });
    return () => {
      vigente = false;
    };
  }, [intento]);

  const cambiar = (cambios: Partial<Filtros>) => setBorrador((actual) => ({ ...actual, ...cambios }));
  const alternarDia = (dia: number) =>
    cambiar({
      dias: borrador.dias.includes(dia)
        ? borrador.dias.filter((d) => d !== dia)
        : [...borrador.dias, dia].sort((a, b) => a - b),
    });

  const confirmar = () => {
    aplicar(borrador);
    navigation.goBack();
  };

  return (
    <ScrollView style={estilos.pantalla} contentContainerStyle={estilos.contenido}>
      <View style={estilos.hoja}>
        <Text style={estilos.etiqueta}>Filtrar por:</Text>

        <Fila titulo="Cercanía" ayuda="orden de los resultados">
          <Chip
            etiqueta="De más cerca a más lejos"
            seleccionado={borrador.orden === 'cercania'}
            onPress={() => cambiar({ orden: 'cercania' })}
          />
          <Chip
            etiqueta="Mejor valorados"
            seleccionado={borrador.orden === 'valoracion'}
            onPress={() => cambiar({ orden: 'valoracion' })}
          />
        </Fila>

        <Fila titulo="Categoría" ayuda="rubro del prestador">
          {tipos.map((tipo) => (
            <Chip
              key={tipo.uuid}
              etiqueta={tipo.nombre}
              seleccionado={borrador.tipoServicioId === tipo.uuid}
              onPress={() =>
                cambiar({ tipoServicioId: borrador.tipoServicioId === tipo.uuid ? undefined : tipo.uuid })
              }
            />
          ))}
          {errorTipos && (
            <View style={estilos.error}>
              <Text style={estilos.textoError}>No pudimos cargar las categorías.</Text>
              <Button etiqueta="Reintentar" variante="terciario" onPress={() => setIntento((n) => n + 1)} />
            </View>
          )}
        </Fila>

        <Fila titulo="Valoración" ayuda="puntaje promedio">
          {PUNTAJES.map((puntaje) => (
            <Chip
              key={puntaje}
              etiqueta={`${puntaje} ★ o más`}
              seleccionado={borrador.puntajeMin === puntaje}
              onPress={() => cambiar({ puntajeMin: borrador.puntajeMin === puntaje ? undefined : puntaje })}
            />
          ))}
        </Fila>

        <Fila titulo="Disponibilidad" ayuda="días en que trabaja">
          {DIAS.map((dia) => (
            <Chip
              key={dia.numero}
              etiqueta={dia.letra}
              descripcion={dia.nombre}
              seleccionado={borrador.dias.includes(dia.numero)}
              onPress={() => alternarDia(dia.numero)}
            />
          ))}
        </Fila>

        <View style={estilos.botones}>
          <Button etiqueta="Aplicar" onPress={confirmar} />
          <Button etiqueta="Limpiar" variante="terciario" onPress={() => setBorrador(FILTROS_INICIALES)} />
        </View>
      </View>
    </ScrollView>
  );
}

function Fila({ titulo, ayuda, children }: { titulo: string; ayuda: string; children: React.ReactNode }) {
  return (
    <View style={estilos.fila}>
      <Text style={estilos.tituloFila}>{titulo}</Text>
      <Text style={estilos.ayuda}>{ayuda}</Text>
      <View style={estilos.chips}>{children}</View>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espaciado.s },
  hoja: { backgroundColor: colores.blanco, borderRadius: radios.hoja, padding: espaciado.m, gap: espaciado.s },
  etiqueta: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
  fila: { paddingVertical: espaciado.s, gap: espaciado.xs },
  tituloFila: { ...tipografia.seccion, color: colores.tinta },
  ayuda: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.s, marginTop: espaciado.xs },
  error: { gap: espaciado.s },
  textoError: { ...tipografia.cuerpo, color: colores.tinta },
  botones: { gap: espaciado.s, marginTop: espaciado.s },
});
