
export type RolUsuario =
  | 'administrador'
  | 'captura'
  | 'seguimiento'
  | 'consulta';

export type EstadoUsuario = 'Activo' | 'Inactivo';

export interface UsuarioAdmin {
  id: string;
  nombre: string;
  correo: string;
  dependencia: string;
  rol: RolUsuario;
  estado: EstadoUsuario;
  creadoEn: string;
}

export interface PermisoSistema {
  id: string;
  modulo: string;
  operacion: string;
  roles: RolUsuario[];
}

export const nombresRoles: Record<RolUsuario, string> = {
  administrador: 'Administrador',
  captura: 'Capturista',
  seguimiento: 'Seguimiento',
  consulta: 'Consulta'
};

export const roles: RolUsuario[] = [
  'administrador',
  'captura',
  'seguimiento',
  'consulta'
];

// Matriz ilustrativa para el prototipo.
// NO concede permisos reales ni sustituye
// las autorizaciones que implementará la API.
export const permisosPrototipo: PermisoSistema[] = [
  {
    id: 'consultar',
    modulo: 'Consulta',
    operacion: 'Consultar fichas e indicadores',
    roles: [
      'administrador',
      'captura',
      'seguimiento',
      'consulta'
    ]
  },
  {
    id: 'estadisticas',
    modulo: 'Estadísticas',
    operacion: 'Consultar catálogo y estadísticas generales',
    roles: [
      'administrador',
      'captura',
      'seguimiento',
      'consulta'
    ]
  },
  {
    id: 'capturar',
    modulo: 'Captura',
    operacion: 'Registrar información municipal',
    roles: ['captura']
  },
  {
    id: 'borrador',
    modulo: 'Captura',
    operacion: 'Guardar y editar borradores propios',
    roles: ['captura']
  },
  {
    id: 'enviar',
    modulo: 'Captura',
    operacion: 'Enviar registros a revisión',
    roles: ['captura']
  },
  {
    id: 'revisar',
    modulo: 'Seguimiento',
    operacion: 'Revisar expedientes',
    roles: ['seguimiento']
  },
  {
    id: 'observar',
    modulo: 'Seguimiento',
    operacion: 'Emitir observaciones',
    roles: ['seguimiento']
  },
  {
    id: 'validar',
    modulo: 'Seguimiento',
    operacion: 'Validar expedientes revisados',
    roles: ['seguimiento']
  },
  {
    id: 'usuarios',
    modulo: 'Administración',
    operacion: 'Administrar usuarios y roles',
    roles: ['administrador']
  },
  {
    id: 'configuracion',
    modulo: 'Administración',
    operacion: 'Configurar parámetros institucionales',
    roles: ['administrador']
  }
];
