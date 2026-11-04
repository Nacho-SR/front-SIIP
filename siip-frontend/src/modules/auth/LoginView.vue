<script setup lang="ts">
import { ref } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../store/auth.store';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const errorMsg = ref('');
const isLoading = ref(false);

const handleLogin = async () => {
  if (isLoading.value) return;
  isLoading.value = true;
  try {
    errorMsg.value = '';
    await authStore.login(email.value, password.value);
    password.value = '';
    await router.replace('/');
  } catch (error) {
    errorMsg.value = axios.isAxiosError(error)
      ? error.response?.data?.detail || 'No se pudo conectar con el servidor. Intenta de nuevo.'
      : 'Ocurrió un error al intentar acceder.';
  } finally {
    isLoading.value = false;
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
          <label for="correo" class="block text-ink text-sm font-bold mb-1">Correo Electrónico</label>
          <input 
            id="correo"
            v-model="email" 
            type="email" 
            autocomplete="username"
            maxlength="255"
            required 
            class="w-full border border-gray-300 p-2 rounded focus:outline-none focus:border-wine" 
            placeholder="usuario@salamanca.tecnm.mx" 
          />
        </div>
        
        <div>
          <label for="password" class="block text-ink text-sm font-bold mb-1">Contraseña</label>
          <input 
            id="password"
            v-model="password" 
            type="password" 
            autocomplete="current-password"
            maxlength="1024"
            required 
            class="w-full border border-gray-300 p-2 rounded focus:outline-none focus:border-wine" 
            placeholder="••••••••" 
          />
        </div>
        
        <div v-if="errorMsg" role="alert" class="text-red-500 text-sm font-semibold">
          {{ errorMsg }}
        </div>
        
        <button 
          type="submit" 
          :disabled="isLoading"
          class="w-full bg-wine text-white font-bold py-2 px-4 rounded hover:bg-wine2 transition-colors">
          {{ isLoading ? 'Ingresando…' : 'Ingresar' }}
        </button>
      </form>
    </div>
  </div>
</template>
