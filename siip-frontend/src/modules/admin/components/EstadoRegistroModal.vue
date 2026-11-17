
<script setup lang="ts">
import { computed, ref, toRef } from 'vue';

import { useDialogFocus } from '../../../core/useDialogFocus';

// ============================================
// TIPOS
// ============================================

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

// ============================================
// PROPIEDADES
// ============================================

const props = withDefaults(defineProps<Props>(), {
  procesando: false,
  error: ''
});

// ============================================
// EVENTOS
// ============================================

const emit = defineEmits<{
  (e: 'cerrar'): void;
  (e: 'confirmar', datos: {
    activo: boolean;
  }): void;
}>();

// ============================================
// REFERENCIAS Y ACCESIBILIDAD
// ============================================

const dialogo = ref<HTMLElement | null>(null);

// ============================================
// DATOS COMPUTADOS
// ============================================

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

const requiereConfiguracion = computed(() =>
  props.entidad === 'indicador' && !props.activo
);

// ============================================
// CERRAR MODAL
// ============================================

function cerrar() {
  if (props.procesando) return;

  emit('cerrar');
}

// ============================================
// CONFIRMAR CAMBIO DE ESTADO
// ============================================

function confirmar() {
  if (props.procesando) return;

  // Los indicadores no pueden reactivarse
  // directamente desde este modal.
  if (requiereConfiguracion.value) return;

  emit('confirmar', {
    activo: !props.activo
  });
}

// ============================================
// CONTROL DEL FOCO DEL MODAL
// ============================================

useDialogFocus(
  dialogo,
  toRef(props, 'abierto'),
  cerrar
);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="abierto"
      class="estado-overlay"
      @click.self="cerrar"
    >
      <section
        ref="dialogo"
        class="estado-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="estado-titulo"
        tabindex="-1"
      >

        <!-- =================================
             ENCABEZADO
        ================================== -->

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

        <!-- =================================
             CONTENIDO
        ================================== -->

        <form
          class="estado-contenido"
          @submit.prevent="confirmar"
        >

          <!-- INFORMACIÓN DEL REGISTRO -->

          <div class="registro-info">
            <span>
              REGISTRO SELECCIONADO
            </span>

            <strong>
              {{ nombre }}
            </strong>

            <small>
              Estado actual:
              {{ activo ? 'Activo' : 'Inactivo' }}
            </small>
          </div>

          <!-- AVISO DE CAMBIO DE ESTADO -->

          <div
            class="estado-aviso"
            :class="{
              reactivar: !activo
            }"
          >
            <strong>
              {{
                activo
                  ? 'Confirmar desactivación'
                  : requiereConfiguracion
                    ? 'Configuración de activación requerida'
                    : 'Confirmar reactivación'
              }}
            </strong>

            <!-- DESACTIVACIÓN -->

            <p v-if="activo">
              El registro dejará de estar disponible
              para las operaciones correspondientes.

              Su información e historial
              se conservarán.
            </p>

            <!-- ACTIVACIÓN DE INDICADORES -->

            <p v-else-if="requiereConfiguracion">
              Para activar nuevamente este indicador
              debes comprobar su metodología y
              seleccionar un periodo inicial completo
              posterior al periodo de la activación
              anterior.

              Las activaciones anteriores
              se conservarán en el historial.
            </p>

            <!-- REACTIVACIÓN DE OTROS REGISTROS -->

            <p v-else>
              El registro volverá a estar disponible,
              siempre que cumpla las restricciones
              de activación del sistema.
            </p>
          </div>

          <!-- ERROR -->

          <p
            v-if="error"
            class="estado-error"
            role="alert"
          >
            {{ error }}
          </p>

          <!-- =================================
               ACCIONES
          ================================== -->

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
              :class="{
                reactivar: !activo
              }"
              :disabled="
                procesando ||
                requiereConfiguracion
              "
            >
              {{
                procesando
                  ? 'Procesando...'
                  : requiereConfiguracion
                    ? 'Requiere configuración'
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
/* ============================================
   FONDO DEL MODAL
============================================ */

.estado-overlay {
  position: fixed;
  inset: 0;
  z-index: 1500;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(24, 19, 27, 0.7);
  backdrop-filter: blur(5px);
  font-family: Manrope, sans-serif;
}

/* ============================================
   CONTENEDOR
============================================ */

.estado-modal {
  width: min(520px, 100%);
  max-height: 92dvh;
  overflow-y: auto;
  border-radius: 16px;
  background: white;
  box-shadow: 0 25px 75px #0003;
}

.estado-modal:focus {
  outline: none;
}

/* ============================================
   ENCABEZADO
============================================ */

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
  letter-spacing: 0.1em;
}

.estado-header h2 {
  margin: 8px 0 0;
  color: #431c2a;
  font-size: 20px;
}

/* ============================================
   BOTÓN CERRAR
============================================ */

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

/* ============================================
   CONTENIDO
============================================ */

.estado-contenido {
  display: grid;
  gap: 20px;
  padding: 24px;
}

/* ============================================
   INFORMACIÓN DEL REGISTRO
============================================ */

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

/* ============================================
   AVISO
============================================ */

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

/* ============================================
   ERRORES
============================================ */

.estado-error {
  padding: 12px;
  border-radius: 8px;
  color: #9f273b;
  background: #fff0f2;
  font-size: 12px;
}

/* ============================================
   BOTONES
============================================ */

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

.estado-acciones button:focus-visible,
.cerrar:focus-visible {
  outline: 2px solid #c69a4b;
  outline-offset: 2px;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ============================================
   RESPONSIVE
============================================ */

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
