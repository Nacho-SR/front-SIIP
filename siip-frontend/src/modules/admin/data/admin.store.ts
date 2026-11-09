import { reactive } from 'vue';
import catalogo from '../../consulta/data/indicadores-siip.json';

export function familiasDeAgrupacion(agrupacion: string): string[] {
  return [...new Set(catalogo.filter(indicador => indicador.agrupacion === agrupacion)
    .map(indicador => indicador.familia))].sort((a, b) => a.localeCompare(b, 'es'));
}

export interface IndicadorAdmin {
  id: string;
  campos: Record<string, string>;
  creadoEn: string;
  actualizadoEn: string;
}

const INDICADORES_KEY = 'siip-admin-indicadores-v1';

function leer<T>(clave: string): T[] {
  try {
    const contenido = localStorage.getItem(clave);

    const datos: unknown = contenido
      ? JSON.parse(contenido)
      : [];

    return Array.isArray(datos)
      ? datos as T[]
      : [];
  } catch {
    return [];
  }
}

function guardar<T>(clave: string, datos: T[]) {
  localStorage.setItem(
    clave,
    JSON.stringify(datos)
  );
}

export const adminState = reactive({
  indicadores: leer<IndicadorAdmin>(INDICADORES_KEY)
});

export function refrescarAdmin() {
  adminState.indicadores = leer<IndicadorAdmin>(INDICADORES_KEY);
}

// =====================================================
// REGISTRAR / EDITAR INDICADOR
// =====================================================

export function guardarIndicador(
  campos: Record<string, string>,
  id?: string
) {
  const normalizados = Object.fromEntries(
    Object.entries(campos).map(
      ([clave, valor]) => [
        clave,
        String(valor ?? '').trim()
      ]
    )
  );

  const clave = normalizados.clave;

  // -------------------------------------------------
  // VALIDACIONES
  // -------------------------------------------------

  if (!clave) {
    throw new Error(
      'La clave del indicador es obligatoria.'
    );
  }

  if (!normalizados.nombre) {
    throw new Error(
      'El nombre del indicador es obligatorio.'
    );
  }

  if (!familiasDeAgrupacion(normalizados.agrupacion ?? '').includes(normalizados.familia ?? '')) {
    throw new Error('Selecciona una familia que pertenezca a la agrupación temática.');
  }

  const claveDuplicada = adminState.indicadores.some(
    indicador =>
      indicador.campos.clave.toLowerCase() ===
        clave.toLowerCase() &&
      indicador.id !== id
  );

  if (claveDuplicada) {
    throw new Error(
      'Ya existe un indicador administrado con esa clave.'
    );
  }

  const fecha = new Date().toISOString();
  const actualizados = [...adminState.indicadores];

  // -------------------------------------------------
  // EDITAR INDICADOR
  // -------------------------------------------------

  if (id) {
    const indice = actualizados.findIndex(
      indicador => indicador.id === id
    );

    if (indice < 0) {
      throw new Error(
        'No se encontró el indicador.'
      );
    }

    const actual = actualizados[indice];

    actualizados[indice] = {
      ...actual,
      campos: normalizados,
      actualizadoEn: fecha
    };

  // -------------------------------------------------
  // REGISTRAR INDICADOR NUEVO
  // -------------------------------------------------

  } else {
    actualizados.unshift({
      id: crypto.randomUUID(),
      campos: normalizados,
      creadoEn: fecha,
      actualizadoEn: fecha
    });
  }

  // Persistir los datos.
  guardar(
    INDICADORES_KEY,
    actualizados
  );
  adminState.indicadores = actualizados;
}

// =====================================================
// OBTENER INDICADOR POR ID
// =====================================================

export function obtenerIndicadorAdmin(
  id: string
): IndicadorAdmin | undefined {
  return adminState.indicadores.find(
    indicador => indicador.id === id
  );
}
