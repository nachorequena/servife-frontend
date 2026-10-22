import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform } from 'react-native';

import { dateAFechaSola, fechaADate, formatearFechaSola, hoyEnArgentina } from '../utils/formato';
import { CampoDeSeleccion } from './CampoDeSeleccion';

interface Props {
  etiqueta: string;
  /** "AAAA-MM-DD", o '' si todavía no eligió. */
  value: string;
  onChange: (fecha: string) => void;
  /** "AAAA-MM-DD": el calendario no deja elegir días anteriores. */
  minimo?: string;
  error?: string;
}

/** Campo de fecha: al tocarlo abre el calendario del sistema. Entrega y recibe "AAAA-MM-DD". */
export function SelectorDeFecha({ etiqueta, value, onChange, minimo, error }: Props) {
  const [abierto, setAbierto] = useState(false);
  const inicial = fechaADate(value || minimo || hoyEnArgentina());
  const minimumDate = minimo === undefined ? undefined : fechaADate(minimo);

  const abrir = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: inicial,
        mode: 'date',
        minimumDate,
        onValueChange: (_evento, elegida) => onChange(dateAFechaSola(elegida)),
      });
    } else {
      setAbierto((a) => !a);
    }
  };

  return (
    <>
      <CampoDeSeleccion
        etiqueta={etiqueta}
        valor={value === '' ? undefined : formatearFechaSola(value)}
        placeholder="Elegir fecha"
        onPress={abrir}
        error={error}
      />
      {abierto && Platform.OS !== 'android' && (
        <DateTimePicker
          value={inicial}
          mode="date"
          display="inline"
          minimumDate={minimumDate}
          onValueChange={(_evento, elegida) => onChange(dateAFechaSola(elegida))}
        />
      )}
    </>
  );
}
