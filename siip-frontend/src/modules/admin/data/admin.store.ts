
import { reactive } from 'vue';

// =====================================================
// TIPOS Y ROLES
// =====================================================

export type RolGestionable =
  | 'consulta'
  | 'captura'
  | 'seguimiento';

export interface UsuarioAdmin {
  id: string;
  nombre: string;
  correo: string;
  dependencia: string;
  rol: RolGestionable;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

export interface IndicadorAdmin {
  id: string;
  campos: Record<string, string>;
  creadoEn: string;
  actualizadoEn: string;
}

// =====================================================
// CLAVES DE ALMACENAMIENTO
// =====================================================

// Se conservan las claves originales para no perder
// los usuarios e indicadores previamente registrados.

const USUARIOS_KEY = 'siip-admin-usuarios-v1';
const INDICADORES_KEY = 'siip-admin-indicadores-v1';

// =====================================================
// FUNCIONES DE ALMACENAMIENTO
// =====================================================

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

// =====================================================
// ESTADO REACTIVO
// =====================================================

export const adminState = reactive({
  usuarios: leer<UsuarioAdmin>(USUARIOS_KEY),
  indicadores: leer<IndicadorAdmin>(
    INDICADORES_KEY
  )
});

// =====================================================
// ACTUALIZAR DATOS
// =====================================================

export function refrescarAdmin() {
  adminState.usuarios = leer<UsuarioAdmin>(
    USUARIOS_KEY
  );

  adminState.indicadores = leer<IndicadorAdmin>(
    INDICADORES_KEY
  );
}

// =====================================================
// REGISTRAR / EDITAR USUARIO
// =====================================================

export function guardarUsuario(
  datos: Pick<
    UsuarioAdmin,
    | 'nombre'
    | 'correo'
    | 'dependencia'
    | 'rol'
    | 'activo'
  >,
  id?: string
) {
  // Normalizar los datos recibidos.
  const nombre = datos.nombre.trim();

  const correo = datos.correo
    .trim()
    .toLowerCase();

  const dependencia = datos.dependencia.trim();

  // -------------------------------------------------
  // VALIDACIÓN: NOMBRE
  // -------------------------------------------------

  if (nombre.length < 3) {
    throw new Error(
      'Escribe el nombre completo del usuario.'
    );
  }

  // -------------------------------------------------
  // VALIDACIÓN: CORREO
  // -------------------------------------------------

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)
  ) {
    throw new Error(
      'Ingresa un correo electrónico válido.'
    );
  }

  // -------------------------------------------------
  // VALIDACIÓN: DEPENDENCIA
  // -------------------------------------------------

  if (dependencia.length < 3) {
    throw new Error(
      'Escribe una dependencia válida.'
    );
  }

  // -------------------------------------------------
  // VALIDACIÓN: ROL
  // -------------------------------------------------

  const rolesPermitidos: RolGestionable[] = [
    'consulta',
    'captura',
    'seguimiento'
  ];

  if (!rolesPermitidos.includes(datos.rol)) {
    throw new Error(
      'El rol seleccionado no está permitido.'
    );
  }

  // -------------------------------------------------
  // VALIDACIÓN: CORREO DUPLICADO
  // -------------------------------------------------

  const correoDuplicado = adminState.usuarios.some(
    usuario =>
      usuario.correo.toLowerCase() === correo &&
      usuario.id !== id
  );

  if (correoDuplicado) {
    throw new Error(
      'Ya existe un usuario con este correo.'
    );
  }

  const fecha = new Date().toISOString();

  // -------------------------------------------------
  // EDITAR USUARIO
  // -------------------------------------------------

  if (id) {
    const indice = adminState.usuarios.findIndex(
      usuario => usuario.id === id
    );

    if (indice < 0) {
      throw new Error(
        'No se encontró el usuario.'
      );
    }

    const actual = adminState.usuarios[indice];

    adminState.usuarios[indice] = {
      ...actual,
      nombre,
      correo,
      dependencia,
      rol: datos.rol,
      activo: datos.activo,
      actualizadoEn: fecha
    };

  // -------------------------------------------------
  // REGISTRAR USUARIO NUEVO
  // -------------------------------------------------

  } else {
    adminState.usuarios.unshift({
      id: crypto.randomUUID(),
      nombre,
      correo,
      dependencia,
      rol: datos.rol,
      activo: datos.activo,
      creadoEn: fecha,
      actualizadoEn: fecha
    });
  }

  // Persistir los datos.
  guardar(
    USUARIOS_KEY,
    adminState.usuarios
  );
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
