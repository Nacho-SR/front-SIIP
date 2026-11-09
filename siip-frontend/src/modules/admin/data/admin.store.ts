import { reactive } from 'vue';

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

  // -------------------------------------------------
  // EDITAR INDICADOR
  // -------------------------------------------------

  if (id) {
    const indice = adminState.indicadores.findIndex(
      indicador => indicador.id === id
    );

    if (indice < 0) {
      throw new Error(
        'No se encontró el indicador.'
      );
    }

    const actual = adminState.indicadores[indice];

    adminState.indicadores[indice] = {
      ...actual,
      campos: normalizados,
      actualizadoEn: fecha
    };

  // -------------------------------------------------
  // REGISTRAR INDICADOR NUEVO
  // -------------------------------------------------

  } else {
    adminState.indicadores.unshift({
      id: crypto.randomUUID(),
      campos: normalizados,
      creadoEn: fecha,
      actualizadoEn: fecha
    });
  }

  // Persistir los datos.
  guardar(
    INDICADORES_KEY,
    adminState.indicadores
  );
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
