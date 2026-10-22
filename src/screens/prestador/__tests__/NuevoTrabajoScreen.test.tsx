import { fireEvent, render, screen } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';

import { memoria } from '../../../../__mocks__/expo-file-system';
import { subirImagen } from '../../../api/archivos';
import { ApiError } from '../../../api/errores';
import { actualizarPublicacion, crearPublicacion, type Publicacion } from '../../../api/reputacion';
import { listarMisSolicitudes, type SolicitudEnLista } from '../../../api/solicitudes';
import { NuevoTrabajoScreen } from '../NuevoTrabajoScreen';

jest.mock('../../../api/reputacion', () => ({ crearPublicacion: jest.fn(), actualizarPublicacion: jest.fn() }));
jest.mock('../../../api/solicitudes', () => ({ listarMisSolicitudes: jest.fn() }));
jest.mock('../../../api/archivos', () => ({ subirImagen: jest.fn() }));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
/** El calendario nativo no corre en Jest: se reemplaza por un campo de texto con la misma interfaz. */
jest.mock('../../../components/SelectorDeFecha', () => ({
  SelectorDeFecha: ({ etiqueta, value, onChange, onQuitar, error }: Record<string, string & ((v?: string) => void)>) => {
    const React = require('react');
    const { Pressable, Text, TextInput } = require('react-native');
    return React.createElement(
      React.Fragment,
      null,
      React.createElement(TextInput, { accessibilityLabel: etiqueta, value, onChangeText: onChange }),
      value !== '' && onQuitar && React.createElement(Pressable, { onPress: onQuitar }, React.createElement(Text, null, 'Quitar fecha')),
      error !== undefined && React.createElement(Text, null, error),
    );
  },
}));
jest.mock('../../../components/ImagenProtegida', () => ({
  ImagenProtegida: ({ uuid }: { uuid: string }) =>
    require('react').createElement(require('react-native').Text, null, `img:${uuid}`),
}));
jest.mock('../../../utils/formato', () => ({
  ...jest.requireActual('../../../utils/formato'),
  hoyEnArgentina: () => '2026-10-21',
}));

let mockParams: { publicacion?: Publicacion } | undefined;
const mockGoBack = jest.fn();
const mockPopTo = jest.fn();
const mockSetOptions = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, popTo: mockPopTo, setOptions: mockSetOptions }),
  useRoute: () => ({ params: mockParams }),
}));

const mockCrear = crearPublicacion as jest.Mock;
const mockActualizar = actualizarPublicacion as jest.Mock;
const mockListar = listarMisSolicitudes as jest.Mock;
const mockSubir = subirImagen as jest.Mock;
const mockElegir = ImagePicker.launchImageLibraryAsync as jest.Mock;

const solicitud = (n: number, fechaDeseada: string): SolicitudEnLista => ({
  uuid: `s${n}`,
  estado: 'FINALIZADA',
  contraparte: { uuid: `c${n}`, nombreApellido: `Cliente ${n}`, telefono: null },
  tipoServicio: { uuid: 't1', nombre: 'Plomería', icono: 'water', requiereMatricula: false },
  fechaDeseada,
  horaPreferida: null,
  descripcion: 'Pérdida',
  direccion: 'Calle 1',
  creadoEn: '2026-10-01T12:00:00Z',
});

const existente: Publicacion = {
  uuid: 'pub-1',
  titulo: 'Baño',
  descripcion: 'Cañerías',
  fechaTrabajo: '2026-10-01',
  imagenIds: ['img-viejo'],
  puntaje: 5,
  uuidSolicitud: 's1',
  creadoEn: '2026-10-02T12:00:00Z',
};

async function abrir() {
  await render(<NuevoTrabajoScreen />);
  await screen.findByText('Sin solicitud');
}

beforeEach(() => {
  memoria.reiniciar();
  mockParams = undefined;
  [mockCrear, mockActualizar, mockListar, mockSubir, mockElegir, mockGoBack, mockPopTo, mockSetOptions].forEach((m) =>
    m.mockReset(),
  );
  mockListar.mockResolvedValue({
    contenido: [solicitud(1, '2026-10-09'), solicitud(2, '2026-10-15')],
    pagina: 0,
    tamanio: 50,
    totalElementos: 2,
    totalPaginas: 1,
  });
});

