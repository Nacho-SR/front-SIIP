<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import axios from 'axios';
import api from '../../core/api';
import { useAuthStore } from '../../store/auth.store';

interface VariableAsignada {
  id: string; codigo: string; descripcion: string; unidadMedida: string; tipoDato: 'entero' | 'decimal';
}
interface IndicadorAsignado {
  id: string; clave: string; nombre: string; agrupacion: string; familia: string;
  frecuencia: 'Mensual' | 'Trimestral' | 'Semestral' | 'Anual'; activo: boolean;
  primerPeriodo: string | null; variables: VariableAsignada[];
  periodoActual: { inicio: string; fin: string };
}
interface BandejaCaptura {
  dependencia: { id: string; clave: string; nombre: string };
  fechaServidor: string; zonaHoraria: 'America/Mexico_City';
  indicadores: IndicadorAsignado[];
}

const auth = useAuthStore();
const bandeja = ref<BandejaCaptura | null>(null);
const cargando = ref(true);
const error = ref('');
const busqueda = ref('');
const agrupacion = ref('');
const identidad = computed(() => `${auth.user?.id}:${auth.user?.rol}:${auth.user?.dependencia_id}`);
const agrupaciones = computed(() => [...new Set(bandeja.value?.indicadores.map(i => i.agrupacion) ?? [])]);
const indicadores = computed(() => {
  const texto = busqueda.value.trim().toLocaleLowerCase('es');
  return (bandeja.value?.indicadores ?? []).filter(i =>
    (!agrupacion.value || i.agrupacion === agrupacion.value) &&
    (!texto || [i.clave, i.nombre, i.familia, ...i.variables.flatMap(v => [v.codigo, v.descripcion])]
      .some(valor => valor.toLocaleLowerCase('es').includes(texto))),
  );
});
const totalVariables = computed(() => bandeja.value?.indicadores.reduce((total, i) => total + i.variables.length, 0) ?? 0);
let solicitud = 0;
let controlador: AbortController | undefined;

async function cargarBandeja() {
  const actual = ++solicitud;
  controlador?.abort();
  controlador = new AbortController();
  bandeja.value = null;
  error.value = '';
  cargando.value = auth.isCapturista;
  if (!auth.isCapturista) return;
  const sesion = identidad.value;
  try {
    const { data } = await api.get<BandejaCaptura>('/captura/indicadores', { signal: controlador.signal });
    // Una respuesta anterior no puede repoblar la bandeja tras cambiar de cuenta o dependencia.
    if (actual === solicitud && sesion === identidad.value) bandeja.value = data;
  } catch (err) {
    if (actual === solicitud && sesion === identidad.value && !axios.isCancel(err)) {
      error.value = axios.isAxiosError(err) && typeof err.response?.data?.detail === 'string'
        ? err.response.data.detail : 'No se pudieron cargar tus asignaciones. Intenta de nuevo.';
    }
  } finally {
    if (actual === solicitud) cargando.value = false;
  }
}
function formatearFecha(fecha: string) {
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}
watch(identidad, () => {
  busqueda.value = '';
  agrupacion.value = '';
  void cargarBandeja();
}, { flush: 'sync' });
onMounted(() => {
  void cargarBandeja();
  window.addEventListener('focus', cargarBandeja);
});
onUnmounted(() => {
  ++solicitud;
  controlador?.abort();
  window.removeEventListener('focus', cargarBandeja);
});
</script>

