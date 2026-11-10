<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import axios from 'axios';
import { useRoute } from 'vue-router';
import api from '../../core/api';
import { obtenerIndicadorAdmin, type IndicadorAdmin } from './data/admin.store';

interface Variable { id: string; codigo: string; descripcion: string; unidadMedida: string; tipoDato: string; dependenciaId: string | null; dependenciaNombre: string | null; dependenciaActiva: boolean | null; }
interface Regla { tipo: 'porcentaje_parte_total'; numeradorId: string; denominadorId: string; amarilloDesde: number; verdeDesde: number; }
interface Metodologia { id: string; version: number; regla: Regla; contexto: { versionVariables: number; frecuencia: string; variables: Variable[] }; creadoEn: string; creadoPor: string; }
interface Configuracion { indicadorId: string; version: number; metodologias: Metodologia[]; }
interface Simulacion { valor: string | null; semaforo: 'verde' | 'amarillo' | 'rojo' | null; motivo: string | null; }
const id = String(useRoute().params.id);
const endpoint = '/administracion/indicadores/' + encodeURIComponent(id) + '/metodologia';
const indicador = ref<IndicadorAdmin | null>(null);
const variables = ref<Variable[]>([]);
const versionVariables = ref(0);
const configuracion = ref<Configuracion>({ indicadorId: id, version: 0, metodologias: [] });
const numeradorId = ref(''), denominadorId = ref('');
const amarilloDesde = ref<number | ''>(''), verdeDesde = ref<number | ''>('');
const numerador = ref<number | ''>(''), denominador = ref<number | ''>('');
const resultado = ref<Simulacion | null>(null);
const cargando = ref(true), guardando = ref(false), simulando = ref(false);
const cargaCompleta = ref(false);
const error = ref(''), mensaje = ref(''), errorSimulacion = ref('');
const ultima = computed(() => configuracion.value.metodologias[0]);
const regla = computed(() => ({ tipo: 'porcentaje_parte_total', numeradorId: numeradorId.value, denominadorId: denominadorId.value,
  amarilloDesde: amarilloDesde.value, verdeDesde: verdeDesde.value }));
const hayCambios = computed(() => !ultima.value || Object.entries(regla.value).some(([key, value]) => value !== ultima.value?.regla[key as keyof Regla])
  || versionVariables.value !== ultima.value.contexto.versionVariables);
const compatible = computed(() => !!indicador.value && indicador.value.campos.unidad === '%' && indicador.value.campos.sentido === 'Ascendente'
  && indicador.value.campos.condicionAcumulacion === 'No acumulable' && variables.value.length === 2
  && variables.value.every(v => v.tipoDato === 'entero') && variables.value[0]!.unidadMedida.trim().toLowerCase() === variables.value[1]!.unidadMedida.trim().toLowerCase());
const bloqueado = computed(() => !cargaCompleta.value || cargando.value || guardando.value || simulando.value || !indicador.value || indicador.value.activo || !compatible.value);
const reglaValida = computed(() => !!numeradorId.value && !!denominadorId.value && numeradorId.value !== denominadorId.value
  && amarilloDesde.value !== '' && verdeDesde.value !== '' && amarilloDesde.value >= 0 && verdeDesde.value <= 100 && amarilloDesde.value < verdeDesde.value);
function detalle(cause: unknown) {
  return axios.isAxiosError(cause) ? cause.response?.data?.detail || 'No se pudo conectar con el servidor. Tus cambios se conservan.'
    : cause instanceof Error ? cause.message : 'No se pudo completar la operación.';
}
function aplicar(data: Configuracion) {
  configuracion.value = data;
  const saved = data.metodologias[0];
  numeradorId.value = saved?.regla.numeradorId ?? '';
  denominadorId.value = saved?.regla.denominadorId ?? '';
  amarilloDesde.value = saved?.regla.amarilloDesde ?? '';
  verdeDesde.value = saved?.regla.verdeDesde ?? '';
}
async function cargar() {
  if (guardando.value || simulando.value) return;
  cargando.value = true; cargaCompleta.value = false; error.value = ''; mensaje.value = ''; resultado.value = null; errorSimulacion.value = '';
  try {
    const [ficha, entradas, config] = await Promise.all([obtenerIndicadorAdmin(id),
      api.get<{ version: number; variables: Variable[] }>(endpoint.replace('/metodologia', '/variables')), api.get<Configuracion>(endpoint)]);
    indicador.value = ficha; variables.value = entradas.data.variables; versionVariables.value = entradas.data.version;
    aplicar(config.data);
    cargaCompleta.value = true;
  } catch (cause) { error.value = detalle(cause); }
  finally { cargando.value = false; }
}
async function guardar() {
  if (bloqueado.value || !reglaValida.value || !hayCambios.value) return;
  guardando.value = true; error.value = ''; mensaje.value = '';
  try {
    const { data } = await api.put<Configuracion>(endpoint, { version: configuracion.value.version, versionVariables: versionVariables.value, regla: regla.value });
    aplicar(data); mensaje.value = `Versión ${data.version} guardada. El indicador sigue inactivo y sin periodo de inicio.`;
  } catch (cause) { error.value = detalle(cause); }
  finally { guardando.value = false; }
}
async function simular() {
  if (bloqueado.value || !reglaValida.value || numerador.value === '' || denominador.value === '') return;
  simulando.value = true; resultado.value = null; errorSimulacion.value = '';
  try {
    const { data } = await api.post<Simulacion>(endpoint + '/simular', { versionVariables: versionVariables.value, regla: regla.value,
      numerador: numerador.value, denominador: denominador.value });
    resultado.value = data;
  } catch (cause) { errorSimulacion.value = detalle(cause); }
  finally { simulando.value = false; }
}
watch([regla, numerador, denominador], () => { resultado.value = null; errorSimulacion.value = ''; mensaje.value = ''; }, { flush: 'sync' });
onMounted(() => { void cargar(); });
</script>

