import axios from 'axios';
import { defineStore } from 'pinia';
import api from '../core/api';

export interface User {
  id: string;
  nombre: string;
  correo: string;
  rol: 'captura' | 'revision' | 'administrador';
  dependencia_id: string | null;
}

interface SessionResponse {
  usuario: User | null;
  csrf_token: string;
}

interface AuthState {
  user: User | null;
  csrfToken: string | null;
  initialized: boolean;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    csrfToken: null,
    initialized: false,
  }),

  getters: {
    isAuthenticated: (state) => state.user !== null,
    isCapturista: (state) => state.user?.rol === 'captura',
    isRevisor: (state) => state.user?.rol === 'revision',
    isAdmin: (state) => state.user?.rol === 'administrador',
  },

  actions: {
    async initAuth() {
      const { data } = await api.get<SessionResponse>('/auth/sesion');
      this.user = data.usuario;
      this.csrfToken = data.csrf_token;
      this.initialized = true;
    },

    async login(correo: string, password: string) {
      await this.initAuth();
      const { data } = await api.post<SessionResponse>('/auth/sesion', { correo, password });
      this.user = data.usuario;
      this.csrfToken = data.csrf_token;
    },

    async logout() {
      try {
        await this.initAuth();
        if (this.user) await api.delete('/auth/sesion');
      } catch (error) {
        if (!axios.isAxiosError(error) || error.response?.status !== 401) throw error;
      }
      this.$reset();
    },
  },
});
