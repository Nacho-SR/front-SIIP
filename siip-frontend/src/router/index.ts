
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

      {
        path: '',
        name: 'Consulta',
        component: () =>
          import('../modules/consulta/ConsultaView.vue')
      },

      // ======================================
      // CAPTURA
      // ======================================

      {
        path: 'captura',
        name: 'Captura',
        component: () =>
          import('../modules/capture/CaptureView.vue'),

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
              import('../modules/review/ReviewView.vue')
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
          import('../modules/admin/AdminView.vue'),

        meta: {
          requiredRoles: ['administrador']
        },

        children: [
          {
            path: '',
            name: 'Administrador',
            redirect: {
              name: 'AdministradorUsuarios'
            }
          },

          {
            path: 'usuarios',
            name: 'AdministradorUsuarios',
            component: () =>
              import(
                '../modules/admin/AdminUsuariosView.vue'
              )
          },

          {
            path: 'dependencias',
            name: 'AdministradorDependencias',
            component: () =>
              import(
                '../modules/admin/AdminDependenciasView.vue'
              )
          },

          {
            path: 'indicadores',
            name: 'AdministradorIndicadores',
            component: () =>
              import(
                '../modules/admin/AdminIndicadoresView.vue'
              )
          },

          {
            path: 'agrupaciones',
            name: 'AdministradorAgrupaciones',
            component: () =>
              import(
                '../modules/admin/AdminAgrupacionesView.vue'
              )
          },

          {
            path: 'familias',
            name: 'AdministradorFamilias',
            component: () =>
              import(
                '../modules/admin/AdminFamiliasView.vue'
              )
          },

          {
            path: 'indicadores/nuevo',
            name: 'AdministradorNuevoIndicador',
            component: () =>
              import(
                '../modules/admin/NuevoIndicadorView.vue'
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
  // el usuario debe poder abrirlas.

  const rutasPublicas = [
    'Login',
    'RecuperarContrasena',
    'RestablecerContrasena'
  ];

  const rutaPublica = rutasPublicas.includes(
    String(to.name ?? '')
  );

  // ------------------------------------------
  // COMPROBAR SESIÓN
  // ------------------------------------------

  if (!authStore.initialized) {
    try {
      await authStore.initAuth();
    } catch {
      if (!rutaPublica) {
        return { name: 'Login' };
      }
    }
  }

  // ------------------------------------------
  // RUTAS PROTEGIDAS
  // ------------------------------------------

  if (
    !rutaPublica &&
    to.matched.some(
      record => record.meta.requiresAuth
    ) &&
    !authStore.isAuthenticated
  ) {
    return { name: 'Login' };
  }

  // ------------------------------------------
  // USUARIO YA AUTENTICADO
  // ------------------------------------------

  if (
    to.name === 'Login' &&
    authStore.isAuthenticated
  ) {
    return { name: 'Consulta' };
  }

  // ------------------------------------------
  // PERMISOS POR ROL
  // ------------------------------------------

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
