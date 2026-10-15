<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../store/auth.store';

const router = useRouter();
const authStore = useAuthStore();

// Estado reactivo para controlar si el menú está abierto o cerrado
const isMenuOpen = ref(false);

const handleLogout = () => {
  authStore.logout();
  router.push('/login');
};
</script>

<template>
  <div class="min-h-screen flex flex-col bg-gray-50 text-ink">
    
    <!-- Header Híbrido Superior -->
    <header class="bg-white pt-6 px-8 flex flex-col gap-6">
      
      <!-- Fila 1: Branding institucional y Usuario -->
      <div class="flex justify-between items-center">
        <!-- Lado Izquierdo: Logos y Títulos -->
        <div class="flex items-center gap-5">
          <h1 class="text-3xl font-extrabold text-wine tracking-tight">SIIP Salamanca</h1>
          <div class="h-10 w-px bg-wine opacity-40"></div>
          <div class="flex flex-col">
            <h2 class="text-xl font-bold text-wine">Sistema Integrado de Indicadores de Planeación</h2>
          </div>
        </div>

        <!-- Lado Derecho: Badge de Demo y Menú de Usuario -->
        <div class="flex items-center gap-6">
          
          <!-- Contenedor relativo para el Dropdown -->
          <div class="relative border-l border-gray-300 pl-6">
            
            <!-- Botón Outlined -->
            <button 
              @click="isMenuOpen = !isMenuOpen"
              class="flex items-center gap-3 border border-wine text-wine px-4 py-1.5 rounded hover:bg-wine/5 transition-colors focus:outline-none"
            >
              <!-- Solo el nombre -->
              <span class="text-sm font-bold">{{ authStore.user?.name || 'Usuario' }}</span>
              
              <!-- Línea divisoria interna -->
              <div class="h-4 w-px bg-wine opacity-40"></div>
              
              <!-- Pico apuntando abajo (SVG Heroicons) -->
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                class="h-4 w-4 transition-transform duration-200" 
                :class="{ 'rotate-180': isMenuOpen }"
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <!-- Menú Desplegable (Dropdown) -->
            <div 
              v-show="isMenuOpen" 
              class="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded shadow-lg py-1 z-50"
              @click="isMenuOpen = false" 
            >
              <a href="#" class="block px-4 py-2 text-sm text-ink hover:bg-gray-100 transition-colors">Configuración</a>
              <a href="#" class="block px-4 py-2 text-sm text-ink hover:bg-gray-100 transition-colors">Ayuda</a>
              
              <div class="border-t border-gray-200 my-1"></div>
              
              <button 
                @click="handleLogout" 
                class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors font-semibold"
              >
                Cerrar Sesión
              </button>
            </div>

            <!-- Overlay invisible para cerrar el menú al hacer clic afuera -->
            <div 
              v-if="isMenuOpen" 
              @click="isMenuOpen = false"
              class="fixed inset-0 z-40"
            ></div>

          </div>
        </div>
      </div>

      <!-- Fila 2: Navegación Horizontal -->
      <nav class="flex gap-2 border-b-4 border-wine">
        <router-link to="/estadisticas" class="nav-link" active-class="active-tab">Estadísticas</router-link>
        <router-link to="/" class="nav-link" active-class="active-tab" exact>Consulta</router-link>
        <router-link v-if="authStore.isCapturista || authStore.isAdmin" to="/captura" class="nav-link" active-class="active-tab">Captura</router-link>
        <router-link v-if="authStore.isRevisor || authStore.isAdmin" to="/seguimiento" class="nav-link" active-class="active-tab">Seguimiento</router-link>
        <router-link v-if="authStore.isAdmin" to="/administrador" class="nav-link" active-class="active-tab">Administrador</router-link>
      </nav>
    </header>

    <!-- Área inyectable -->
    <main class="p-8 flex-1 overflow-y-auto">
      <router-view></router-view>
    </main>

  </div>
</template>

<style scoped>
.nav-link {
  @apply px-6 py-3 rounded-t-xl font-bold transition-all duration-200 text-wine bg-white;
}
.nav-link:hover:not(.active-tab) {
  @apply bg-wine/5;
}
.active-tab {
  @apply bg-wine text-white;
}
</style>