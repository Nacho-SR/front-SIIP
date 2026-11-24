<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import axios from 'axios';
import { useRoute } from 'vue-router';
import api from '../../core/api';
import { obtenerIndicadorAdmin, type IndicadorAdmin } from './data/admin.store';
import { useAuthStore } from '../../store/auth.store';

interface Activacion { id: string; metodologiaId: string; versionMetodologia: number; primerPeriodo: string; creadoEn: string; creadoPor: string; desactivadoEn: string | null; desactivadoPor: string | null; }
interface Preparacion { indicadorId: string; activo: boolean; metodologiaId: string | null; versionMetodologia: number; frecuencia: string; minimoInicio: string; puedeActivar: boolean; pendientes: string[]; historial: Activacion[]; }
interface VariablePreparacion { id: string; codigo: string; descripcion: string; unidadMedida: string; tipoDato: 'entero' | 'decimal'; dependenciaId: string | null; dependenciaNombre: string | null; dependenciaActiva: boolean | null; }
interface VariablesPreparacion { indicadorId: string; version: number; variables: VariablePreparacion[]; }
const route = useRoute(), auth = useAuthStore();
const id = computed(() => String(route.params.id ?? ''));
const base = computed(() => '/administracion/indicadores/' + encodeURIComponent(id.value));
const endpoint = computed(() => base.value + '/activacion');
const contexto = computed(() => `${id.value}:${auth.user?.id}:${auth.user?.rol}:${auth.user?.dependencia_id}`);
const indicador = ref<IndicadorAdmin | null>(null), preparacion = ref<Preparacion | null>(null);
const configuracionVariables = ref<VariablesPreparacion | null>(null);
const primerPeriodo = ref(''), confirmar = ref(false), cargando = ref(true), guardando = ref(false), cargaCompleta = ref(false);
const error = ref(''), mensaje = ref('');
const puedeEnviar = computed(() => auth.isAdmin && cargaCompleta.value && !cargando.value && !guardando.value && preparacion.value?.puedeActivar
  && !!primerPeriodo.value && confirmar.value);
const variables = computed(() => configuracionVariables.value?.variables ?? []);
const sinResponsable = computed(() => variables.value.filter(v => !v.dependenciaId).length);
const responsablesInactivos = computed(() => variables.value.filter(v => v.dependenciaId && v.dependenciaActiva !== true).length);
const asignadasActivas = computed(() => variables.value.length - sinResponsable.value - responsablesInactivos.value);
const activacionVigente = computed(() => {
  const abiertas = preparacion.value?.historial.filter(a => a.desactivadoEn === null) ?? [];
  return preparacion.value?.activo && abiertas.length === 1 ? abiertas[0] : null;
});
const estadoPreparacion = computed(() => preparacion.value?.activo
  ? (activacionVigente.value ? 'Activación registrada' : 'Activación por revisar')
  : preparacion.value?.puedeActivar ? 'Puede elegir el periodo inicial' : 'Preparación incompleta');
