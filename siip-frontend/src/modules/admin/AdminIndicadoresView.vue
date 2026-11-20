
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';

import api from '../../core/api';

import EstadoRegistroModal from
  './components/EstadoRegistroModal.vue';

import {
  adminState,
  refrescarAdmin,
  type IndicadorAdmin
} from './data/admin.store';

// ============================================
// ESTADO DEL COMPONENTE
// ============================================

const router = useRouter();

const busqueda = ref('');

const filtro = ref<'todos' | 'activos' | 'inactivos'>(
  'todos'
);

const seleccionado = ref<IndicadorAdmin | null>(null);

const procesando = ref(false);
const errorEstado = ref('');
const exito = ref('');

// ============================================
// CONTADORES DE INDICADORES
// ============================================

// Se calculan sobre el catálogo completo,
// independientemente de la búsqueda y filtros.

const totalIndicadores = computed(() =>
  adminState.indicadores.length
);

const totalActivos = computed(() =>
  adminState.indicadores.filter(
    indicador => indicador.activo
  ).length
);

const totalInactivos = computed(() =>
  adminState.indicadores.filter(
    indicador => !indicador.activo
  ).length
);

// ============================================
// FILTRADO DE INDICADORES
// ============================================

const filtrados = computed(() => {
  const termino = busqueda.value
    .trim()
    .toLocaleLowerCase('es');

  return adminState.indicadores.filter(indicador => {
    const campos = indicador.campos;

    const coincideBusqueda = [
      campos.clave,
      campos.nombre,
      campos.agrupacion,
      campos.familia
    ].some(valor =>
      (valor ?? '')
        .toLocaleLowerCase('es')
        .includes(termino)
    );

    const coincideEstado =
      filtro.value === 'todos' ||
      indicador.activo === (filtro.value === 'activos');

    return coincideBusqueda && coincideEstado;
  });
});

// ============================================
// NAVEGACIÓN
// ============================================

function nuevoIndicador() {
  void router.push({
    name: 'AdministradorNuevoIndicador'
  });
}

function editarIndicador(id: string) {
  void router.push({
    name: 'AdministradorNuevoIndicador',
    query: { ver: id }
  });
}

function configurarVariables(id: string) {
  void router.push({
    name: 'AdministradorVariablesIndicador',
    params: { id }
  });
}

function configurarActivacion(id: string) {
  void router.push({
    name: 'AdministradorActivacionIndicador',
    params: { id }
  });
}

// ============================================
// MANEJO DE ERRORES
// ============================================

function mensajeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as {
      detail?: string;
      message?: string;
    } | undefined;

    return (
      data?.detail ||
      data?.message ||
      'No se pudo completar la operación.'
    );
  }

  return 'Ocurrió un error inesperado.';
}

// ============================================
// CARGAR INDICADORES
// ============================================

async function cargarIndicadores() {
  try {
    await refrescarAdmin();
  } catch (error) {
    adminState.error = mensajeError(error);
  }
}

// ============================================
// ACTIVAR / DESACTIVAR
// ============================================

function abrirEstado(indicador: IndicadorAdmin) {
  if (procesando.value) return;

  // Los indicadores inactivos requieren
  // configuración de metodología y periodo.

  if (!indicador.activo) {
    configurarActivacion(indicador.id);
    return;
  }

  // Los activos pueden desactivarse
  // mediante el modal de confirmación.

  seleccionado.value = indicador;
  errorEstado.value = '';
  exito.value = '';
}

function cerrarEstado() {
  if (procesando.value) return;

  seleccionado.value = null;
  errorEstado.value = '';
}

// ============================================
// CONFIRMAR DESACTIVACIÓN
// ============================================

async function confirmarEstado(
  datos: { activo: boolean }
) {
  if (
    !seleccionado.value ||
    procesando.value ||
    datos.activo
  ) {
    return;
  }

  const id = seleccionado.value.id;

  procesando.value = true;
  errorEstado.value = '';
  exito.value = '';

  try {
    const { data } = await api.patch<IndicadorAdmin>(
      `/administracion/indicadores/${encodeURIComponent(id)}/estado`,
      { activo: false }
    );

    const index = adminState.indicadores.findIndex(
      indicador => indicador.id === data.id
    );

    if (index >= 0) {
      adminState.indicadores.splice(index, 1, data);
    }

    exito.value = 'Indicador desactivado correctamente.';

    seleccionado.value = null;

  } catch (error) {
    errorEstado.value = mensajeError(error);

  } finally {
    procesando.value = false;
  }
}

// ============================================
// INICIALIZACIÓN
// ============================================

