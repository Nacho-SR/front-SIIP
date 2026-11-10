<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import axios from 'axios';
import { useRoute } from 'vue-router';
import api from '../../core/api';
import { obtenerIndicadorAdmin, type IndicadorAdmin } from './data/admin.store';

interface Dependency { id: string; clave: string; nombre: string; activo: boolean; }
interface Variable {
  id?: string; codigo: string; descripcion: string; unidadMedida: string;
  tipoDato: 'entero' | 'decimal'; dependenciaId: string | null;
  dependenciaNombre?: string | null; dependenciaActiva?: boolean | null;
}
interface Configuration { indicadorId: string; version: number; variables: Variable[]; }
const route = useRoute();
const indicador = ref<IndicadorAdmin | null>(null);
const variables = ref<Variable[]>([]);
const dependencias = ref<Dependency[]>([]);
const version = ref(0);
const cargando = ref(true);
const guardando = ref(false);
const error = ref('');
const mensaje = ref('');
const original = ref('');
const id = String(route.params.id);
const endpoint = '/administracion/indicadores/' + encodeURIComponent(id) + '/variables';
const entradas = () => variables.value.map(variable => ({
  ...(variable.id ? { id: variable.id } : {}), codigo: variable.codigo.trim().toUpperCase(),
  descripcion: variable.descripcion.trim(), unidadMedida: variable.unidadMedida.trim(),
  tipoDato: variable.tipoDato, dependenciaId: variable.dependenciaId,
}));
const hayCambios = computed(() => JSON.stringify(entradas()) !== original.value);
function errorMessage(cause: unknown) {
  return axios.isAxiosError(cause) ? cause.response?.data?.detail || 'No se pudo conectar con el servidor. Reintenta sin perder tus cambios.'
    : cause instanceof Error ? cause.message : 'No se pudo completar la operación.';
}
function aplicar(data: Configuration) {
  variables.value = data.variables;
  version.value = data.version;
  original.value = JSON.stringify(entradas());
}
async function cargar() {
  if (guardando.value) return;
  cargando.value = true; error.value = ''; mensaje.value = '';
  try {
    const [ficha, configuration, dependencies] = await Promise.all([
      obtenerIndicadorAdmin(id), api.get<Configuration>(endpoint), api.get<Dependency[]>('/administracion/dependencias'),
    ]);
    indicador.value = ficha;
    dependencias.value = dependencies.data;
    aplicar(configuration.data);
  } catch (cause) { error.value = errorMessage(cause); }
  finally { cargando.value = false; }
}
function agregar() {
  variables.value.push({ codigo: '', descripcion: '', unidadMedida: '', tipoDato: 'entero', dependenciaId: null });
  mensaje.value = '';
}
async function guardar() {
  if (guardando.value || cargando.value || !indicador.value || indicador.value.activo || !hayCambios.value || !variables.value.length) return;
  error.value = ''; mensaje.value = '';
  const datos = entradas();
  if (new Set(datos.map(variable => variable.codigo)).size !== datos.length) {
    error.value = 'Cada variable debe tener un código distinto.'; return;
  }
  guardando.value = true;
  try {
    const { data } = await api.put<Configuration>(endpoint, { version: version.value, variables: datos });
    aplicar(data);
    mensaje.value = 'Variables y dependencias guardadas. El indicador continúa inactivo.';
  } catch (cause) { error.value = errorMessage(cause); }
  finally { guardando.value = false; }
}
onMounted(() => { void cargar(); });
</script>

