import axios from 'axios';
import { useAuthStore } from '../store/auth.store';
import router from '../router';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const authStore = useAuthStore();
  if (!['get', 'head', 'options'].includes(config.method ?? 'get') && authStore.csrfToken) {
    config.headers.set('X-CSRF-Token', authStore.csrfToken);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && error.response.data?.codigo !== 'CREDENCIALES_INVALIDAS') {
      useAuthStore().$reset();
      if (router.currentRoute.value.name !== 'Login') {
        void router.replace({ name: 'Login' });
      }
    }
    return Promise.reject(error);
  },
);

export default api;