function detalle(cause: unknown) {
  return axios.isAxiosError(cause) ? cause.response?.data?.detail || 'No se pudo conectar con el servidor. Intenta recargar la comprobación.'
    : cause instanceof Error ? cause.message : 'No se pudo completar la operación.';
}
function aplicar(data: Preparacion) { preparacion.value = data; primerPeriodo.value = ''; confirmar.value = false; }
let solicitud = 0;
let controlador: AbortController | undefined;
function limpiar() {
  indicador.value = null; preparacion.value = null; configuracionVariables.value = null;
  cargaCompleta.value = false; primerPeriodo.value = ''; confirmar.value = false;
}
async function cargar() {
  if (guardando.value) return;
  const actual = ++solicitud, vista = contexto.value;
  controlador?.abort(); controlador = new AbortController();
  limpiar(); error.value = ''; mensaje.value = ''; cargando.value = auth.isAdmin && !!id.value;
  if (!auth.isAdmin || !id.value) return;
  try {
    const [ficha, response, entradas] = await Promise.all([obtenerIndicadorAdmin(id.value),
      api.get<Preparacion>(endpoint.value, { signal: controlador.signal }),
      api.get<VariablesPreparacion>(base.value + '/variables', { signal: controlador.signal })]);
    if (actual !== solicitud || vista !== contexto.value) return;
    if (ficha.id !== id.value || response.data.indicadorId !== id.value || entradas.data.indicadorId !== id.value
      || ficha.activo !== response.data.activo) throw new Error('Cambió el indicador durante la consulta. Recarga la comprobación.');
    indicador.value = ficha; configuracionVariables.value = entradas.data;
    aplicar(response.data); cargaCompleta.value = true;
  } catch (cause) {
    if (actual === solicitud && vista === contexto.value && !axios.isCancel(cause)) error.value = detalle(cause);
  } finally { if (actual === solicitud) cargando.value = false; }
}
async function activar() {
  if (!puedeEnviar.value) return;
  guardando.value = true; error.value = ''; mensaje.value = '';
  const inicio = primerPeriodo.value, actual = solicitud, vista = contexto.value;
  try {
    const { data } = await api.post<Preparacion>(endpoint.value, { metodologiaId: preparacion.value!.metodologiaId, primerPeriodo: inicio });
    if (actual !== solicitud || vista !== contexto.value) return;
    aplicar(data); if (indicador.value) indicador.value.activo = data.activo;
    mensaje.value = `Indicador activado con inicio el ${inicio}. No se han creado capturas ni publicaciones.`;
  } catch (cause) { if (actual === solicitud && vista === contexto.value) { error.value = detalle(cause); confirmar.value = false; } }
  finally { if (actual === solicitud && vista === contexto.value) guardando.value = false; }
}
watch(contexto, () => { guardando.value = false; void cargar(); }, { flush: 'sync' });
onMounted(() => { void cargar(); });
onUnmounted(() => { ++solicitud; controlador?.abort(); });
</script>

