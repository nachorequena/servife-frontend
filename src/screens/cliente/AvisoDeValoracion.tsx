import { Dialogo } from '../../components';

interface Props {
  visible: boolean;
  nombrePrestador: string;
  alValorar: () => void;
  alPosponer: () => void;
}

/**
 * Aviso de valoración (D07, porción 3): sale cuando el cliente ve una solicitud FINALIZADA sin valorar. "Valorar"
 * lleva a la pantalla Valoracion, que pregunta si el servicio se realizó; "Más tarde" lo cierra y la valoración
 * queda pendiente en el detalle y en el Historial.
 */
export function AvisoDeValoracion({ visible, nombrePrestador, alValorar, alPosponer }: Props) {
  return (
    <Dialogo
      visible={visible}
      titulo="¿Querés valorar el servicio?"
      mensaje={`Terminó el trabajo con ${nombrePrestador}. Tu valoración ayuda a otros clientes a elegir.`}
      etiquetaConfirmar="Valorar"
      etiquetaCancelar="Más tarde"
      alConfirmar={alValorar}
      alCancelar={alPosponer}
    />
  );
}
