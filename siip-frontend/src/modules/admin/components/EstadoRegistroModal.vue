
<script setup lang="ts">

import { computed } from 'vue';

type Entidad =
  | 'usuario'
  | 'dependencia'
  | 'indicador'
  | 'agrupacion'
  | 'familia';

interface Props {
  abierto: boolean;
  entidad: Entidad;
  nombre: string;
  activo: boolean;
  procesando?: boolean;
  error?: string;
}

const props = withDefaults(defineProps<Props>(), {
  procesando: false,
  error: ''
});

const emit = defineEmits<{
  (e: 'cerrar'): void;
  (e: 'confirmar', datos: {
    activo: boolean;
  }): void;
}>();

const accion = computed(() =>
  props.activo ? 'Desactivar' : 'Reactivar'
);

const nombreEntidad = computed(() => ({
  usuario: 'usuario',
  dependencia: 'dependencia',
  indicador: 'indicador',
  agrupacion: 'agrupación temática',
  familia: 'familia'
})[props.entidad]);

function cerrar() {
  if (!props.procesando) {
    emit('cerrar');
  }
}

function confirmar() {
  if (props.procesando) return;

  emit('confirmar', {
    activo: !props.activo
  });
}

</script>

<template>
  <Teleport to="body">
    <div
      v-if="abierto"
      class="estado-overlay"
      @click.self="cerrar"
    >
      <section
        class="estado-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="estado-titulo"
      >
        <header class="estado-header">
          <div>
            <span class="eyebrow">
              SIIP SALAMANCA · ADMINISTRACIÓN
            </span>

            <h2 id="estado-titulo">
              {{ accion }} {{ nombreEntidad }}
            </h2>
          </div>

          <button
            type="button"
            class="cerrar"
            :disabled="procesando"
            aria-label="Cerrar modal"
            @click="cerrar"
          >
            ×
          </button>
        </header>

        <form
          class="estado-contenido"
          @submit.prevent="confirmar"
        >
          <div class="registro-info">
            <span>REGISTRO SELECCIONADO</span>
            <strong>{{ nombre }}</strong>

            <small>
              Estado actual:
              {{ activo ? 'Activo' : 'Inactivo' }}
            </small>
          </div>

          <div
            class="estado-aviso"
            :class="{ reactivar: !activo }"
          >
            <strong>
              {{
                activo
                  ? 'Confirmar desactivación'
                  : 'Confirmar reactivación'
              }}
            </strong>

            <p v-if="activo">
              El registro dejará de estar disponible
              para las operaciones correspondientes.
              Su información e historial se conservarán.
            </p>

            <p v-else>
              El registro volverá a estar disponible,
              siempre que cumpla las restricciones
              de activación del sistema.
            </p>
          </div>
          <p
            v-if="error"
            class="estado-error"
            role="alert"
          >
            {{ error }}
          </p>

          <footer class="estado-acciones">
            <button
              type="button"
              class="btn-cancelar"
              :disabled="procesando"
              @click="cerrar"
            >
              Cancelar
            </button>

            <button
              type="submit"
              class="btn-confirmar"
              :class="{ reactivar: !activo }"
              :disabled="procesando"
            > 
              {{
                procesando
                  ? 'Procesando...'
                  : `Confirmar ${accion.toLowerCase()}`
              }}
            </button>
          </footer>
        </form>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.estado-overlay {
  position: fixed;
  inset: 0;
  z-index: 1500;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(24, 19, 27, .7);
  backdrop-filter: blur(5px);
  font-family: Manrope, sans-serif;
}

.estado-modal {
  width: min(520px, 100%);
  max-height: 92dvh;
  overflow-y: auto;
  border-radius: 16px;
  background: white;
  box-shadow: 0 25px 75px #0003;
}

.estado-header {
  display: flex;
  justify-content: space-between;
  gap: 15px;
  padding: 24px;
  border-bottom: 3px solid #c69a4b;
  background: linear-gradient(
    120deg,
    #fcf3f5,
    #eff5fa
  );
}

.eyebrow {
  color: #a27b3d;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .1em;
}

.estado-header h2 {
  margin: 8px 0 0;
  color: #431c2a;
  font-size: 20px;
}

.cerrar {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 8px;
  background: #f0e4e8;
  color: #70273b;
  font-size: 23px;
  cursor: pointer;
}

.estado-contenido {
  display: grid;
  gap: 20px;
  padding: 24px;
}

.registro-info {
  display: grid;
  gap: 7px;
  padding: 16px;
  border: 1px solid #cbddea;
  border-radius: 10px;
  background: #f3f8fb;
}

.registro-info span {
  color: #245a81;
  font-size: 10px;
  font-weight: 800;
}

.registro-info strong {
  color: #293e4e;
  font-size: 14px;
  overflow-wrap: anywhere;
}

.registro-info small {
  color: #737d87;
}

.estado-aviso {
  padding: 15px;
  border-left: 4px solid #b34a58;
  border-radius: 8px;
  background: #fff3f3;
}

.estado-aviso.reactivar {
  border-left-color: #245a81;
  background: #eef6fb;
}

.estado-aviso strong {
  color: #431c2a;
  font-size: 12px;
}

.estado-aviso p {
  margin: 8px 0 0;
  color: #686d76;
  font-size: 12px;
  line-height: 1.7;
}

.campo-motivo {
  display: grid;
  gap: 9px;
}

.campo-motivo span {
  color: #3c3e46;
  font-size: 12px;
  font-weight: 800;
}

.campo-motivo textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 12px;
  border: 1px solid #d7d8dc;
  border-radius: 9px;
  font: inherit;
  font-size: 12px;
  resize: vertical;
}

.campo-motivo textarea:focus {
  outline: 2px solid #245a81;
  outline-offset: 2px;
}

.campo-motivo small {
  color: #80838a;
  font-size: 10px;
}

.estado-error {
  padding: 12px;
  border-radius: 8px;
  color: #9f273b;
  background: #fff0f2;
  font-size: 12px;
}

.estado-acciones {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 16px;
  border-top: 1px solid #ece6e7;
}

.estado-acciones button {
  padding: 11px 16px;
  border-radius: 9px;
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.btn-cancelar {
  border: 1px solid #e3d6d9;
  background: #faf6f7;
  color: #70273b;
}

.btn-confirmar {
  border: 1px solid #a53248;
  background: #a53248;
  color: white;
}

.btn-confirmar.reactivar {
  border-color: #245a81;
  background: #245a81;
}

button:disabled {
  opacity: .5;
  cursor: not-allowed;
}

@media (max-width: 480px) {
  .estado-contenido,
  .estado-header {
    padding: 17px;
  }

  .estado-acciones button {
    flex: 1;
  }
}
</style>