describe('NuevoTrabajoScreen', () => {
  it('ofrece las solicitudes terminadas del prestador', async () => {
    await abrir();
    expect(mockListar).toHaveBeenCalledWith({ estados: ['FINALIZADA', 'VALORADA'], page: 0, size: 50 });
    expect(screen.getByText('Cliente 1 · 09/10/2026 · Pérdida')).toBeOnTheScreen();
    expect(screen.getByText('Cliente 2 · 15/10/2026 · Pérdida')).toBeOnTheScreen();
    expect(mockSetOptions).not.toHaveBeenCalled();
  });

  it('dos solicitudes del mismo cliente y el mismo día se distinguen por la descripción, recortada', async () => {
    mockListar.mockResolvedValue({
      contenido: [
        { ...solicitud(1, '2026-10-21'), descripcion: 'Pérdida en la cocina' },
        { ...solicitud(2, '2026-10-21'), contraparte: { uuid: 'c1', nombreApellido: 'Cliente 1', telefono: null },
          descripcion: 'Cambio de la canilla del baño y de los flexibles de la ducha' },
      ],
      pagina: 0,
      tamanio: 50,
      totalElementos: 2,
      totalPaginas: 1,
    });
    await abrir();
    expect(screen.getByText('Cliente 1 · 21/10/2026 · Pérdida en la cocina')).toBeOnTheScreen();
    expect(screen.getByText('Cliente 1 · 21/10/2026 · Cambio de la canilla del baño…')).toBeOnTheScreen();
  });

  it('el título es obligatorio', async () => {
    await abrir();
    await fireEvent.press(screen.getByText('Publicar'));
    expect(screen.getByText('Es obligatorio.')).toBeOnTheScreen();
    expect(mockCrear).not.toHaveBeenCalled();
  });

  it('Quitar fecha publica sin fecha del trabajo', async () => {
    mockCrear.mockResolvedValue(existente);
    await abrir();
    await fireEvent.changeText(screen.getByLabelText('Título'), 'Baño');
    await fireEvent.changeText(screen.getByLabelText('Fecha del trabajo'), '2026-10-10');
    await fireEvent.press(screen.getByText('Quitar fecha'));
    await fireEvent.press(screen.getByText('Publicar'));
    expect(mockCrear).toHaveBeenCalledWith({ titulo: 'Baño', imagenIds: [] });
  });

  it('publica sin solicitud ni fecha y vuelve a la lista', async () => {
    mockCrear.mockResolvedValue(existente);
    await abrir();
    await fireEvent.changeText(screen.getByLabelText('Título'), '  Pintura  ');
    await fireEvent.press(screen.getByText('Publicar'));

    expect(mockCrear).toHaveBeenCalledWith({ titulo: 'Pintura', imagenIds: [] });
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('elegir una solicitud precarga su fecha y la vincula', async () => {
    mockCrear.mockResolvedValue(existente);
    await abrir();
    await fireEvent.changeText(screen.getByLabelText('Título'), 'Baño');
    await fireEvent.press(screen.getByText('Cliente 1 · 09/10/2026 · Pérdida'));
    expect(screen.getByLabelText('Fecha del trabajo').props.value).toBe('2026-10-09');
    // otra solicitud reemplaza la fecha precargada que no se tocó
    await fireEvent.press(screen.getByText('Cliente 2 · 15/10/2026 · Pérdida'));
    expect(screen.getByLabelText('Fecha del trabajo').props.value).toBe('2026-10-15');

    await fireEvent.press(screen.getByText('Publicar'));
    expect(mockCrear).toHaveBeenCalledWith({
      titulo: 'Baño',
      fechaTrabajo: '2026-10-15',
      uuidSolicitud: 's2',
      imagenIds: [],
    });
  });

  it('una fecha elegida a mano no se pisa al elegir solicitud', async () => {
    await abrir();
    await fireEvent.changeText(screen.getByLabelText('Fecha del trabajo'), '2026-10-10');
    await fireEvent.press(screen.getByText('Cliente 1 · 09/10/2026 · Pérdida'));
    expect(screen.getByLabelText('Fecha del trabajo').props.value).toBe('2026-10-10');
  });

  it('sube las fotos y manda sus uuid', async () => {
    mockCrear.mockResolvedValue(existente);
    mockElegir.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///a.jpg', mimeType: 'image/jpeg' }] });
    mockSubir.mockResolvedValue({ uuid: 'img-1', mime: 'image/jpeg', bytes: 10 });
    await abrir();
    await fireEvent.changeText(screen.getByLabelText('Título'), 'Baño');
    await fireEvent.press(screen.getByText('Agregar fotos'));
    expect(await screen.findByText('Lista')).toBeOnTheScreen();

    await fireEvent.press(screen.getByText('Publicar'));
    expect(mockCrear).toHaveBeenCalledWith({ titulo: 'Baño', imagenIds: ['img-1'] });
  });

  it('el error del backend en uuidSolicitud sale bajo el selector', async () => {
    mockCrear.mockRejectedValue(
      new ApiError(400, 'VALIDACION', 'Datos inválidos', [{ campo: 'uuidSolicitud', detalle: 'ya tiene una publicación' }]),
    );
    await abrir();
    await fireEvent.changeText(screen.getByLabelText('Título'), 'Baño');
    await fireEvent.press(screen.getByText('Cliente 1 · 09/10/2026 · Pérdida'));
    await fireEvent.press(screen.getByText('Publicar'));

    expect(await screen.findByText('ya tiene una publicación')).toBeOnTheScreen();
    expect(screen.queryByText('Datos inválidos')).toBeNull();
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('un error sin campo se muestra como mensaje general', async () => {
    mockCrear.mockRejectedValue(new ApiError(500, 'ERROR_INTERNO', 'Falló el servidor.'));
    await abrir();
    await fireEvent.changeText(screen.getByLabelText('Título'), 'Baño');
    await fireEvent.press(screen.getByText('Publicar'));
    expect(await screen.findByText('Falló el servidor.')).toBeOnTheScreen();
  });

  it('si no carga las solicitudes permite reintentar', async () => {
    mockListar.mockRejectedValueOnce(new ApiError(500, 'ERROR_INTERNO', 'Falló el servidor.'));
    await render(<NuevoTrabajoScreen />);
    expect(await screen.findByText('Falló el servidor.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Reintentar'));
    expect(await screen.findByText('Sin solicitud')).toBeOnTheScreen();
  });

  describe('editando', () => {
    beforeEach(() => {
      mockParams = { publicacion: existente };
    });

    it('precarga el trabajo, sus fotos y su solicitud, y cambia el título de la pantalla', async () => {
      await abrir();
      expect(mockSetOptions).toHaveBeenCalledWith({ title: 'Editar trabajo' });
      expect(screen.getByLabelText('Título').props.value).toBe('Baño');
      expect(screen.getByLabelText('Descripción').props.value).toBe('Cañerías');
      expect(screen.getByLabelText('Fecha del trabajo').props.value).toBe('2026-10-01');
      expect(screen.getByText('img:img-viejo')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Cliente 1 · 09/10/2026 · Pérdida' })).toBeSelected();
    });

    it('guarda con PUT, reemplazando todo, y vuelve al detalle con lo que devolvió el backend', async () => {
      const actualizada = { ...existente, titulo: 'Baño completo', descripcion: null, imagenIds: [] };
      mockActualizar.mockResolvedValue(actualizada);
      await abrir();
      await fireEvent.changeText(screen.getByLabelText('Título'), 'Baño completo');
      await fireEvent.changeText(screen.getByLabelText('Descripción'), '');
      await fireEvent.press(screen.getByLabelText('Quitar imagen 1'));
      await fireEvent.press(screen.getByText('Sin solicitud'));
      await fireEvent.press(screen.getByText('Guardar cambios'));

      expect(mockActualizar).toHaveBeenCalledWith('pub-1', {
        titulo: 'Baño completo',
        fechaTrabajo: '2026-10-01',
        imagenIds: [],
      });
      expect(mockPopTo).toHaveBeenCalledWith('DetalleTrabajo', { publicacion: actualizada });
    });

    it('conserva las fotos que ya tenía', async () => {
      mockActualizar.mockResolvedValue(existente);
      await abrir();
      await fireEvent.press(screen.getByText('Guardar cambios'));
      expect(mockActualizar).toHaveBeenCalledWith('pub-1', expect.objectContaining({ imagenIds: ['img-viejo'], uuidSolicitud: 's1' }));
    });
  });
});