<template>
  <div class="capture-page">
    <header class="page-heading">
      <div>
        <p class="eyebrow">Captura · Asignaciones</p>
        <h1>Mis indicadores</h1>
        <p class="intro">Consulta los indicadores y las variables a cargo de tu dependencia.</p>
      </div>
      <button v-if="auth.isCapturista" class="refresh" type="button" :disabled="cargando" @click="cargarBandeja">
        {{ cargando ? 'Actualizando…' : 'Actualizar asignaciones' }}
      </button>
    </header>

    <p class="readonly-note">Esta bandeja es de consulta. Todavía no se pueden enviar datos ni evidencias.</p>
    <p v-if="!auth.isCapturista" role="alert" class="message">Esta sección está disponible para cuentas de Captura.</p>
    <section v-else :aria-busy="cargando" aria-label="Asignaciones de mi dependencia">
      <p v-if="cargando" role="status" class="message">Cargando tus asignaciones…</p>
      <div v-else-if="error" role="alert" class="message error">
        <p>{{ error }}</p>
        <button type="button" class="refresh" @click="cargarBandeja">Reintentar</button>
      </div>
      <template v-else-if="bandeja">
        <div class="dependency-summary">
          <div>
            <p class="eyebrow">Dependencia responsable · {{ bandeja.dependencia.clave }}</p>
            <h2>{{ bandeja.dependencia.nombre }}</h2>
          </div>
          <p class="totals">{{ bandeja.indicadores.length }} indicadores <span aria-hidden="true">·</span> {{ totalVariables }} variables asignadas</p>
        </div>
        <p class="calendar-reference">Fecha del servidor: {{ formatearFecha(bandeja.fechaServidor) }} · {{ bandeja.zonaHoraria }}.
          Los periodos son una referencia de fechas; no indican apertura de captura ni incumplimiento.</p>
        <p v-if="!bandeja.indicadores.length" role="status" class="message">
          Aún no hay variables asignadas a tu dependencia. Solicita a Administración que revise la configuración.
        </p>
        <template v-else>
          <div class="filters">
            <label>Buscar indicador o variable
              <input v-model="busqueda" type="search" placeholder="Clave, nombre o descripción" />
            </label>
            <label>Agrupación temática
              <select v-model="agrupacion">
                <option value="">Todas las agrupaciones</option>
                <option v-for="opcion in agrupaciones" :key="opcion" :value="opcion">{{ opcion }}</option>
              </select>
            </label>
          </div>
          <p class="result-count" role="status">{{ indicadores.length }} de {{ bandeja.indicadores.length }} indicadores</p>
          <p v-if="!indicadores.length" class="message">No hay coincidencias. Prueba otra búsqueda o agrupación.</p>
          <div class="indicator-list">
            <article v-for="indicador in indicadores" :key="indicador.id" class="indicator-card" :aria-labelledby="`indicador-${indicador.id}`">
              <div class="card-heading">
                <p class="indicator-key">{{ indicador.clave }}</p>
                <span class="activation-status">{{ indicador.activo ? 'Activado' : 'Sin activar' }}</span>
              </div>
              <h2 :id="`indicador-${indicador.id}`">{{ indicador.nombre }}</h2>
              <p class="classification">{{ indicador.agrupacion }} / {{ indicador.familia }}</p>
              <dl class="indicator-details">
                <div><dt>Frecuencia</dt><dd>{{ indicador.frecuencia }}</dd></div>
                <div><dt>Inicio de aplicación</dt><dd>{{ indicador.activo && indicador.primerPeriodo ? formatearFecha(indicador.primerPeriodo) : 'Sin inicio registrado' }}</dd></div>
                <div><dt>Periodo natural actual</dt><dd><time :datetime="indicador.periodoActual.inicio">{{ formatearFecha(indicador.periodoActual.inicio) }}</time> al <time :datetime="indicador.periodoActual.fin">{{ formatearFecha(indicador.periodoActual.fin) }}</time></dd></div>
              </dl>
              <p v-if="!indicador.activo" class="preparation-note">En preparación. Administración debe activarlo antes de iniciar su operación.</p>
              <p class="variables-heading">Variables a cargo de {{ bandeja.dependencia.clave }} ({{ indicador.variables.length }})</p>
              <ul class="variables">
                <li v-for="variable in indicador.variables" :key="variable.id">
                  <span class="variable-code">{{ variable.codigo }}</span>
                  <div class="variable-description"><p>{{ variable.descripcion }}</p><p class="variable-meta">Unidad: {{ variable.unidadMedida }} · Tipo de dato: {{ variable.tipoDato === 'entero' ? 'Número entero' : 'Número decimal' }}</p></div>
                </li>
              </ul>
              <p class="scope-note">Se muestran únicamente las variables asignadas a tu dependencia.</p>
            </article>
          </div>
        </template>
      </template>
    </section>
  </div>
</template>

