
import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw
} from 'vue-router';

import { useAuthStore } from '../store/auth.store';

// ============================================
// RUTAS DE LA APLICACIÓN
// ============================================

const routes: Array<RouteRecordRaw> = [

  // ==========================================
  // AUTENTICACIÓN
  // ==========================================

  {
    path: '/login',
    name: 'Login',
    component: () =>
      import('../modules/auth/LoginView.vue'),
    meta: {
      requiresAuth: false
    }
  },

  // ==========================================
  // RECUPERACIÓN DE CONTRASEÑA
  // ==========================================

  {
    path: '/recuperar-contrasena',
    name: 'RecuperarContrasena',
    component: () =>
      import(
        '../modules/auth/RecuperarContraseñaView.vue'
      ),
    meta: {
      requiresAuth: false
    }
  },

  {
    path: '/restablecer-contrasena',
    name: 'RestablecerContrasena',
    component: () =>
      import(
        '../modules/auth/RestablecerContraseñaView.vue'
      ),
    meta: {
      requiresAuth: false
    }
  },

  // ==========================================
  // PLATAFORMA PRINCIPAL
  // ==========================================

  {
    path: '/',
    name: 'MainLayout',
    component: () =>
      import('../layouts/MainLayout.vue'),

    meta: {
      requiresAuth: true
    },

    children: [

      // ======================================
      // ESTADÍSTICAS
      // ======================================

      {
        path: 'estadisticas',
        name: 'Estadisticas',
        component: () =>
          import(
            '../modules/dashboard/DashboardView.vue'
          )
      },

      {
        path: 'estadisticas/analisis',
        name: 'AnalisisIndicadores',
        component: () =>
          import(
            '../modules/dashboard/AnalisisIndicadoresView.vue'
          )
      },

      // ======================================
      // CONSULTA
      // ======================================

      {
        path: '',
        name: 'Consulta',
        component: () =>
          import(
            '../modules/consulta/ConsultaView.vue'
          )
      },

      // ======================================
      // CAPTURA
      // ======================================

      {
        path: 'captura',
        name: 'Captura',
        component: () =>
          import(
            '../modules/capture/CaptureView.vue'
          ),

        meta: {
          requiredRoles: ['captura']
        }
      },

      // ======================================
      // SEGUIMIENTO
      // ======================================

      {
        path: 'seguimiento',

        meta: {
          requiredRoles: ['revision']
        },

        children: [
          {
            path: '',
            name: 'Seguimiento',
            component: () =>
              import(
                '../modules/review/ReviewView.vue'
              )
          },

          {
            path: ':id',
            name: 'SeguimientoDetalle',
            component: () =>
              import(
                '../modules/review/ReviewDetailView.vue'
              )
          }
        ]
      },

      // ======================================
      // ADMINISTRACIÓN
      // ======================================

      {
        path: 'administrador',

        component: () =>
          import(
            '../modules/admin/AdminView.vue'
          ),

        meta: {
          requiredRoles: ['administrador']
        },

        children: [

          // ----------------------------------
          // REDIRECCIÓN PRINCIPAL
          // ----------------------------------

          {
            path: '',
            name: 'Administrador',
            redirect: {
              name: 'AdministradorUsuarios'
            }
          },

          // ----------------------------------
          // USUARIOS
          // ----------------------------------

          {
            path: 'usuarios',
            name: 'AdministradorUsuarios',
            component: () =>
              import(
                '../modules/admin/AdminUsuariosView.vue'
              )
          },

          // ----------------------------------
          // DEPENDENCIAS
          // ----------------------------------

          {
            path: 'dependencias',
            name: 'AdministradorDependencias',
            component: () =>
              import(
                '../modules/admin/AdminDependenciasView.vue'
              )
          },

          // ----------------------------------
          // INDICADORES
          // ----------------------------------

          {
            path: 'indicadores',
            name: 'AdministradorIndicadores',
            component: () =>
              import(
                '../modules/admin/AdminIndicadoresView.vue'
              )
          },

          // ----------------------------------
          // NUEVO / EDITAR INDICADOR
          // ----------------------------------

          {
            path: 'indicadores/nuevo',
            name: 'AdministradorNuevoIndicador',
            component: () =>
              import(
                '../modules/admin/NuevoIndicadorView.vue'
              )
          },

          // ----------------------------------
          // VARIABLES Y DEPENDENCIAS
          // ----------------------------------

          {
            path: 'indicadores/:id/variables',
            name: 'AdministradorVariablesIndicador',
            component: () =>
              import(
                '../modules/admin/VariablesIndicadorView.vue'
              )
          },

          // ----------------------------------
          // METODOLOGÍA
          // ----------------------------------

          {
            path: 'indicadores/:id/metodologia',
            name: 'AdministradorMetodologiaIndicador',
            component: () =>
              import(
                '../modules/admin/MetodologiaIndicadorView.vue'
              )
          },

          // ----------------------------------
          // ACTIVACIÓN DE INDICADORES
          // ----------------------------------

          {
            path: 'indicadores/:id/activacion',
            name: 'AdministradorActivacionIndicador',
            component: () =>
              import(
                '../modules/admin/ActivacionIndicadorView.vue'
              )
          },

          // ----------------------------------
          // AGRUPACIONES TEMÁTICAS
          // ----------------------------------

          {
            path: 'agrupaciones',
            name: 'AdministradorAgrupaciones',
            component: () =>
              import(
                '../modules/admin/AdminAgrupacionesView.vue'
              )
          },

          // ----------------------------------
          // FAMILIAS
          // ----------------------------------

          {
            path: 'familias',
            name: 'AdministradorFamilias',
            component: () =>
              import(
                '../modules/admin/AdminFamiliasView.vue'
              )
          }

        ]
      }
    ]
  }
];

// ============================================
// CREACIÓN DEL ROUTER
// ============================================

const router = createRouter({
  history: createWebHistory(
    import.meta.env.BASE_URL
  ),

  routes
});

// ============================================
// PROTECCIÓN DE RUTAS
// ============================================

router.beforeEach(async to => {
  const authStore = useAuthStore();

  // Las páginas de recuperación son públicas.
  // Aunque falle consultar la sesión,
  // deben permanecer accesibles.

  const rutasPublicas = [
    'Login',
    'RecuperarContrasena',
    'RestablecerContrasena'
  ];

  const rutaPublica = rutasPublicas.includes(
    String(to.name ?? '')
  );

  // ==========================================
  // COMPROBAR SESIÓN
  // ==========================================

  if (!authStore.initialized) {
    try {
      await authStore.initAuth();
    } catch {
      if (!rutaPublica) {
        return { name: 'Login' };
      }
    }
  }

  // ==========================================
  // RUTAS PROTEGIDAS
  // ==========================================

  if (
    !rutaPublica &&
    to.matched.some(
      record => record.meta.requiresAuth
    ) &&
    !authStore.isAuthenticated
  ) {
    return { name: 'Login' };
  }

  // ==========================================
  // USUARIO YA AUTENTICADO
  // ==========================================

  if (
    to.name === 'Login' &&
    authStore.isAuthenticated
  ) {
    return { name: 'Consulta' };
  }

  // ==========================================
  // PERMISOS POR ROL
  // ==========================================

  for (const record of to.matched) {
    const roles = record.meta.requiredRoles as
      | string[]
      | undefined;

    if (
      roles &&
      (
        !authStore.user ||
        !roles.includes(authStore.user.rol)
      )
    ) {
      return authStore.isAuthenticated
        ? { name: 'Consulta' }
        : { name: 'Login' };
    }
  }

  return true;
});

export default router;
