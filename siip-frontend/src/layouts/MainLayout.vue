<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '../store/auth.store';

const router = useRouter();
const authStore = useAuthStore();

const handleLogout = () => {
  // Limpiamos el store y regresamos a la pantalla de login
  authStore.logout();
  router.push('/login');
};
</script>

<template>
  <div class="min-h-screen flex bg-gray-50 text-ink">
    
    <!-- Menú Lateral (Sidebar) -->
    <aside class="w-64 bg-navy text-white flex flex-col shadow-lg z-10">
      <!-- Encabezado del Menú -->
      <div class="p-4 bg-wine flex items-center justify-center">
        <h1 class="text-xl font-bold tracking-wider">SIIP Salamanca</h1>
      </div>
      
      <!-- Enlaces de Navegación Dinámicos -->
      <div class="p-4 flex-1">
        <p class="text-xs text-gray-400 uppercase tracking-wide mb-4">Navegación</p>
        <nav class="space-y-2">
          
          <!-- Consulta: Accesible para todos -->
          <router-link to="/" class="block px-4 py-2 rounded hover:bg-ink transition-colors" exact-active-class="bg-ink border-l-4 border-wine">
            Consulta
          </router-link>
          
          <!-- Captura: Visible para Captura y Admin -->
          <router-link v-if="authStore.isCapturista || authStore.isAdmin" to="/captura" class="block px-4 py-2 rounded hover:bg-ink transition-colors" exact-active-class="bg-ink border-l-4 border-wine">
            Captura
          </router-link>

          <!-- Seguimiento: Visible para Revisores y Admin -->
          <router-link v-if="authStore.isRevisor || authStore.isAdmin" to="/seguimiento" class="block px-4 py-2 rounded hover:bg-ink transition-colors" exact-active-class="bg-ink border-l-4 border-wine">
            Seguimiento
          </router-link>

          <!-- Administración: Solo Admin -->
          <router-link v-if="authStore.isAdmin" to="/administrador" class="block px-4 py-2 rounded hover:bg-ink transition-colors" exact-active-class="bg-ink border-l-4 border-wine">
            Administración
          </router-link>
          
        </nav>
      </div>

      <!-- Sección de Usuario y Logout -->
      <div class="p-4 bg-ink border-t border-gray-700">
        <div class="mb-3">
          <p class="text-sm font-bold truncate">{{ authStore.user?.name || 'Usuario' }}</p>
          <p class="text-xs text-gray-400 capitalize">{{ authStore.user?.role || 'Sin rol' }}</p>
        </div>
        <button @click="handleLogout" class="w-full text-left text-sm text-red-400 hover:text-red-300 transition-colors font-semibold">
          Cerrar Sesión
        </button>
      </div>
    </aside>

    <!-- Contenedor Principal (Donde cambian las pantallas) -->
    <div class="flex-1 flex flex-col h-screen overflow-hidden">
      <!-- Barra superior sencilla -->
      <header class="bg-white p-4 shadow-sm flex justify-between items-center z-0">
        <h2 class="text-lg font-semibold text-gray-700">Panel de Control</h2>
      </header>
      
      <!-- Área inyectable -->
      <main class="p-6 flex-1 overflow-y-auto bg-gray-50">
        <router-view></router-view>
      </main>
    </div>

  </div>
</template>