<template>
  <section class="panel metodologia-indicador">
    <router-link :to="{ name: 'AdministradorIndicadores' }">← Regresar a Indicadores</router-link>
    <div class="panel-header">
      <div><span class="eyebrow">CONFIGURACIÓN DEL INDICADOR</span><h2>Cálculo y semáforo</h2>
        <p v-if="indicador"><strong>{{ indicador.campos.clave }}</strong> — {{ indicador.campos.nombre }}</p></div>
      <router-link class="btn-secundario" :to="{ name: 'AdministradorVariablesIndicador', params: { id } }">Variables y dependencias</router-link>
    </div>
    <p v-if="cargando" role="status">Cargando metodología…</p>
    <div v-if="error" class="error" role="alert"><p>{{ error }}</p>
      <button type="button" class="btn-secundario" :disabled="guardando || simulando || cargando" @click="cargar">Recargar configuración (descarta cambios sin guardar)</button></div>
    <p v-if="mensaje" class="mensaje" role="status">{{ mensaje }}</p>
    <template v-if="indicador && !cargando">
      <p class="nota">Prepara una metodología versionada. El periodo de inicio se elegirá al activar; guardar aquí no habilita capturas ni publica resultados.</p>
      <p v-if="indicador.activo" class="error">El indicador está activo. Sus reglas requieren un flujo de cambio de metodología.</p>
      <p v-if="!compatible" class="error">Esta etapa admite porcentajes ascendentes no acumulables con dos variables enteras de la misma unidad. Revisa la ficha y sus variables.</p>
      <dl class="referencia-ficha"><div><dt>Fórmula de la ficha</dt><dd>{{ indicador.campos.algoritmo }}</dd></div>
        <div><dt>Semáforo de la ficha</dt><dd>{{ indicador.campos.semaforizacion }}</dd></div>
        <div><dt>Frecuencia</dt><dd>{{ indicador.campos.frecuencia }} · America/Mexico_City</dd></div></dl>
      <p v-if="ultima && ultima.contexto.versionVariables !== versionVariables" class="nota" role="status">Las variables o sus responsables cambiaron después de la última versión. Guarda una nueva versión para conservar la configuración actual.</p>
      <form @submit.prevent="guardar">
        <fieldset :disabled="bloqueado" class="regla-form">
          <legend>Regla de porcentaje · P = parte / total × 100</legend>
          <div class="regla-campos">
            <label>Numerador (parte)<select v-model="numeradorId" required><option value="" disabled>Selecciona la variable</option>
              <option v-for="v in variables" :key="v.id" :value="v.id">{{ v.codigo }} — {{ v.descripcion }}</option></select></label>
            <label>Denominador (total)<select v-model="denominadorId" required><option value="" disabled>Selecciona la variable</option>
              <option v-for="v in variables" :key="v.id" :value="v.id">{{ v.codigo }} — {{ v.descripcion }}</option></select></label>
            <label>Amarillo desde (%)<input v-model.number="amarilloDesde" type="number" min="0" max="100" step="any" required /></label>
            <label>Verde desde (%)<input v-model.number="verdeDesde" type="number" min="0" max="100" step="any" required /></label>
          </div>
          <p class="nota">Rojo: menor al umbral amarillo. Amarillo: desde ese umbral y menor al verde. Verde: desde el umbral verde.
            Los límites se incluyen en el color que comienza en ellos.</p>
          <p class="nota">Los conteos deben ser enteros no negativos y la parte no puede superar al total. Si ambos son cero: sin dato, sin valor y sin color. El color se compara antes de redondear.</p>
          <ul class="responsables"><li v-for="v in variables" :key="v.id"><strong>{{ v.codigo }}</strong>: {{ v.dependenciaNombre || 'Sin dependencia asignada' }}{{ v.dependenciaActiva === false ? ' (inactiva)' : '' }}</li></ul>
          <p v-if="variables.some(v => !v.dependenciaId)" class="nota">Puedes preparar la regla con responsables pendientes; tendrás que completar sus asignaciones antes de activar.</p>
          <button type="submit" class="btn-principal" :disabled="!reglaValida || !hayCambios">{{ guardando ? 'Guardando…' : 'Guardar versión de metodología' }}</button>
        </fieldset>
      </form>
      <form @submit.prevent="simular">
        <fieldset :disabled="bloqueado" class="regla-form">
          <legend>Probar cálculo</legend><p class="nota">Usa los parámetros visibles, incluso antes de guardarlos. Esta prueba no guarda valores, capturas ni resultados publicados.</p>
          <div class="regla-campos"><label>Valor de la parte<input v-model.number="numerador" type="number" min="0" max="9007199254740991" step="1" required /></label>
            <label>Valor del total<input v-model.number="denominador" type="number" min="0" max="9007199254740991" step="1" required /></label></div>
          <button type="submit" class="btn-secundario" :disabled="!reglaValida || numerador === '' || denominador === ''">{{ simulando ? 'Calculando…' : 'Probar cálculo' }}</button>
        </fieldset>
        <p v-if="errorSimulacion" class="error" role="alert">{{ errorSimulacion }}</p>
        <p v-if="resultado" class="resultado-prueba" role="status">{{ resultado.motivo === 'DENOMINADOR_CERO' ? 'Sin dato: el total es cero. No se asigna valor ni color.' : `Resultado de prueba: ${resultado.valor} % · Semáforo: ${resultado.semaforo}.` }}</p>
      </form>
      <details v-if="configuracion.metodologias.length" class="historial"><summary>Versiones guardadas ({{ configuracion.metodologias.length }}) · sin vigencia asignada</summary>
        <article v-for="m in configuracion.metodologias" :key="m.id"><h3>Versión {{ m.version }}</h3>
          <p>{{ new Date(m.creadoEn).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }) }} · Administrador ID {{ m.creadoPor }}</p>
          <p>P = {{ m.contexto.variables.find(v => v.id === m.regla.numeradorId)?.codigo }} / {{ m.contexto.variables.find(v => v.id === m.regla.denominadorId)?.codigo }} × 100 · {{ m.contexto.frecuencia }}</p>
          <p>Amarillo desde {{ m.regla.amarilloDesde }} % · Verde desde {{ m.regla.verdeDesde }} %</p>
          <ul><li v-for="v in m.contexto.variables" :key="v.id">{{ v.codigo }}: {{ v.dependenciaNombre || 'Sin asignar' }}</li></ul>
        </article>
      </details>
    </template>
  </section>
