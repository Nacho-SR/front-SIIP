<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import axios from 'axios';
import api from '../../core/api';
import type { User } from '../../store/auth.store';

interface Dependency {
  id: string;
  clave: string;
  nombre: string;
  activo: boolean;
}

const dependencies = ref<Dependency[]>([]);
const loadingDependencies = ref(true);
const dependenciesError = ref('');
const userForm = reactive({ nombre: '', correo: '', password: '', rol: 'captura', dependencia_id: '' });
const requiresDependency = computed(() => userForm.rol !== 'consulta');
const dependencyUnavailable = computed(() => requiresDependency.value
  && (loadingDependencies.value || !!dependenciesError.value || !dependencies.value.length));
const dependencyForm = reactive({ clave: '', nombre: '' });
const savingUser = ref(false);
const savingDependency = ref(false);
const userError = ref('');
const dependencyError = ref('');
const userSuccess = ref('');
const dependencySuccess = ref('');

function errorMessage(error: unknown) {
  return axios.isAxiosError(error)
    ? error.response?.data?.detail || 'No se pudo conectar con el servidor. Intenta de nuevo.'
    : 'No se pudo completar la solicitud. Intenta de nuevo.';
}

async function loadDependencies() {
  loadingDependencies.value = true;
  dependenciesError.value = '';
  try {
    const { data } = await api.get<Dependency[]>('/administracion/dependencias');
    dependencies.value = data;
  } catch (error) {
    dependenciesError.value = errorMessage(error);
  } finally {
    loadingDependencies.value = false;
  }
}

async function createUser() {
  if (savingUser.value || (requiresDependency.value && (loadingDependencies.value || dependenciesError.value))) return;
  userError.value = '';
  userSuccess.value = '';
  if (requiresDependency.value && !dependencies.value.some(({ id }) => id === userForm.dependencia_id)) {
    userError.value = 'Selecciona una dependencia activa.';
    return;
  }
  savingUser.value = true;
  try {
    const { data } = await api.post<User>('/administracion/usuarios', {
      ...userForm, dependencia_id: requiresDependency.value ? userForm.dependencia_id : null,
    });
    userSuccess.value = `Usuario ${data.nombre} creado. Ya puede iniciar sesión con su correo.`;
    userForm.nombre = '';
    userForm.correo = '';
  } catch (error) {
    userError.value = errorMessage(error);
  } finally {
    userForm.password = '';
    savingUser.value = false;
  }
}

async function createDependency() {
  if (savingDependency.value || loadingDependencies.value || dependenciesError.value) return;
  savingDependency.value = true;
  dependencyError.value = '';
  dependencySuccess.value = '';
  try {
    const { data } = await api.post<Dependency>('/administracion/dependencias', { ...dependencyForm });
    dependencies.value.push(data);
    dependencies.value.sort((a, b) => a.nombre.localeCompare(b.nombre));
    userForm.dependencia_id = data.id;
    dependencySuccess.value = `Dependencia ${data.clave} creada y seleccionada para el alta de usuario.`;
    dependencyForm.clave = '';
    dependencyForm.nombre = '';
  } catch (error) {
    dependencyError.value = errorMessage(error);
  } finally {
    savingDependency.value = false;
  }
}

onMounted(loadDependencies);
</script>

