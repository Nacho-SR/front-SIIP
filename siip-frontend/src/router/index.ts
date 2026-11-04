import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '../store/auth.store';

// Definimos las rutas de la aplicación
const routes: Array<RouteRecordRaw> = [
  {
    path: '/login',
    name: 'Login',
    // Usamos "Lazy Loading" (carga perezosa) para que el código de la vista
    // solo se descargue cuando el usuario intente entrar a esta ruta.
    component: () => import('../modules/auth/LoginView.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    name: 'MainLayout',
    component: () => import('../layouts/MainLayout.vue'),
    meta: { requiresAuth: true }, // Todo lo que esté dentro de este layout requiere estar logueado
    children: [
      {
        path: 'estadisticas',
        name: 'Estadisticas', 
        // Esta será nuestra vista de gráficas y tarjetas (El HTML 1)
        component: () => import('../modules/dashboard/DashboardView.vue'),
      },
      {
        path: '',
        name: 'Consulta', 
        // Esta será nuestra vista de tablas con filtros
        component: () => import('../modules/consulta/ConsultaView.vue'), 
      },

      {
        path: 'captura',
        name: 'Captura',
        component: () => import('../modules/capture/CaptureView.vue'),
        meta: { requiredRoles: ['captura'] }
      },
      {
        path: 'seguimiento',
        meta: { requiredRoles: ['revision'] },
        children: [
          {
            path: '',
            name: 'Seguimiento',
            component: () => import('../modules/review/ReviewView.vue'),
          },
          {
            // Ruta dinámica que recibe el ID del indicador a revisar
            path: ':id',
            name: 'SeguimientoDetalle',
            component: () => import('../modules/review/ReviewDetailView.vue'),
          }
        ]
      },
      {
        path: 'administrador',
        name: 'Administrador',
        component: () => import('../modules/admin/AdminView.vue'),
        // Acceso exclusivo para administradores
        meta: { requiredRoles: ['administrador'] }
      }
    ]
  }
];

const router = createRouter({
  // Esto lee automáticamente el "base" de tu vite.config.ts
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();

  if (!authStore.initialized) {
    try {
      await authStore.initAuth();
    } catch {
      return to.name === 'Login' ? true : { name: 'Login' };
    }
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'Login' };
  }

  if (to.name === 'Login' && authStore.isAuthenticated) {
    return { name: 'Consulta' };
  }

  if (to.meta.requiredRoles) {
    const roles = to.meta.requiredRoles as string[];
    if (!authStore.user || !roles.includes(authStore.user.rol)) {
      return { name: 'Consulta' };
    }
  }
});

export default router;
