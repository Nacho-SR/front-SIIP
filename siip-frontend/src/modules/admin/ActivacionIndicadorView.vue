<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import axios from 'axios';
import { useRoute } from 'vue-router';
import api from '../../core/api';
import { obtenerIndicadorAdmin, type IndicadorAdmin } from './data/admin.store';

interface Activacion { id: string; metodologiaId: string; versionMetodologia: number; primerPeriodo: string; creadoEn: string; creadoPor: string; desactivadoEn: string | null; desactivadoPor: string | null; }
interface Preparacion { indicadorId: string; activo: boolean; metodologiaId: string | null; versionMetodologia: number; frecuencia: string; minimoInicio: string; puedeActivar: boolean; pendientes: string[]; historial: Activacion[]; }
const id = String(useRoute().params.id);
const endpoint = '/administracion/indicadores/' + encodeURIComponent(id) + '/activacion';
const indicador = ref<IndicadorAdmin | null>(null), preparacion = ref<Preparacion | null>(null);
const primerPeriodo = ref(''), confirmar = ref(false), cargando = ref(true), guardando = ref(false), cargaCompleta = ref(false);
const error = ref(''), mensaje = ref('');
const puedeEnviar = computed(() => cargaCompleta.value && !cargando.value && !guardando.value && preparacion.value?.puedeActivar
  && !!primerPeriodo.value && confirmar.value);
function detalle(cause: unknown) {
  return axios.isAxiosError(cause) ? cause.response?.data?.detail || 'No se pudo conectar con el servidor. Tus datos se conservan.'
    : cause instanceof Error ? cause.message : 'No se pudo completar la operación.';
}
function aplicar(data: Preparacion) { preparacion.value = data; primerPeriodo.value = ''; confirmar.value = false; }
async function cargar() {
  if (guardando.value) return;
  cargando.value = true; cargaCompleta.value = false; error.value = ''; mensaje.value = '';
  try {
    const [ficha, response] = await Promise.all([obtenerIndicadorAdmin(id), api.get<Preparacion>(endpoint)]);
    indicador.value = ficha; aplicar(response.data); cargaCompleta.value = true;
  } catch (cause) { error.value = detalle(cause); }
  finally { cargando.value = false; }
}
async function activar() {
  if (!puedeEnviar.value) return;
  guardando.value = true; error.value = ''; mensaje.value = '';
  const inicio = primerPeriodo.value;
  try {
    const { data } = await api.post<Preparacion>(endpoint, { metodologiaId: preparacion.value!.metodologiaId, primerPeriodo: inicio });
    aplicar(data); if (indicador.value) indicador.value.activo = data.activo;
    mensaje.value = `Indicador activado con inicio el ${inicio}. No se han creado capturas ni publicaciones.`;
  } catch (cause) { error.value = detalle(cause); confirmar.value = false; }
  finally { guardando.value = false; }
}
onMounted(() => { void cargar(); });
</script>

<template>
  <section class="panel activacion-indicador">
    <router-link :to="{ name: 'AdministradorIndicadores' }">← Regresar a Indicadores</router-link>
    <div class="panel-header"><div><span class="eyebrow">CONFIGURACIÓN DEL INDICADOR</span><h2>Activación y periodo inicial</h2>
      <p v-if="indicador"><strong>{{ indicador.campos.clave }}</strong> — {{ indicador.campos.nombre }}</p></div></div>
    <nav class="configuracion-nav" aria-label="Preparación del indicador">
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
        <div><dt>Metodología preparada</dt><dd>{{ preparacion.metodologiaId ? `Versión ${preparacion.versionMetodologia}` : 'Sin configurar' }}</dd></div>
        <div><dt>Zona horaria</dt><dd>America/Mexico_City</dd></div>
      </dl>
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
@media (max-width: 650px) { .resumen-activacion { grid-template-columns: 1fr; } .activacion-indicador fieldset { padding: 14px; } }
</style>