<template>
  <section class="mx-auto max-w-6xl">
    <header class="mb-6">
      <h1 class="text-2xl font-bold text-wine">Usuarios y dependencias</h1>
      <p class="mt-2 text-sm text-gray-600">Altas de Captura, Revisión y Consulta para el SIIP Salamanca.</p>
    </header>

    <!-- Dos columnas comparten 24px de separación; en móvil se apilan sin ancho fijo. -->
    <div class="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <section class="rounded-md border border-gray-200 bg-white p-6" aria-labelledby="new-user-title">
        <h2 id="new-user-title" class="text-lg font-semibold">Alta de usuario</h2>
        <p class="mt-1 text-sm text-gray-600">Captura y Revisión requieren una dependencia activa. Consulta no requiere dependencia.</p>

        <form class="mt-6 space-y-4" @submit.prevent="createUser">
          <fieldset class="space-y-4" :disabled="savingUser">
            <div>
              <label for="user-name" class="field-label">Nombre completo</label>
              <input id="user-name" v-model.trim="userForm.nombre" class="field" required maxlength="200" autocomplete="name" />
            </div>
            <div>
              <label for="user-email" class="field-label">Correo electrónico</label>
              <input id="user-email" v-model.trim="userForm.correo" class="field" type="email" required maxlength="255" autocomplete="off" />
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label for="user-role" class="field-label">Rol</label>
                <select id="user-role" v-model="userForm.rol" class="field" required>
                  <option value="captura">Captura</option>
                  <option value="revision">Revisión</option>
                  <option value="consulta">Consulta</option>
                </select>
              </div>
              <div v-if="requiresDependency">
                <label for="user-dependency" class="field-label">Dependencia</label>
                <select id="user-dependency" v-model="userForm.dependencia_id" class="field" required :disabled="loadingDependencies || !!dependenciesError">
                  <option disabled value="">{{ loadingDependencies ? 'Cargando…' : 'Selecciona una dependencia' }}</option>
                  <option v-for="dependency in dependencies" :key="dependency.id" :value="dependency.id">{{ dependency.clave }} — {{ dependency.nombre }}</option>
                </select>
              </div>
            </div>
            <p class="text-sm text-gray-600">Captura aporta información de su dependencia. Revisión consulta globalmente, revisa y valida. Consulta tiene acceso global de lectura, sin dependencia ni acciones de captura, revisión o administración.</p>
            <div>
              <label for="user-password" class="field-label">Contraseña inicial</label>
              <input id="user-password" v-model="userForm.password" class="field" type="password" required minlength="15" maxlength="1024" autocomplete="new-password" aria-describedby="password-help" />
              <p id="password-help" class="mt-2 text-sm text-gray-600">De 15 a 1024 caracteres. Compártela con la persona por un medio privado.</p>
            </div>
          </fieldset>
          <p v-if="userError" role="alert" class="text-sm text-red-700">{{ userError }}</p>
          <p v-if="userSuccess" role="status" class="text-sm text-green-800">{{ userSuccess }}</p>
          <button class="rounded-md bg-wine px-4 py-2 text-sm font-semibold text-white hover:bg-wine2 disabled:cursor-not-allowed disabled:bg-gray-600" type="submit" :disabled="savingUser || dependencyUnavailable">
            {{ savingUser ? 'Creando usuario…' : 'Crear usuario' }}
          </button>
        </form>
      </section>

      <section class="rounded-md border border-gray-200 bg-white p-6" aria-labelledby="dependencies-title">
        <h2 id="dependencies-title" class="text-lg font-semibold">Dependencias</h2>
        <p class="mt-1 text-sm text-gray-600">Registra una dependencia antes de asignarle usuarios.</p>

        <div v-if="dependenciesError" class="mt-4 text-sm">
          <p role="alert" class="text-red-700">{{ dependenciesError }}</p>
          <button class="mt-2 font-semibold text-wine underline" type="button" @click="loadDependencies">Reintentar carga</button>
        </div>

        <form class="mt-6 space-y-4" @submit.prevent="createDependency">
          <fieldset class="space-y-4" :disabled="savingDependency">
            <div>
              <label for="dependency-key" class="field-label">Clave</label>
              <input id="dependency-key" v-model.trim="dependencyForm.clave" class="field uppercase" required maxlength="40" autocomplete="off" />
            </div>
            <div>
              <label for="dependency-name" class="field-label">Nombre de la dependencia</label>
              <input id="dependency-name" v-model.trim="dependencyForm.nombre" class="field" required maxlength="200" autocomplete="off" />
            </div>
          </fieldset>
          <p v-if="dependencyError" role="alert" class="text-sm text-red-700">{{ dependencyError }}</p>
          <p v-if="dependencySuccess" role="status" class="text-sm text-green-800">{{ dependencySuccess }}</p>
          <button class="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold hover:border-wine disabled:cursor-not-allowed disabled:text-gray-600" type="submit" :disabled="savingDependency || loadingDependencies || !!dependenciesError">
            {{ savingDependency ? 'Creando dependencia…' : 'Crear dependencia' }}
          </button>
        </form>

        <div class="mt-6 border-t border-gray-200 pt-4" :aria-busy="loadingDependencies">
          <h3 class="text-sm font-semibold">Dependencias activas</h3>
          <p v-if="loadingDependencies" role="status" class="mt-3 text-sm text-gray-600">Cargando dependencias…</p>
          <p v-else-if="!dependenciesError && !dependencies.length" class="mt-3 text-sm text-gray-600">Todavía no hay dependencias. Crea la primera para dar de alta Captura o Revisión. Consulta no necesita dependencia.</p>
          <ul v-else-if="!dependenciesError" class="mt-2 max-h-64 divide-y divide-gray-100 overflow-y-auto">
            <li v-for="dependency in dependencies" :key="dependency.id" class="py-3 text-sm">
              <span class="font-medium text-wine">{{ dependency.clave }}</span>
              <span class="ml-2 break-words text-gray-600">{{ dependency.nombre }}</span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.field-label {
  @apply mb-2 block text-sm font-medium;
}
.field {
  @apply min-h-10 w-full min-w-0 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-wine focus:outline-none focus:ring-1 focus:ring-wine disabled:bg-gray-100;
}
</style>
