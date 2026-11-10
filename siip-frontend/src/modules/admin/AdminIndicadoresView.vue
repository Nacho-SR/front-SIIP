
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

const router = useRouter();

const busqueda = ref('');
const filtro = ref<'todos' | 'activos' | 'inactivos'>(
  'todos'
);

const seleccionado = ref<IndicadorAdmin | null>(null);
const procesando = ref(false);
const errorEstado = ref('');
const exito = ref('');

const filtrados = computed(() => {
  const termino = busqueda.value.trim().toLocaleLowerCase('es');

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

async function cargarIndicadores() {
  try {
    await refrescarAdmin();
  } catch (error) {
    adminState.error = mensajeError(error);
  }
}

function abrirEstado(indicador: IndicadorAdmin) {
  seleccionado.value = indicador;
  errorEstado.value = '';
  exito.value = '';
}

function cerrarEstado() {
  if (procesando.value) return;

  seleccionado.value = null;
  errorEstado.value = '';
}

async function confirmarEstado(
  datos: { activo: boolean }
) {
  if (!seleccionado.value || procesando.value) return;

  const id = seleccionado.value.id;

  procesando.value = true;
  errorEstado.value = '';

  try {
    const { data } = await api.patch<IndicadorAdmin>(
      `/administracion/indicadores/${encodeURIComponent(id)}/estado`,
      datos
    );

    const index = adminState.indicadores.findIndex(
      indicador => indicador.id === data.id
    );

    if (index >= 0) {
      adminState.indicadores.splice(index, 1, data);
    }

    exito.value = data.activo
      ? 'Indicador reactivado correctamente.'
      : 'Indicador desactivado correctamente.';

    seleccionado.value = null;
  } catch (error) {
    errorEstado.value = mensajeError(error);
  } finally {
    procesando.value = false;
  }
}

onMounted(() => {
  void cargarIndicadores();
});
</script>

<template>
  <section class="panel indicadores-admin">
    <div class="panel-header">
      <div>
        <span class="eyebrow">
          CATÁLOGO METODOLÓGICO
        </span>

        <h2>Gestión de indicadores</h2>

        <p>
          Consulta, edita, desactiva y reactiva
          las fichas metodológicas registradas
          en el SIIP Salamanca.
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

    <p
      v-if="exito"
      class="mensaje"
      role="status"
    >
      {{ exito }}
    </p>

    <!-- FILTROS -->
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

    <!-- CARGA -->
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

    <!-- TABLA -->
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

            <td>{{ indicador.campos.nombre }}</td>
            <td>{{ indicador.campos.agrupacion }}</td>
            <td>{{ indicador.campos.familia }}</td>
            <td>{{ indicador.campos.frecuencia }}</td>

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

            <td>
              <div class="acciones-iconos">

                <!-- EDITAR -->
                <button
                  type="button"
                  class="accion-icono editar"
                  :title="'Editar indicador'"
                  :aria-label="
                    `Editar ${indicador.campos.nombre}`
                  "
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

                <!-- DESACTIVAR / REACTIVAR -->
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
                      : 'Reactivar indicador'
                  "
                  :aria-label="
                    `${indicador.activo ? 'Desactivar' : 'Reactivar'} ${indicador.campos.nombre}`
                  "
                  :disabled="procesando"
                  @click="abrirEstado(indicador)"
                >
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

          <tr v-if="filtrados.length === 0">
            <td colspan="7" class="vacio">
              No hay indicadores que coincidan
              con la búsqueda.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- MODAL DE ESTADO -->
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

.acciones-iconos {
  display: flex;
  align-items: center;
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
  transition: transform .2s ease;
}

.accion-icono svg {
  width: 17px;
  height: 17px;
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
}

.accion-icono:disabled {
  opacity: .5;
  cursor: not-allowed;
}

.accion-icono:focus-visible {
  outline: 2px solid #c69a4b;
  outline-offset: 2px;
}
</style>
