
import type {
  RegistroCaptura
} from '../../capture/data/captura.types';
import { proyectarResultadoConsulta, type PublicacionConsulta } from '../../consulta/data/consulta';
import { MOTIVO_OPERACION_PENDIENTE } from '../../../core/operacion-pendiente';

const STORAGE_KEY = 'siip-capturas-prototipo-v1';

export type EstadoSeguimiento =
  | 'Borrador'
  | 'En revisión'
  | 'Revisada'
  | 'Observada'
  | 'Validada';

export type AccionSeguimiento =
  | 'revisar'
  | 'observar'
  | 'validar';

export interface EventoSeguimiento {
  accion: AccionSeguimiento | 'corregir';
  estadoAnterior: EstadoSeguimiento;
  estadoNuevo: EstadoSeguimiento;
  comentario: string;
  fecha: string;
}

export interface ExpedienteSeguimiento
  extends Omit<RegistroCaptura, 'estado'> {
  estado: EstadoSeguimiento;
  historial?: EventoSeguimiento[];
  publicacion?: PublicacionConsulta;
  cumplimientoCierre?: 'completo' | 'incumplido';
}

// shortcut: proyección de datos sintéticos locales; sustituir por la API de publicaciones cuando exista.
export function obtenerResultadosConsulta() {
  return obtenerExpedientes().map(proyectarResultadoConsulta);
}

// Obtener expedientes guardados
export function obtenerExpedientes(): ExpedienteSeguimiento[] {
  try {
    const contenido = sessionStorage.getItem(STORAGE_KEY);

    if (!contenido) return [];

    const datos: unknown = JSON.parse(contenido);

    if (!Array.isArray(datos)) return [];

    return datos.filter(
      (item): item is ExpedienteSeguimiento =>
        item !== null &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.indicadorClave === 'string' &&
        typeof item.estado === 'string'
    );
  } catch {
    return [];
  }
}

// Bandeja de Seguimiento
export function obtenerBandeja(): ExpedienteSeguimiento[] {
  return obtenerExpedientes()
    .filter(expediente => expediente.estado !== 'Borrador')
    .sort((a, b) =>
      b.actualizadoEn.localeCompare(a.actualizadoEn)
    );
}

// Buscar expediente por identificador
export function buscarExpediente(
  id: string
): ExpedienteSeguimiento | undefined {
  return obtenerBandeja().find(
    expediente => expediente.id === id
  );
}

// Las escrituras locales no representan envíos versionados ni auditoría del servidor.
export function actualizarExpediente(
  _id: string,
  _accion: AccionSeguimiento,
  _comentario: string
): ExpedienteSeguimiento {
  throw new Error(MOTIVO_OPERACION_PENDIENTE);
}

export interface DatosCorreccion {
  valor: number;
  descripcion: string;
  evidenciaNombre: string;
  variablesCaptura?: Record<string, number>;
}

export function reenviarCorreccion(
  _id: string,
  _datos: DatosCorreccion
): ExpedienteSeguimiento {
  throw new Error(MOTIVO_OPERACION_PENDIENTE);
}
