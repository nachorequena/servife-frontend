import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { validarPrestador } from '../../api/gestion';
import { Button, Dialogo, HojaInferior, Input } from '../../components';
import { espaciado } from '../../theme';

/** Límite del motivo en E6 (DecisionDeValidacionRequest). */
const MAXIMO_MOTIVO = 255;

export type DecisionDeValidacion = 'APROBAR' | 'RECHAZAR';

interface Props {
  uuidPrestador: string;
  nombreApellido: string;
  /** Después de que E6 respondió bien. */
  alDecidir: (decision: DecisionDeValidacion) => void;
  /** Si E6 falló (409 VALIDACION_YA_RESUELTA, EXPEDIENTE_INCOMPLETO, FALTA_MATRICULA, red...). */
  alFallar: (error: unknown) => void;
}

/**
 * Aprobar o rechazar a un prestador (E6, CU14): dos botones chicos en una fila. Aprobar pide confirmar en un
 * diálogo; Rechazar abre una hoja con el motivo (opcional, hasta 255, le llega al prestador). Mientras se
 * envía, los botones quedan deshabilitados. La usan la tarjeta de Validaciones y el Expediente.
 */
export function AccionesDeValidacion({ uuidPrestador, nombreApellido, alDecidir, alFallar }: Props) {
  const [confirmando, setConfirmando] = useState<DecisionDeValidacion | null>(null);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);

  function abrir(decision: DecisionDeValidacion) {
    setMotivo('');
    setConfirmando(decision);
  }

  async function resolver(decision: DecisionDeValidacion) {
    setEnviando(true);
    try {
      const texto = motivo.trim();
      await validarPrestador(uuidPrestador, decision === 'RECHAZAR' && texto !== '' ? { decision, motivo: texto } : { decision });
      setConfirmando(null);
      alDecidir(decision);
    } catch (e) {
      setConfirmando(null);
      alFallar(e);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <View style={estilos.fila}>
      <View style={estilos.mitad}>
        <Button
          etiqueta="Rechazar"
          variante="contorno"
          tamanio="chico"
          icono="close"
          onPress={() => abrir('RECHAZAR')}
          deshabilitado={enviando}
        />
      </View>
      <View style={estilos.mitad}>
        <Button etiqueta="Aprobar" tamanio="chico" icono="checkmark" onPress={() => abrir('APROBAR')} deshabilitado={enviando} />
      </View>

      <Dialogo
        visible={confirmando === 'APROBAR'}
        titulo={`¿Aprobar a ${nombreApellido}?`}
        mensaje="Va a aparecer en las búsquedas de los clientes."
        etiquetaConfirmar="Aprobar"
        enviando={enviando}
        alConfirmar={() => resolver('APROBAR')}
        alCancelar={() => setConfirmando(null)}
      />

      <HojaInferior visible={confirmando === 'RECHAZAR'} titulo={`Rechazar a ${nombreApellido}`} alCerrar={() => !enviando && setConfirmando(null)}>
        <Input
          etiqueta="Motivo (opcional, le llega al prestador)"
          value={motivo}
          onChangeText={setMotivo}
          maxLength={MAXIMO_MOTIVO}
          multiline
        />
        <Button etiqueta="Rechazar" variante="peligro" onPress={() => resolver('RECHAZAR')} deshabilitado={enviando} />
        <Button etiqueta="Cancelar" variante="texto" onPress={() => setConfirmando(null)} deshabilitado={enviando} />
      </HojaInferior>
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', gap: espaciado.s, marginTop: espaciado.m },
  mitad: { flex: 1 },
});