onMounted(() => {
  void cargarIndicadores();
});
</script>

<template>
  <section class="panel indicadores-admin">

    <!-- =====================================
         ENCABEZADO
    ====================================== -->

    <div class="panel-header">
      <div>
        <span class="eyebrow">
          CATÁLOGO METODOLÓGICO
        </span>

        <h2>Gestión de indicadores</h2>

        <p>
          Consulta, edita y administra las fichas
          metodológicas registradas en SIIP Salamanca.
        </p>
      </div>

      <button
        type="button"
        class="btn-principal"
        @click="nuevoIndicador"
      >
        + Nuevo indicador
      </button>
    </div>

    <!-- =====================================
         MENSAJES
    ====================================== -->

    <p
      v-if="exito"
      class="mensaje"
      role="status"
    >
      {{ exito }}
    </p>

    <!-- =====================================
         CONTADORES DE INDICADORES
    ====================================== -->

    <div
      class="contadores-indicadores"
      aria-label="Resumen de indicadores"
    >

      <!-- TOTAL -->

      <div class="contador-indicador">
        <span>Total</span>

        <strong>
          {{ totalIndicadores }}
        </strong>
      </div>

      <!-- ACTIVOS -->

      <div class="contador-indicador">
        <span>Activos</span>

        <strong>
          {{ totalActivos }}
        </strong>
      </div>

      <!-- INACTIVOS -->

      <div class="contador-indicador">
        <span>Inactivos</span>

        <strong>
          {{ totalInactivos }}
        </strong>
      </div>

    </div>

    <!-- =====================================
         FILTROS
    ====================================== -->

    <div class="filtros-indicadores">

      <input
        v-model="busqueda"
        type="search"
        aria-label="Buscar indicadores"
        placeholder="Buscar clave, nombre, agrupación o familia..."
      />

      <select
        v-model="filtro"
        aria-label="Filtrar indicadores por estado"
      >
        <option value="todos">Todos</option>
        <option value="activos">Activos</option>
        <option value="inactivos">Inactivos</option>
      </select>

      <button
        type="button"
        class="btn-secundario"
        :disabled="adminState.cargando || procesando"
        @click="cargarIndicadores"
      >
        Actualizar
      </button>

    </div>

    <!-- =====================================
         ESTADO DE CARGA
    ====================================== -->

    <p
      v-if="adminState.cargando"
      class="nota"
      role="status"
    >
      Cargando indicadores...
    </p>

    <div v-else-if="adminState.error">
      <p class="error" role="alert">
        {{ adminState.error }}
      </p>

      <button
        type="button"
        class="btn-secundario"
        @click="cargarIndicadores"
      >
        Reintentar
      </button>
    </div>

    <!-- =====================================
         TABLA DE INDICADORES
    ====================================== -->

    <div v-else class="tabla-scroll">
      <table>
        <thead>
          <tr>
            <th>Clave</th>
            <th>Nombre</th>
            <th>Agrupación</th>
            <th>Familia</th>
            <th>Frecuencia</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="indicador in filtrados"
            :key="indicador.id"
          >

            <td>
              <strong>
                {{ indicador.campos.clave }}
              </strong>
            </td>

            <td>
              {{ indicador.campos.nombre }}
            </td>

            <td>
              {{ indicador.campos.agrupacion }}
            </td>

            <td>
              {{ indicador.campos.familia }}
            </td>

            <td>
              {{ indicador.campos.frecuencia }}
            </td>

            <!-- ESTADO -->

            <td>
              <span
                class="estado"
                :class="
                  indicador.activo
                    ? 'activo'
                    : 'inactivo'
                "
              >
                {{
                  indicador.activo
                    ? 'Activo'
                    : 'Inactivo'
                }}
              </span>
            </td>

            <!-- ACCIONES -->

            <td>
              <div class="acciones-iconos">

                <!-- CONFIGURAR VARIABLES -->

                <button
                  type="button"
                  class="accion-icono variables"
                  title="Variables y dependencias"
                  :aria-label="`Configurar variables de ${indicador.campos.nombre}`"
                  :disabled="procesando"
                  @click="configurarVariables(indicador.id)"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="3" />

                    <path
                      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-1.91 1.91-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V20h-2.7v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06-1.91-1.91.06-.06A1.65 1.65 0 0 0 7.9 15a1.65 1.65 0 0 0-1.51-1H6.3v-2.7h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06 1.91-1.91.06.06a1.65 1.65 0 0 0 1.82.33 1.65 1.65 0 0 0 1-1.51V5.3H15v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06 1.91 1.91-.06.06a1.65 1.65 0 0 0-.33 1.82 1.65 1.65 0 0 0 1.51 1H21v2.7h-.09A1.65 1.65 0 0 0 19.4 15Z"
                    />
                  </svg>
                </button>

                <!-- EDITAR INDICADOR -->

                <button
                  type="button"
                  class="accion-icono editar"
                  title="Editar indicador"
                  :aria-label="`Editar ${indicador.campos.nombre}`"
                  :disabled="procesando"
                  @click="editarIndicador(indicador.id)"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 20h9" />

                    <path
                      d="M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4Z"
                    />
                  </svg>
                </button>

                <!-- DESACTIVAR / CONFIGURAR ACTIVACIÓN -->

                <button
                  type="button"
                  class="accion-icono"
                  :class="
                    indicador.activo
                      ? 'desactivar'
                      : 'reactivar'
                  "
                  :title="
                    indicador.activo
                      ? 'Desactivar indicador'
                      : 'Configurar activación'
                  "
                  :aria-label="
                    `${indicador.activo ? 'Desactivar' : 'Configurar activación de'} ${indicador.campos.nombre}`
                  "
                  :disabled="procesando"
                  @click="abrirEstado(indicador)"
                >

                  <!-- ICONO DESACTIVAR -->

                  <svg
                    v-if="indicador.activo"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path
                      d="M18.36 6.64a9 9 0 1 1-12.73 0"
                    />
                    <path d="M12 2v10" />
                  </svg>

                  <!-- ICONO ACTIVACIÓN -->

                  <svg
                    v-else
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 12a9 9 0 1 0 3-6.7L3 8"
                    />
                    <path d="M3 3v5h5" />
                  </svg>

                </button>

              </div>
            </td>

          </tr>

          <!-- SIN RESULTADOS -->

          <tr v-if="filtrados.length === 0">
            <td colspan="7" class="vacio">
              No hay indicadores que coincidan
              con la búsqueda.
            </td>
          </tr>

        </tbody>
      </table>
    </div>

    <!-- =====================================
         MODAL DE DESACTIVACIÓN
    ====================================== -->

    <EstadoRegistroModal
      v-if="seleccionado"
      :abierto="true"
      entidad="indicador"
      :nombre="seleccionado.campos.nombre"
      :activo="seleccionado.activo"
      :procesando="procesando"
      :error="errorEstado"
      @cerrar="cerrarEstado"
      @confirmar="confirmarEstado"
    />

  </section>
