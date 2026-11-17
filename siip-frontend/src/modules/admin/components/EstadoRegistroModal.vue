<script setup lang="ts">
import { ref, toRef } from 'vue';
import { useDialogFocus } from '../../../core/useDialogFocus';
const props = defineProps<{ abierto: boolean; entidad: string; nombre: string; activo: boolean; procesando: boolean; error: string }>();
const emit = defineEmits<{ cerrar: []; confirmar: [datos: { activo: boolean }] }>();
const dialogo = ref<HTMLElement | null>(null);
const cerrar = () => { if (!props.procesando) emit('cerrar'); };
useDialogFocus(dialogo, toRef(props, 'abierto'), cerrar);
</script>
<template>
  <Teleport to="body">
    <div v-if="abierto" class="estado-overlay admin-modal" @click.self="cerrar">
      <section ref="dialogo" class="estado-dialogo" role="dialog" aria-modal="true" aria-labelledby="estado-registro-titulo" tabindex="-1">
        <h2 id="estado-registro-titulo">Desactivar {{ entidad }}</h2>
        <p>¿Confirmas desactivar <strong>{{ nombre }}</strong>?</p>
        <p>Se conservarán las activaciones anteriores. Para activarlo nuevamente deberás comprobar la metodología y elegir un periodo completo posterior.</p>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <div class="estado-botones"><button type="button" class="btn-secundario" :disabled="procesando" @click="cerrar">Cancelar</button>
          <button type="button" class="btn-principal" :disabled="procesando || !activo" @click="emit('confirmar', { activo: false })">{{ procesando ? 'Desactivando…' : 'Desactivar indicador' }}</button></div>
      </section>
    </div>
  </Teleport>
</template>
<style scoped>
.estado-overlay { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 20px; background: #0008; }
.estado-dialogo { width: min(100%, 560px); max-height: calc(100dvh - 40px); overflow-y: auto; padding: 24px; background: white; border-radius: 12px; color: #282c33; }
.estado-dialogo h2 { margin: 0 0 20px; }
.estado-dialogo p { line-height: 1.6; margin: 16px 0; }
.estado-botones { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 12px; margin-top: 24px; }
.estado-botones button { min-height: 44px; }
</style>
