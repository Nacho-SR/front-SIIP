import { defineStore } from 'pinia';

// 1. Definimos la estructura de nuestro Usuario basado en los perfiles del SIIP
export interface User {
  id: number;
  name: string;
  role: 'captura' | 'seguimiento' | 'administrador' | 'consulta'; 
}

// 2. Definimos el estado de la autenticación
interface AuthState {
  user: User | null;
  token: string | null;
}

export const useAuthStore = defineStore('auth', {
  // STATE: Donde guardamos la información pura
  state: (): AuthState => ({
    user: null,
    token: null,
  }),

  // GETTERS: Propiedades computadas para facilitar las validaciones en el Router y los Componentes
  getters: {
    isAuthenticated: (state) => !!state.token,
    
    isCapturista: (state) => state.user?.role === 'captura',
    isRevisor: (state) => state.user?.role === 'seguimiento',
    isAdmin: (state) => state.user?.role === 'administrador',
    isConsultor: (state) => state.user?.role === 'consulta',
  },

  // ACTIONS: Funciones que modifican el estado (más adelante aquí conectaremos con Laravel)
  actions: {
    // Simularemos el login por ahora para poder avanzar con la interfaz
    async login(_email: string, _password: string) {
      try {
        // TODO: Reemplazar con llamada real a Axios/Laravel
        // const response = await api.post('/login', { email, password });
        // Simulación temporal para probar las rutas y permisos
        this.token = 'simulated-jwt-token-12345';
        this.user = {
          id: 1,
          name: 'Usuario Demo',
          role: 'administrador' // Cambiaremos esto para probar las distintas pantallas
        };
        
        // Guardar token en localStorage para que no se pierda al recargar la página
        localStorage.setItem('siip_token', this.token);
      } catch (error) {
        console.error('Error en login', error);
        throw error;
      }
    },

    logout() {
      this.user = null;
      this.token = null;
      localStorage.removeItem('siip_token');
      // Más adelante, aquí el router nos redirigirá al /login
    },

    // Función para recuperar la sesión si el usuario recarga la página
    initAuth() {
      const savedToken = localStorage.getItem('siip_token');
      if (savedToken) {
        this.token = savedToken;
        // Aquí idealmente haríamos una petición a Laravel (ej. /me) para recuperar los datos del usuario
        // Por ahora, simularemos que recuperamos al admin
        this.user = { id: 1, name: 'Usuario Recuperado', role: 'administrador' };
      }
    }
  }
});