<template>
  <section class="panel activacion-indicador" :aria-busy="cargando">
    <router-link :to="{ name: 'AdministradorIndicadores' }">← Regresar a Indicadores</router-link>
    <div class="panel-header"><div><span class="eyebrow">CONFIGURACIÓN DEL INDICADOR</span><h2>Preparación y activación del indicador</h2>
      <p v-if="indicador"><strong>{{ indicador.campos.clave }}</strong> — {{ indicador.campos.nombre }}</p></div>
      <button v-if="auth.isAdmin && !error" type="button" class="btn-secundario" :disabled="cargando || guardando" @click="cargar">Actualizar comprobación</button>
    </div>
    <p v-if="!auth.isAdmin" role="alert">Esta sección está disponible solo para Administración.</p>
    <nav v-if="auth.isAdmin" class="configuracion-nav" aria-label="Preparación del indicador">
      <router-link class="btn-secundario" :to="{ name: 'AdministradorNuevoIndicador', query: { ver: id } }">Ver ficha documental</router-link>
      <router-link class="btn-secundario" :to="{ name: 'AdministradorVariablesIndicador', params: { id } }">Variables y dependencias</router-link>
      <router-link class="btn-secundario" :to="{ name: 'AdministradorMetodologiaIndicador', params: { id } }">Cálculo y semáforo</router-link>
    </nav>
    <p v-if="cargando" role="status">Comprobando configuración…</p>
    <div v-if="error" class="error" role="alert"><p>{{ error }}</p>
      <button type="button" class="btn-secundario" :disabled="guardando || cargando" @click="cargar">Recargar comprobación y descartar la selección</button></div>
    <p v-if="mensaje" class="mensaje" role="status">{{ mensaje }}</p>
    <template v-if="preparacion && cargaCompleta && !cargando">
      <dl class="resumen-activacion">
        <div><dt>Estado</dt><dd>{{ preparacion.activo ? 'Activo' : 'Inactivo' }}</dd></div>
        <div><dt>Frecuencia</dt><dd>{{ preparacion.frecuencia }}</dd></div>
        <div><dt>Preparación</dt><dd>{{ estadoPreparacion }}</dd></div>
        <div><dt>Zona horaria</dt><dd>America/Mexico_City</dd></div>
      </dl>
      <section class="preparacion-detalle" aria-labelledby="preparacion-titulo">
        <h3 id="preparacion-titulo">Configuración registrada</h3>
        <p class="nota">La ficha documental describe el indicador. Para activarlo también necesita variables, responsables y una metodología configurados. Esta comprobación técnica no sustituye la autorización de la ficha.</p>
        <dl class="lista-preparacion">
          <div><dt>Variables para captura</dt><dd>{{ variables.length ? `${variables.length} registradas` : 'Sin variables registradas' }}</dd></div>
          <div><dt>Dependencias responsables</dt><dd>
            <template v-if="variables.length">{{ asignadasActivas }} de {{ variables.length }} variables con responsable activo.
              <span v-if="sinResponsable">{{ sinResponsable }} sin asignar.</span>
              <span v-if="responsablesInactivos">{{ responsablesInactivos }} con responsable inactivo o no disponible.</span>
            </template><template v-else>Registra primero las variables para asignar responsables.</template>
          </dd></div>
          <div><dt>Metodología guardada</dt><dd>{{ preparacion.metodologiaId ? `Versión ${preparacion.versionMetodologia}` : 'Sin metodología de cálculo y semáforo' }}
            <small>La comprobación de requisitos indica si corresponde a la ficha y las asignaciones actuales.</small>
          </dd></div>
          <div><dt>Inicio de operación</dt><dd>
            <template v-if="preparacion.activo">{{ activacionVigente ? `Registrado: ${activacionVigente.primerPeriodo} · metodología versión ${activacionVigente.versionMetodologia}` : 'No se identificó una única activación vigente. Solicita revisión.' }}</template>
            <template v-else>Por elegir al activar. Primer inicio permitido: {{ preparacion.minimoInicio }}.</template>
          </dd></div>
        </dl>
        <details v-if="variables.length" class="detalle-variables">
          <summary>Ver variables y responsables</summary>
          <div class="tabla-variables" tabindex="0" role="region" aria-label="Variables registradas y dependencias responsables">
            <table><thead><tr><th>Código</th><th>Descripción</th><th>Unidad</th><th>Tipo de dato</th><th>Dependencia responsable</th><th>Asignación</th></tr></thead>
              <tbody><tr v-for="variable in variables" :key="variable.id">
                <td>{{ variable.codigo }}</td><td>{{ variable.descripcion }}</td><td>{{ variable.unidadMedida }}</td>
                <td>{{ variable.tipoDato === 'entero' ? 'Número entero' : 'Número decimal' }}</td>
                <td>{{ variable.dependenciaNombre ?? (variable.dependenciaId ? 'Dependencia no disponible' : 'Sin asignar') }}</td>
                <td>{{ !variable.dependenciaId ? 'Sin asignar' : variable.dependenciaActiva ? 'Activa' : 'Inactiva o no disponible' }}</td>
              </tr></tbody>
            </table>
          </div>
        </details>
      </section>
      <div v-if="!preparacion.activo && preparacion.pendientes.length" class="pendientes" role="status"><h3>Antes de activar</h3>
        <ul><li v-for="pendiente in preparacion.pendientes" :key="pendiente">{{ pendiente }}</li></ul></div>
      <p v-if="preparacion.activo" class="nota">El inicio y la metodología aplicados se conservan en el historial. La captura y publicación de resultados se implementan en las siguientes etapas.</p>
      <form v-else @submit.prevent="activar">
        <fieldset :disabled="guardando || !preparacion.puedeActivar">
          <legend>Confirmar activación</legend>
          <p class="nota">Elige un periodo natural completo desde {{ preparacion.minimoInicio }}. Se excluyen el periodo en curso y los anteriores.
            El servidor volverá a comprobar las fechas y toda la configuración al confirmar.</p>
          <label class="campo-fecha">Inicio del primer periodo
            <input v-model="primerPeriodo" type="date" :min="preparacion.minimoInicio" max="9999-12-01" required @change="confirmar = false" />
          </label>
          <p class="nota">Debe ser el primer día del mes; para trimestrales: enero, abril, julio u octubre; semestrales: enero o julio; anuales: enero.</p>
          <label class="confirmacion"><input v-model="confirmar" type="checkbox" required />
            <span>Confirmo el inicio seleccionado y la metodología versión {{ preparacion.versionMetodologia }}. La activación quedará registrada con mi usuario.</span></label>
          <button class="btn-principal" type="submit" :disabled="!puedeEnviar">{{ guardando ? 'Activando…' : 'Activar indicador' }}</button>
        </fieldset>
      </form>
      <section v-if="preparacion.historial.length" class="historial-activacion"><h3>Historial de activaciones</h3>
        <article v-for="activacion in preparacion.historial" :key="activacion.id">
          <strong>Inicio {{ activacion.primerPeriodo }} · Metodología versión {{ activacion.versionMetodologia }}</strong>
          <p>Activación: {{ new Date(activacion.creadoEn).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }) }} · Administrador ID {{ activacion.creadoPor }}</p>
          <p>{{ activacion.desactivadoEn ? `Desactivado: ${new Date(activacion.desactivadoEn).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}` : 'Registro de activación abierto' }}</p>
        </article>
      </section>
    </template>
  </section>