<style scoped>
.capture-page { max-width: 1540px; margin: 0 auto; color: #272b32; }
.page-heading, .dependency-summary, .card-heading { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.eyebrow { margin: 0 0 8px; color: #8a692f; font-size: 12px; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; }
h1 { margin: 0; color: #431c2a; font-family: Georgia, serif; font-size: clamp(30px, 4vw, 42px); font-weight: 500; }
h2 { margin: 0; font-size: 19px; line-height: 1.45; overflow-wrap: anywhere; }
.intro { margin: 10px 0 0; color: #666b73; }
.refresh { min-height: 44px; padding: 10px 16px; border: 1px solid #70273b; border-radius: 9px; background: #fff; color: #70273b; font: inherit; font-size: 14px; cursor: pointer; }
.refresh:hover:not(:disabled) { background: #faf4f5; }
.refresh:disabled { opacity: .6; cursor: wait; }
button:focus-visible, input:focus-visible, select:focus-visible { outline: 3px solid #c69a4b; outline-offset: 3px; }
.readonly-note { margin: 24px 0; padding: 14px 18px; border-left: 3px solid #c69a4b; background: #faf7f0; color: #60533c; line-height: 1.6; }
.dependency-summary { padding: 0 0 22px; border-bottom: 1px solid #e8e4dd; }
.totals { flex-shrink: 0; color: #666b73; font-size: 14px; }
.calendar-reference { color: #666b73; font-size: 13px; line-height: 1.6; }
.filters { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 24px; }
.filters label { display: grid; gap: 8px; min-width: 0; font-size: 13px; font-weight: 600; }
.filters input, .filters select { box-sizing: border-box; width: 100%; min-width: 0; min-height: 44px; padding: 10px 12px; border: 1px solid #dddcd7; border-radius: 9px; background: #fff; color: #272b32; font: inherit; font-size: 14px; }
.result-count { margin: 18px 0 12px; color: #666b73; font-size: 13px; }
.indicator-list { display: grid; gap: 20px; }
.indicator-card { min-width: 0; padding: 24px; border: 1px solid #e8e4dd; border-radius: 14px; background: #fff; box-shadow: 0 3px 14px #431c2a05; }
.card-heading { margin-bottom: 12px; }
.indicator-key { margin: 0; color: #70273b; font-size: 13px; font-weight: 700; overflow-wrap: anywhere; }
.activation-status { flex-shrink: 0; padding: 5px 10px; border: 1px solid #e3ded5; border-radius: 6px; color: #605748; font-size: 12px; }
.classification { color: #666b73; font-size: 13px; line-height: 1.6; }
.indicator-details { display: flex; flex-wrap: wrap; gap: 16px 48px; margin: 20px 0; }
.indicator-details dt { margin-bottom: 4px; color: #666b73; font-size: 12px; }
.indicator-details dd { margin: 0; font-size: 14px; font-weight: 600; }
.preparation-note, .scope-note { color: #666b73; font-size: 13px; line-height: 1.6; }
.variables-heading { margin: 22px 0 12px; font-size: 14px; font-weight: 700; }
.variables { margin: 0; padding: 0; list-style: none; border-top: 1px solid #eeeae4; }
.variables li { display: flex; align-items: flex-start; gap: 14px; padding: 16px 0; border-bottom: 1px solid #eeeae4; }
.variable-code { flex-shrink: 0; max-width: 35%; padding: 5px 9px; border-radius: 5px; background: #f6f1f2; color: #70273b; font-size: 13px; font-weight: 700; overflow-wrap: anywhere; }
.variable-description { min-width: 0; overflow-wrap: anywhere; }
.variable-description p { margin: 0; line-height: 1.5; }
.variable-description .variable-meta { margin-top: 6px; color: #666b73; font-size: 13px; }
.scope-note { margin: 12px 0 0; }
.message { margin: 24px 0; padding: 24px; border: 1px solid #e8e4dd; border-radius: 12px; background: #fff; line-height: 1.6; }
.error { border-color: #dcbec6; color: #70273b; }
.error p { margin-top: 0; }
@media (max-width: 700px) {
  .page-heading, .dependency-summary { align-items: flex-start; flex-direction: column; gap: 14px; }
  .totals { margin: 0; }
  .filters { grid-template-columns: 1fr; }
  .indicator-card { padding: 18px; }
  .card-heading { align-items: flex-start; flex-wrap: wrap; gap: 10px; }
}
</style>
