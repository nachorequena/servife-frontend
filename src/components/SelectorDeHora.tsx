import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform } from 'react-native';

import { dateAHora, horaADate } from '../utils/formato';
import { Button } from './Button';
import { CampoDeSeleccion } from './CampoDeSeleccion';

interface Props {
  etiqueta: string;
  /** "HH:mm" (24 h), o '' si no eligió. */
  value: string;
  onChange: (hora: string) => void;
  error?: string;
}

/** Campo de hora opcional: al tocarlo abre el reloj del sistema; "Quitar hora" lo vacía. Entrega y recibe "HH:mm". */
export function SelectorDeHora({ etiqueta, value, onChange, error }: Props) {
  const [abierto, setAbierto] = useState(false);
  const inicial = horaADate(value || '09:00');

  const abrir = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: inicial,
        mode: 'time',
        is24Hour: true,
        onValueChange: (_evento, elegida) => onChange(dateAHora(elegida)),
      });
    } else {
      setAbierto((a) => !a);
    }
  };

  return (
    <>
      <CampoDeSeleccion
        etiqueta={etiqueta}
        valor={value === '' ? undefined : `${value} hs`}
        placeholder="Elegir hora (opcional)"
        onPress={abrir}
        error={error}
      />
      {abierto && Platform.OS !== 'android' && (
        <DateTimePicker
          value={inicial}
          mode="time"
          display="spinner"
          is24Hour
          onValueChange={(_evento, elegida) => onChange(dateAHora(elegida))}
        />
      )}
      {value !== '' && <Button etiqueta="Quitar hora" variante="terciario" onPress={() => onChange('')} />}
    </>
  );
}