</template>

<style scoped>
.activacion-indicador > .panel-header { margin-top: 24px; }
.configuracion-nav { display: flex; flex-wrap: wrap; gap: 12px; margin: 20px 0; }
.configuracion-nav a { min-height: 44px; }
.resumen-activacion { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; padding: 20px; background: #faf9f7; border-radius: 9px; }
.resumen-activacion dt { font-size: 13px; font-weight: 700; }
.resumen-activacion dd { margin: 8px 0 0; overflow-wrap: anywhere; }
.preparacion-detalle { margin-top: 28px; }
.lista-preparacion { margin: 20px 0; }
.lista-preparacion > div { display: grid; grid-template-columns: minmax(150px, 1fr) minmax(0, 3fr); gap: 16px; padding: 18px 0; border-top: 1px solid var(--line); }
.lista-preparacion dt { font-weight: 700; }
.lista-preparacion dd { margin: 0; line-height: 1.6; overflow-wrap: anywhere; }
.lista-preparacion small { display: block; margin-top: 6px; color: #626871; }
.detalle-variables summary { min-height: 44px; padding: 12px 0; cursor: pointer; font-weight: 700; color: var(--blue-dark); }
.tabla-variables { overflow-x: auto; max-width: 100%; }
.tabla-variables table { width: 100%; min-width: 660px; border-collapse: collapse; text-align: left; }
.tabla-variables th, .tabla-variables td { padding: 12px; border-bottom: 1px solid var(--line); vertical-align: top; overflow-wrap: anywhere; font-size: 13px; }
.detalle-variables summary:focus-visible, .tabla-variables:focus-visible { outline: 3px solid var(--gold); outline-offset: 3px; }
.activacion-indicador .nota, .pendientes li { margin: 16px 0; line-height: 1.6; }
.activacion-indicador .error p { margin: 0 0 12px; }
.activacion-indicador fieldset { margin: 24px 0; min-width: 0; padding: 20px; border: 1px solid var(--line); border-radius: 9px; }
.activacion-indicador legend { font-weight: 700; padding-inline: 6px; }
.campo-fecha { display: grid; gap: 8px; max-width: 340px; font-size: 13px; font-weight: 700; }
.campo-fecha input { width: 100%; min-width: 0; min-height: 44px; padding: 12px; border: 1px solid var(--line); border-radius: 8px; font: inherit; background: white; color: #282c33; }
.campo-fecha input:disabled { background: #f0f1f3; color: #6b7280; }
.campo-fecha input:focus-visible, .confirmacion input:focus-visible { outline: 3px solid var(--gold); outline-offset: 3px; }
.confirmacion { display: flex; gap: 12px; align-items: center; min-height: 44px; line-height: 1.6; margin: 20px 0; }
.confirmacion input { width: 20px; height: 20px; flex-shrink: 0; }
.activacion-indicador button { min-height: 44px; }
.historial-activacion article { border-top: 1px solid var(--line); padding: 16px 0; overflow-wrap: anywhere; }
.historial-activacion p { margin: 12px 0; }
@media (max-width: 650px) { .resumen-activacion { grid-template-columns: 1fr; } .activacion-indicador fieldset { padding: 14px; } .lista-preparacion > div { grid-template-columns: 1fr; gap: 8px; } }
</style>
