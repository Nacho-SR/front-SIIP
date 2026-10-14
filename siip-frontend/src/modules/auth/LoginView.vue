<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../store/auth.store';

// Instanciamos el router y nuestro store
const router = useRouter();
const authStore = useAuthStore();

// Estados locales para el formulario
const email = ref('');
const password = ref('');
const errorMsg = ref('');

const handleLogin = async () => {
  try {
    errorMsg.value = '';
    // Disparamos la acción de Pinia (que por ahora asigna el rol de 'administrador')
    await authStore.login(email.value, password.value);
    
    // Si la promesa se resuelve correctamente, redirigimos a la ruta base '/'
    router.push('/');
  } catch (error) {
    errorMsg.value = 'Ocurrió un error al intentar acceder.';
  }
};
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100">
    <!-- Tarjeta de Login -->
    <div class="bg-white p-8 rounded shadow-md w-full max-w-md border-t-4 border-wine">
      <h1 class="text-2xl text-wine font-bold text-center mb-6">Acceso SIIP</h1>
      
      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block text-ink text-sm font-bold mb-1">Correo Electrónico</label>
          <input 
            v-model="email" 
            type="email" 
            required 
            class="w-full border border-gray-300 p-2 rounded focus:outline-none focus:border-wine" 
            placeholder="usuario@salamanca.tecnm.mx" 
          />
        </div>
        
        <div>
          <label class="block text-ink text-sm font-bold mb-1">Contraseña</label>
          <input 
            v-model="password" 
            type="password" 
            required 
            class="w-full border border-gray-300 p-2 rounded focus:outline-none focus:border-wine" 
            placeholder="••••••••" 
          />
        </div>
        
        <div v-if="errorMsg" class="text-red-500 text-sm font-semibold">
          {{ errorMsg }}
        </div>
        
        <button 
          type="submit" 
          class="w-full bg-wine text-white font-bold py-2 px-4 rounded hover:bg-wine2 transition-colors">
          Ingresar
        </button>
      </form>
    </div>
  </div>
</template>