<template>
  <section class="panel variables-indicador">
    <router-link :to="{ name: 'AdministradorIndicadores' }">← Regresar a Indicadores</router-link>
    <div class="panel-header">
      <div>
        <span class="eyebrow">CONFIGURACIÓN DEL INDICADOR</span>
        <h2>Variables y dependencias</h2>
        <p v-if="indicador"><strong>{{ indicador.campos.clave }}</strong> — {{ indicador.campos.nombre }}</p>
      </div>
    </div>
    <p v-if="cargando" role="status">Cargando variables y dependencias…</p>
    <div v-if="error" class="error" role="alert">
      <p>{{ error }}</p>
      <button type="button" class="btn-secundario" :disabled="guardando || cargando" @click="cargar">
        Recargar configuración (descarta cambios sin guardar)
      </button>
    </div>
    <p v-if="mensaje" class="mensaje" role="status">{{ mensaje }}</p>
    <template v-if="indicador && !cargando">
      <p class="nota">Configura solo las entradas que aporta cada dependencia. El resultado calculado no se captura como variable.
        Una variable puede tener una dependencia responsable o quedar sin asignar.</p>
      <p v-if="indicador.activo" class="error">Este indicador está activo. Sus variables requieren un flujo de cambio de metodología.</p>
      <form @submit.prevent="guardar">
        <fieldset class="campos-form" :disabled="guardando || indicador.activo">
          <p v-if="!variables.length" class="nota">El indicador todavía no tiene entradas estructuradas. Agrega la primera variable.</p>
          <fieldset v-for="(variable, index) in variables" :key="variable.id ?? 'nueva-' + index" class="variable-fila">
            <legend>Variable {{ variable.codigo || index + 1 }}</legend>
            <div class="variable-campos">
              <label>Código
                <input v-model="variable.codigo" required maxlength="40" pattern="[A-Za-z][A-Za-z0-9_]{0,39}" :readonly="!!variable.id" placeholder="Ej. N" />
              </label>
              <label>Descripción
                <textarea v-model="variable.descripcion" required maxlength="2000" rows="3" :readonly="!!variable.id"></textarea>
              </label>
              <label>Unidad de medida
                <input v-model="variable.unidadMedida" required maxlength="200" :readonly="!!variable.id" placeholder="Ej. reportes" />
              </label>
              <label :class="{ 'campo-bloqueado': !!variable.id }">Tipo de dato
                <select v-model="variable.tipoDato" :disabled="!!variable.id">
                  <option value="entero">Entero (conteos)</option><option value="decimal">Decimal</option>
                </select>
              </label>
              <label>Dependencia responsable
                <select v-model="variable.dependenciaId">
                  <option :value="null">Sin asignar</option>
                  <option v-if="variable.dependenciaId && !dependencias.some(dependency => dependency.id === variable.dependenciaId)"
                    :value="variable.dependenciaId" disabled>{{ variable.dependenciaNombre || 'Dependencia anterior' }} (no disponible)</option>
                  <option v-for="dependency in dependencias" :key="dependency.id" :value="dependency.id">{{ dependency.clave }} — {{ dependency.nombre }}</option>
                </select>
              </label>
            </div>
            <button v-if="!variable.id" type="button" class="btn-secundario" @click="variables.splice(index, 1)">Quitar variable nueva</button>
            <p v-else class="nota">Definición registrada. Puedes cambiar su dependencia responsable.</p>
          </fieldset>
          <button type="button" class="btn-secundario" :disabled="variables.length >= 50" @click="agregar">Agregar variable</button>
          <p v-if="!dependencias.length" class="nota">No hay dependencias activas. Puedes definir las variables sin asignación y
            <router-link :to="{ name: 'AdministradorDependencias' }">registrar una dependencia</router-link> después.</p>
          <button type="submit" class="btn-principal" :disabled="!hayCambios || !variables.length">{{ guardando ? 'Guardando…' : 'Guardar variables y dependencias' }}</button>
        </fieldset>
      </form>
      <p class="nota">Estas asignaciones preparan la captura por dependencia. No activan el indicador ni publican resultados.</p>
    </template>
  </section>
</template>

<style scoped>
.variables-indicador > .panel-header { margin-top: 24px; }
.variables-indicador .nota { margin: 16px 0; line-height: 1.6; }
.variables-indicador .error p { margin: 0 0 12px; }
.variable-fila { margin: 0; padding: 20px; border: 1px solid var(--line); border-radius: 9px; min-width: 0; }
.variable-fila legend { font-weight: 750; color: var(--deep); padding: 0 6px; }
.variable-campos { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.variable-campos label { display: grid; gap: 8px; align-content: start; font-size: 13px; font-weight: 700; }
.variable-campos input, .variable-campos select, .variable-campos textarea { width: 100%; min-width: 0; padding: 12px; border: 1px solid var(--line); border-radius: 8px; font: inherit; font-weight: 400; background: white; color: #282c33; }
.variable-campos input:focus-visible, .variable-campos select:focus-visible, .variable-campos textarea:focus-visible { outline: 3px solid var(--gold); outline-offset: 2px; }
.variable-campos input[readonly], .variable-campos textarea[readonly] { background: #faf9f7; }
.variable-campos .campo-bloqueado { color: #6b7280; }
.variable-campos select:disabled { background: #f0f1f3; border-color: #d5d8dd; color: #6b7280; opacity: 1; cursor: not-allowed; }
.variable-fila > button { margin-top: 16px; }
@media (max-width: 650px) { .variable-campos { grid-template-columns: 1fr; } .variable-fila { padding: 14px; } }
</style>