</template>

<style scoped>
.metodologia-indicador > .panel-header { margin-top: 24px; }
.metodologia-indicador .nota { margin: 16px 0; line-height: 1.6; }
.metodologia-indicador .error p { margin: 0 0 12px; }
.referencia-ficha { display: grid; gap: 16px; margin: 24px 0; padding: 20px; background: #faf9f7; border-radius: 9px; }
.referencia-ficha dt { font-size: 13px; font-weight: 700; }
.referencia-ficha dd { margin: 8px 0 0; white-space: pre-line; overflow-wrap: anywhere; }
.regla-form { margin: 24px 0; padding: 20px; min-width: 0; border: 1px solid var(--line); border-radius: 9px; }
.regla-form legend { padding: 0 6px; font-weight: 750; color: var(--deep); }
.regla-campos { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.regla-campos label { display: grid; gap: 8px; font-size: 13px; font-weight: 700; }
.regla-campos input, .regla-campos select { width: 100%; min-width: 0; min-height: 44px; padding: 12px; border: 1px solid var(--line); border-radius: 8px; background: white; color: #282c33; font: inherit; font-weight: 400; }
.regla-campos input:focus-visible, .regla-campos select:focus-visible, .historial summary:focus-visible { outline: 3px solid var(--gold); outline-offset: 2px; }
.regla-campos input:disabled, .regla-campos select:disabled { background: #f0f1f3; color: #6b7280; }
.regla-form > button { margin-top: 16px; min-height: 44px; }
.responsables { padding-left: 20px; line-height: 1.8; }
.resultado-prueba { padding: 16px; border-left: 4px solid var(--blue); background: var(--blue-light); }
.historial summary { padding: 12px 0; min-height: 44px; cursor: pointer; font-weight: 700; }
.historial article { padding: 16px 0; border-top: 1px solid var(--line); }
.historial article p { margin: 8px 0; overflow-wrap: anywhere; }
@media (max-width: 650px) { .regla-campos { grid-template-columns: 1fr; } .regla-form { padding: 14px; } }
</style>
