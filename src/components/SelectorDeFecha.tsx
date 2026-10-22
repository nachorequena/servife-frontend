import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform } from 'react-native';

import { dateAFechaSola, fechaADate, formatearFechaSola, hoyEnArgentina } from '../utils/formato';
import { Button } from './Button';
import { CampoDeSeleccion } from './CampoDeSeleccion';

interface Props {
  etiqueta: string;
  /** "AAAA-MM-DD", o '' si todavía no eligió. */
  value: string;
  onChange: (fecha: string) => void;
  /** "AAAA-MM-DD": el calendario no deja elegir días anteriores. */
  minimo?: string;
  /** "AAAA-MM-DD": el calendario no deja elegir días posteriores. */
  maximo?: string;
  /** "AAAA-MM-DD": fecha en la que abre el calendario si todavía no hay valor (por defecto, el mínimo u hoy). */
  inicial?: string;
  /** Para campos opcionales: con valor, muestra "Quitar fecha" y la vacía. */
  onQuitar?: () => void;
  error?: string;
}

/** Campo de fecha: al tocarlo abre el calendario del sistema. Entrega y recibe "AAAA-MM-DD". */
export function SelectorDeFecha({ etiqueta, value, onChange, minimo, maximo, inicial, onQuitar, error }: Props) {
  const [abierto, setAbierto] = useState(false);
  const abreEn = fechaADate(value || inicial || minimo || hoyEnArgentina());
  const minimumDate = minimo === undefined ? undefined : fechaADate(minimo);
  const maximumDate = maximo === undefined ? undefined : fechaADate(maximo);

  const abrir = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: abreEn,
        mode: 'date',
        minimumDate,
        maximumDate,
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
          value={abreEn}
          mode="date"
          display="inline"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onValueChange={(_evento, elegida) => onChange(dateAFechaSola(elegida))}
        />
      )}
      {onQuitar !== undefined && value !== '' && (
        <Button etiqueta="Quitar fecha" variante="terciario" onPress={onQuitar} />
      )}
    </>
  );
}
