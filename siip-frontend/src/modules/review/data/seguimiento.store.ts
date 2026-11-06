
import type {
  RegistroCaptura
} from '../../capture/data/captura.types';

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

// Transiciones permitidas
const transiciones: Record<
  AccionSeguimiento,
  {
    desde: EstadoSeguimiento[];
    hacia: EstadoSeguimiento;
  }
> = {
  revisar: {
    desde: ['En revisión'],
    hacia: 'Revisada'
  },
  observar: {
    desde: ['En revisión', 'Revisada'],
    hacia: 'Observada'
  },
  validar: {
    desde: ['Revisada'],
    hacia: 'Validada'
  }
};

// Revisar, observar o validar un expediente
export function actualizarExpediente(
  id: string,
  accion: AccionSeguimiento,
  comentario: string
): ExpedienteSeguimiento {
  const expedientes = obtenerExpedientes();

  const indice = expedientes.findIndex(
    expediente => expediente.id === id
  );

  if (indice === -1) {
    throw new Error('No se encontró el expediente.');
  }

  const actual = expedientes[indice];
  const regla = transiciones[accion];

  if (!regla.desde.includes(actual.estado)) {
    throw new Error(
      `No es posible ${accion} un expediente con estado "${actual.estado}".`
    );
  }

  const observacion = comentario.trim();

  if (accion === 'observar' && !observacion) {
    throw new Error(
      'Debes escribir una observación para continuar.'
    );
  }

  const fecha = new Date().toISOString();

  const actualizado: ExpedienteSeguimiento = {
    ...actual,
    estado: regla.hacia,
    actualizadoEn: fecha,
    historial: [
      ...(actual.historial ?? []),
      {
        accion,
        estadoAnterior: actual.estado,
        estadoNuevo: regla.hacia,
        comentario: observacion,
        fecha
      }
    ]
  };

  expedientes[indice] = actualizado;

  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(expedientes)
  );

  return actualizado;
}

// Datos que pueden modificarse al corregir
export interface DatosCorreccion {
  valor: number;
  descripcion: string;
  evidenciaNombre: string;
  variablesCaptura?: Record<string, number>;
}

// Reenviar expediente observado
export function reenviarCorreccion(
  id: string,
  datos: DatosCorreccion
): ExpedienteSeguimiento {
  const expedientes = obtenerExpedientes();

  const indice = expedientes.findIndex(
    expediente => expediente.id === id
  );

  if (indice === -1) {
    throw new Error(
      'El expediente ya no existe en esta sesión.'
    );
  }

  const actual = expedientes[indice];

  if (actual.estado !== 'Observada') {
    throw new Error(
      'Solo se pueden corregir expedientes observados.'
    );
  }

  if (
    !Number.isFinite(datos.valor) ||
    !datos.evidenciaNombre.trim()
  ) {
    throw new Error(
      'Es obligatorio indicar un valor y seleccionar un nuevo PDF.'
    );
  }

  const fecha = new Date().toISOString();

  const actualizado: ExpedienteSeguimiento = {
    ...actual,

    valor: datos.valor,
    descripcion: datos.descripcion.trim(),
    evidenciaNombre: datos.evidenciaNombre,

    // Conservar las variables del cálculo
    variablesCaptura:
      datos.variablesCaptura ?? actual.variablesCaptura,

    estado: 'En revisión',
    actualizadoEn: fecha,

    // Mantener historial anterior y agregar corrección
    historial: [
      ...(actual.historial ?? []),
      {
        accion: 'corregir',
        estadoAnterior: 'Observada',
        estadoNuevo: 'En revisión',
        comentario:
          'Corrección reenviada por Captura (simulación local).',
        fecha
      }
    ]
  };

  expedientes[indice] = actualizado;

  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(expedientes)
  );

  return actualizado;
}
