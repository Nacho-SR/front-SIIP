<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import axios from 'axios';
import api from '../../core/api';

interface Dependency { id: string; clave: string; nombre: string; activo: boolean; }
const dependencies = ref<Dependency[]>([]);
const loadingDependencies = ref(true);
const dependenciesError = ref('');
const dependencyForm = reactive({ clave: '', nombre: '' });
const savingDependency = ref(false);
const dependencyError = ref('');
const dependencySuccess = ref('');
const dependenciaCreada = ref<Dependency | null>(null);
function errorMessage(error: unknown) {
  return axios.isAxiosError(error)
    ? error.response?.data?.detail || 'No se pudo conectar con el servidor. Intenta de nuevo.'
    : 'No se pudo completar la solicitud. Intenta de nuevo.';
}
async function loadDependencies() {
  if (savingDependency.value) return;
  loadingDependencies.value = true;
  dependenciesError.value = '';
  try {
    const { data } = await api.get<Dependency[]>('/administracion/dependencias');
    dependencies.value = data;
  } catch (error) { dependenciesError.value = errorMessage(error); }
  finally { loadingDependencies.value = false; }
}
async function createDependency() {
  if (savingDependency.value || loadingDependencies.value || dependenciesError.value) return;
  savingDependency.value = true;
  dependencyError.value = '';
  dependencySuccess.value = '';
  dependenciaCreada.value = null;
  try {
    const { data } = await api.post<Dependency>('/administracion/dependencias', { ...dependencyForm });
    dependencies.value.push(data);
    dependencies.value.sort((a, b) => a.nombre.localeCompare(b.nombre));
    dependenciaCreada.value = data;
    dependencySuccess.value = 'Dependencia ' + data.clave + ' creada.';
    dependencyForm.clave = '';
    dependencyForm.nombre = '';
  } catch (error) { dependencyError.value = errorMessage(error); }
  finally { savingDependency.value = false; }
}
onMounted(() => { void loadDependencies(); });
</script>

<template>
<section class="panel" aria-labelledby="dependencias-titulo">
      <div class="panel-header">
        <div>
          <span class="eyebrow">ORGANIZACIÓN INSTITUCIONAL</span>
          <h2 id="dependencias-titulo">Dependencias</h2>
          <p>Registra una dependencia antes de asignarle usuarios de Captura o Revisión. Consulta no requiere dependencia.</p>
        </div>
      </div>

      <div v-if="dependenciesError">
        <p class="error" role="alert">{{ dependenciesError }}</p>
        <button type="button" class="btn-secundario" @click="loadDependencies">Reintentar carga</button>
      </div>

      <div v-if="dependenciaCreada" class="mensaje" role="status">
        <span>{{ dependencySuccess }}</span>
        <router-link :to="{ name: 'AdministradorUsuarios', query: { dependencia: dependenciaCreada.id } }">
          Crear usuario en esta dependencia
        </router-link>
      </div>
      <form class="modal-form formulario-dependencia" @submit.prevent="createDependency">
        <fieldset class="campos-form" :disabled="savingDependency || loadingDependencies || !!dependenciesError">
          <label>
            Clave
            <input v-model.trim="dependencyForm.clave" required maxlength="40" autocomplete="off" placeholder="Ej. PLAN" />
          </label>
          <label>
            Nombre de la dependencia
            <input v-model.trim="dependencyForm.nombre" required maxlength="200" autocomplete="off" placeholder="Ej. Dirección de Planeación" />
          </label>
        </fieldset>
        <p v-if="dependencyError" class="error" role="alert">{{ dependencyError }}</p>
        <p v-if="dependencySuccess" class="mensaje" role="status">{{ dependencySuccess }}</p>
        <div>
          <button type="submit" class="btn-principal" :disabled="savingDependency || loadingDependencies || !!dependenciesError">
            {{ savingDependency ? 'Creando dependencia…' : 'Crear dependencia' }}
          </button>
        </div>
      </form>

      <div :aria-busy="loadingDependencies">
        <p v-if="loadingDependencies" class="nota" role="status">Cargando dependencias…</p>
        <p v-else-if="!dependenciesError && !dependencies.length" class="nota">
          Todavía no hay dependencias. Crea la primera para dar de alta Captura o Revisión.
        </p>
        <div v-else-if="!dependenciesError" class="tabla-scroll tabla-dependencias">
          <table>
            <caption class="nota">Dependencias activas</caption>
            <thead><tr><th>Clave</th><th>Nombre</th></tr></thead>
            <tbody>
              <tr v-for="dependency in dependencies" :key="dependency.id">
                <td><strong>{{ dependency.clave }}</strong></td>
                <td>{{ dependency.nombre }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
</template>
