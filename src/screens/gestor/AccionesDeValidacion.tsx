import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { validarPrestador } from '../../api/gestion';
import { Button, Input } from '../../components';
import { colores, espaciado, tipografia } from '../../theme';

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
 * Aprobar o rechazar a un prestador (E6, CU14) con confirmación: aprobar pide confirmar; rechazar abre el
 * motivo (opcional, hasta 255, le llega al prestador). Mientras se envía, confirmar y cancelar quedan
 * deshabilitados. La usan la tarjeta de Validaciones y el Expediente.
 */
export function AccionesDeValidacion({ uuidPrestador, nombreApellido, alDecidir, alFallar }: Props) {
  const [confirmando, setConfirmando] = useState<DecisionDeValidacion | null>(null);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function resolver(decision: DecisionDeValidacion) {
    setEnviando(true);
    try {
      const texto = motivo.trim();
      await validarPrestador(uuidPrestador, decision === 'RECHAZAR' && texto !== '' ? { decision, motivo: texto } : { decision });
      setConfirmando(null);
      alDecidir(decision);
    } catch (e) {
      alFallar(e);
    } finally {
      setEnviando(false);
    }
  }

  if (confirmando === null) {
    return (
      <View style={estilos.acciones}>
        <Button
          etiqueta="Aprobar"
          onPress={() => {
            setMotivo('');
            setConfirmando('APROBAR');
          }}
        />
        <Button
          etiqueta="Rechazar"
          variante="secundario"
          onPress={() => {
            setMotivo('');
            setConfirmando('RECHAZAR');
          }}
        />
      </View>
    );
  }
  const aprobar = confirmando === 'APROBAR';
  return (
    <View style={estilos.acciones}>
      {aprobar ? (
        <Text style={estilos.dato}>¿Aprobar a {nombreApellido}? Va a aparecer en las búsquedas.</Text>
      ) : (
        <Input etiqueta="Motivo (opcional)" value={motivo} onChangeText={setMotivo} maxLength={MAXIMO_MOTIVO} multiline />
      )}
      <Button
        etiqueta={aprobar ? 'Confirmar aprobación' : 'Confirmar rechazo'}
        variante={aprobar ? 'primario' : 'secundario'}
        onPress={() => resolver(confirmando)}
        deshabilitado={enviando}
      />
      <Button etiqueta="Cancelar" variante="terciario" onPress={() => setConfirmando(null)} deshabilitado={enviando} />
    </View>
  );
}

const estilos = StyleSheet.create({
  acciones: { marginTop: espaciado.m, gap: espaciado.s },
  dato: { ...tipografia.cuerpo, color: colores.tintaSecundaria },
});
