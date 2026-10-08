import { render, screen } from '@testing-library/react-native';

import type { EstadoSolicitud } from '../../api/solicitudes';
import { EtiquetaDeEstado } from '../EtiquetaDeEstado';

const textos: Record<EstadoSolicitud, string> = {
  PENDIENTE: 'Pendiente',
  ACEPTADA: 'Aceptada',
  EN_CURSO: 'En curso',
  FINALIZADA: 'Finalizada',
  VALORADA: 'Valorada',
  RECHAZADA: 'Rechazada',
  CANCELADA: 'Cancelada',
};

describe('EtiquetaDeEstado', () => {
  it.each(Object.entries(textos))('%s muestra "%s"', async (estado, texto) => {
    await render(<EtiquetaDeEstado estado={estado as EstadoSolicitud} />);
    expect(screen.getByText(texto)).toBeOnTheScreen();
  });
});
