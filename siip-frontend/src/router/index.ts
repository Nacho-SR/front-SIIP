import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
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
        path: '',
        name: 'Consulta', 
        component: () => import('../modules/dashboard/DashboardView.vue'),
        // Todos los usuarios autenticados pueden ver la pantalla de consulta por defecto
      },
      {
        path: 'captura',
        name: 'Captura',
        component: () => import('../modules/capture/CaptureView.vue'),
        // Protegemos la ruta: solo capturistas y administradores pueden entrar
        meta: { requiredRoles: ['captura', 'administrador'] }
      },
      {
        path: 'seguimiento',
        name: 'Seguimiento',
        component: () => import('../modules/review/ReviewView.vue'),
        // Solo revisores y administradores
        meta: { requiredRoles: ['seguimiento', 'administrador'] }
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
  history: createWebHistory(),
  routes
});

// GUARDIÁN DE NAVEGACIÓN (Navigation Guard)
// Este código se ejecuta SIEMPRE antes de cambiar de pantalla
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  
  // 1. Verificamos si la ruta requiere autenticación y el usuario no tiene token
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return next({ name: 'Login' }); // Lo pateamos al login
  }

  // 2. Verificamos permisos basados en roles (Control de Acceso)
  if (to.meta.requiredRoles) {
    const roles = to.meta.requiredRoles as string[];
    // Si el usuario existe pero su rol no está en la lista de permitidos
    if (authStore.user && !roles.includes(authStore.user.role)) {
      console.warn(`Acceso denegado. Rol actual: ${authStore.user.role}. Requerido: ${roles.join(' o ')}`);
      return next({ name: 'Consulta' }); // Lo regresamos al dashboard público
    }
  }

  // 3. Si pasa todas las validaciones, lo dejamos pasar
  next(); 
});

export default router;