</template>

<style scoped>
/* ============================================
   CONTADORES DE INDICADORES
============================================ */

.contadores-indicadores {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 17px 0;
}

.contador-indicador {
  display: grid;
  gap: 7px;
  min-width: 0;
  padding: 14px;

  border: 1px solid #e6ebef;
  border-radius: 10px;

  background: #f5f7fa;

  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.contador-indicador span {
  color: #757b85;
  font-size: 11px;
}

.contador-indicador strong {
  color: #245a81;
  font-size: 20px;
  font-weight: 800;
  line-height: 1.2;
}

/* ============================================
   FILTROS
============================================ */

.filtros-indicadores {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 20px 0;
}

.filtros-indicadores input {
  flex: 1;
  min-width: 200px;
}

.filtros-indicadores input,
.filtros-indicadores select {
  padding: 10px 12px;
  border: 1px solid #d7dfe5;
  border-radius: 9px;
  background: #fff;
  color: #34383f;
  font: inherit;
  font-size: 12px;
}

/* ============================================
   TABLA
============================================ */

th:last-child {
  text-align: center;
}

/* ============================================
   ACCIONES
============================================ */

.acciones-iconos {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.accion-icono {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 9px;
  cursor: pointer;

  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.accion-icono svg {
  width: 17px;
  height: 17px;
}

.accion-icono.variables {
  background: #f1eefb;
  color: #635099;
}

.accion-icono.editar {
  background: #eef5fa;
  color: #245a81;
}

.accion-icono.desactivar {
  background: #fff0f2;
  color: #962c43;
}

.accion-icono.reactivar {
  background: #eaf7f0;
  color: #24624c;
}

.accion-icono:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgb(0 0 0 / 8%);
}

.accion-icono:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.accion-icono:focus-visible {
  outline: 2px solid #c69a4b;
  outline-offset: 2px;
}

/* ============================================
   DISEÑO RESPONSIVO
============================================ */

@media (max-width: 480px) {
  .contadores-indicadores {
    gap: 8px;
  }

  .contador-indicador {
    padding: 11px 9px;
    border-radius: 9px;
  }

  .contador-indicador span {
    font-size: 10px;
  }

  .contador-indicador strong {
    font-size: 18px;
  }
}
</style>
