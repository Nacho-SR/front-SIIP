import axios from 'axios';
import { useAuthStore } from '../store/auth.store';
import router from '../router';

// 1. Creación de la instancia base
const api = axios.create({
  // Buena práctica: Usar variables de entorno para la URL del backend
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  // Opcional: timeout para evitar que la app se quede colgada si el servidor de Laravel no responde
  timeout: 10000, 
});

// 2. Interceptor de Peticiones (Request) - "La puerta de salida"
api.interceptors.request.use(
  (config) => {
    // Instanciamos el store AQUÍ adentro para evitar errores de inicialización de Pinia
    const authStore = useAuthStore();
    
    // Si tenemos un token guardado, lo inyectamos en la cabecera Authorization
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 3. Interceptor de Respuestas (Response) - "La puerta de entrada"
api.interceptors.response.use(
  (response) => {
    // Si la respuesta es exitosa (200-299), la dejamos pasar sin tocarla
    return response;
  },
  (error) => {
    if (error.response) {
      const { status } = error.response;
      const authStore = useAuthStore();

      // Detectamos si Laravel nos rechaza por token inválido (401) o falta de permisos (403)
      if (status === 401 || status === 403) {
        console.warn('Sesión expirada o acceso denegado. Cerrando sesión por seguridad.');
        
        authStore.logout();
        
        // Evitamos redirecciones redundantes si ya estamos en el login
        if (router.currentRoute.value.name !== 'Login') {
          router.push('/login');
        }
      }
      
      // Aquí también podríamos capturar errores 500 para mostrar una notificación global de PrimeVue en el futuro
    }
    
    return Promise.reject(error);
  }
);

export default api;