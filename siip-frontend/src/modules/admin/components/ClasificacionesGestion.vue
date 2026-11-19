
<script setup lang="ts">
import {
  computed,
  onMounted,
  reactive,
  ref,
  watch
} from 'vue';

import axios from 'axios';
import api from '../../../core/api';
import { useDialogFocus } from '../../../core/useDialogFocus';

import EstadoRegistroModal from './EstadoRegistroModal.vue';

// ============================================
// TIPOS
// ============================================

interface Registro {
  id: string;
  codigo: string;
  nombre: string;
  activo: boolean;
  agrupacion_id?: string;
  agrupacion_nombre?: string;
}

type Tipo = 'agrupaciones' | 'familias';
type Filtro = 'todos' | 'activos' | 'inactivos';

const props = defineProps<{
  tipo: Tipo;
}>();

// ============================================
// ESTADO
// ============================================

const registros = ref<Registro[]>([]);
const agrupaciones = ref<Registro[]>([]);

const cargando = ref(false);
const procesando = ref(false);

const errorCarga = ref('');
const errorModal = ref('');
const exito = ref('');

const busqueda = ref('');
const filtro = ref<Filtro>('todos');

// Modal de edición y creación.
const editar = ref<Registro | null>(null);
const creando = ref(false);

// Modal para cambiar estado.
const cambiar = ref<Registro | null>(null);

const modalEditarAbierto = computed(
  () => creando.value || editar.value !== null
);

const modalEditarDialog =
  ref<HTMLElement | null>(null);

const form = reactive({
  codigo: '',
  nombre: '',
  agrupacion_id: ''
});

// ============================================
// TEXTOS DE LA SECCIÓN
// ============================================

const titulo = computed(() =>
  props.tipo === 'familias'
    ? 'Familias'
    : 'Agrupaciones Temáticas'
);

const tipoEntidad = computed<
  'familia' | 'agrupacion'
>(() =>
  props.tipo === 'familias'
    ? 'familia'
    : 'agrupacion'
);

const tituloModal = computed(() => {
  const accion = creando.value
    ? 'Agregar'
    : 'Editar';

  return `${accion} ${
    props.tipo === 'familias'
      ? 'familia'
      : 'agrupación temática'
  }`;
});

// ============================================
// CONTADORES
// ============================================

const totalRegistros = computed(
  () => registros.value.length
);

const totalActivos = computed(() =>
  registros.value.filter(
    registro => registro.activo
  ).length
);

const totalInactivos = computed(() =>
  registros.value.filter(
    registro => !registro.activo
  ).length
);

// ============================================
// FILTRADO
// ============================================

const filtrados = computed(() => {
  const termino = busqueda.value
    .trim()
    .toLocaleLowerCase('es');

  return registros.value.filter(registro => {
    const coincideBusqueda = [
      registro.codigo,
      registro.nombre,
      registro.agrupacion_nombre ?? ''
    ].some(valor =>
      valor
        .toLocaleLowerCase('es')
        .includes(termino)
    );

    const coincideEstado =
      filtro.value === 'todos' ||
      registro.activo ===
        (filtro.value === 'activos');

    return coincideBusqueda && coincideEstado;
  });
});

// ============================================
// CONTROL DE FOCO DEL MODAL
// ============================================

useDialogFocus(
  modalEditarDialog,
  modalEditarAbierto,
  cerrarEditar
);

// ============================================
// ERRORES
// ============================================

function mensajeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as {
      detail?: string;
      message?: string;
    } | undefined;

    if (!error.response) {
      return 'No se pudo establecer conexión con el servidor.';
    }

    return (
      data?.detail ||
      data?.message ||
      `Error HTTP ${error.response.status}.`
    );
  }

  return error instanceof Error
    ? error.message
    : 'No se pudo completar la operación.';
}

// ============================================
// CARGAR REGISTROS
// ============================================

async function cargar() {
  if (procesando.value) return;

  const tipo = props.tipo;

  cargando.value = true;
  errorCarga.value = '';

  try {
    if (tipo === 'familias') {
      const [
        respuestaRegistros,
        respuestaAgrupaciones
      ] = await Promise.all([
        api.get<Registro[]>(
          '/administracion/familias'
        ),

        api.get<Registro[]>(
          '/administracion/agrupaciones'
        )
      ]);

      if (props.tipo !== tipo) return;

      registros.value = respuestaRegistros.data;
      agrupaciones.value =
        respuestaAgrupaciones.data;

    } else {
      const respuesta = await api.get<Registro[]>(
        '/administracion/agrupaciones'
      );

      if (props.tipo !== tipo) return;

      registros.value = respuesta.data;
      agrupaciones.value = [];
    }

  } catch (error) {
    if (props.tipo === tipo) {
      errorCarga.value = mensajeError(error);
    }

  } finally {
    if (props.tipo === tipo) {
      cargando.value = false;
    }
  }
}

// ============================================
// REINICIAR FORMULARIO
// ============================================

function limpiarFormulario() {
  Object.assign(form, {
    codigo: '',
    nombre: '',
    agrupacion_id: ''
  });
}

// ============================================
// ABRIR MODAL DE CREACIÓN
// ============================================

function abrirCrear() {
  if (
    cargando.value ||
    procesando.value ||
    errorCarga.value
  ) {
    return;
  }

  editar.value = null;
  creando.value = true;

  cambiar.value = null;

  errorModal.value = '';
  exito.value = '';

  limpiarFormulario();
}

// ============================================
// ABRIR MODAL DE EDICIÓN
// ============================================

function abrirEditar(registro: Registro) {
  if (
    procesando.value ||
    cargando.value
  ) {
    return;
  }

  creando.value = false;
  editar.value = registro;

  cambiar.value = null;

  errorModal.value = '';
  exito.value = '';

  Object.assign(form, {
    codigo: registro.codigo,
    nombre: registro.nombre,
    agrupacion_id:
      registro.agrupacion_id ?? ''
  });
}

// ============================================
// CERRAR MODAL CREAR / EDITAR
// ============================================

function cerrarEditar() {
  if (procesando.value) return;

  editar.value = null;
  creando.value = false;

  errorModal.value = '';

  limpiarFormulario();
}

// ============================================
// GUARDAR CREACIÓN O EDICIÓN
// ============================================

async function guardar() {
  if (
    (!creando.value && !editar.value) ||
    procesando.value
  ) {
    return;
  }

  const esNuevo = creando.value;
  const id = editar.value?.id;
  const tipo = props.tipo;

  procesando.value = true;
  errorModal.value = '';

  let guardado = false;

  try {
    const payload = tipo === 'familias'
      ? {
          codigo: form.codigo.trim().toUpperCase(),
          nombre: form.nombre.trim(),
          agrupacion_id: form.agrupacion_id
        }
      : {
          codigo: form.codigo.trim(),
          nombre: form.nombre.trim()
        };

    let data: Registro;

    if (esNuevo) {
      // --------------------------------------
      // CREAR
      // --------------------------------------

      const respuesta = await api.post<Registro>(
        `/administracion/${tipo}`,
        payload
      );

      data = respuesta.data;

      registros.value.push(data);

    } else {
      // --------------------------------------
      // EDITAR
      // --------------------------------------

      if (!id) {
        return;
      }

      const respuesta = await api.patch<Registro>(
        `/administracion/${tipo}/${encodeURIComponent(id)}`,
        payload
      );

      data = respuesta.data;

      const indice = registros.value.findIndex(
        registro => registro.id === data.id
      );

      if (indice >= 0) {
        registros.value.splice(indice, 1, data);
      }
    }

    exito.value = esNuevo
      ? (
          tipo === 'familias'
            ? 'Familia creada correctamente.'
            : 'Agrupación temática creada correctamente.'
        )
      : 'Cambios guardados correctamente.';

    guardado = true;

  } catch (error) {
    errorModal.value = mensajeError(error);

  } finally {
    procesando.value = false;
  }

  if (guardado) {
    cerrarEditar();
    await cargar();
  }
}

// ============================================
// ABRIR CAMBIO DE ESTADO
// ============================================

function abrirEstado(registro: Registro) {
  if (
    procesando.value ||
    cargando.value
  ) {
    return;
  }

  cambiar.value = registro;

  errorModal.value = '';
  exito.value = '';
}

// ============================================
// CERRAR CAMBIO DE ESTADO
// ============================================

function cerrarEstado() {
  if (procesando.value) return;

  cambiar.value = null;
  errorModal.value = '';
}

// ============================================
// ACTIVAR / DESACTIVAR
// ============================================

async function confirmarEstado(
  datos: { activo: boolean }
) {
  if (
    !cambiar.value ||
    procesando.value
  ) {
    return;
  }

  const id = cambiar.value.id;
  const tipo = props.tipo;

  procesando.value = true;
  errorModal.value = '';

  let guardado = false;

  try {
    const { data } = await api.patch<Registro>(
      `/administracion/${tipo}/${encodeURIComponent(id)}/estado`,
      datos
    );

    const indice = registros.value.findIndex(
      registro => registro.id === data.id
    );

    if (indice >= 0) {
      registros.value.splice(indice, 1, data);
    }

    exito.value = datos.activo
      ? 'Registro reactivado correctamente.'
      : 'Registro desactivado correctamente.';

    guardado = true;

  } catch (error) {
    errorModal.value = mensajeError(error);

  } finally {
    procesando.value = false;
  }

  if (guardado) {
    cerrarEstado();
    await cargar();
  }
}

// ============================================
// CAMBIO DE SECCIÓN
// ============================================

watch(
  () => props.tipo,
  () => {
    registros.value = [];
    agrupaciones.value = [];

    editar.value = null;
    creando.value = false;
    cambiar.value = null;

    errorModal.value = '';
    errorCarga.value = '';
    exito.value = '';

    limpiarFormulario();

    busqueda.value = '';
    filtro.value = 'todos';

    void cargar();
  }
);

// ============================================
// INICIALIZACIÓN
// ============================================

onMounted(() => {
  void cargar();
});
</script>

<template>
  <section class="panel clasificaciones-admin">

    <!-- =====================================
         ENCABEZADO
    ====================================== -->

    <div class="panel-header">
      <div>
        <span class="eyebrow">
          CATÁLOGO INSTITUCIONAL
        </span>

        <h2>{{ titulo }}</h2>

        <p>
          Consulta, agrega, edita, desactiva y
          reactiva los registros del catálogo
          institucional.
        </p>
      </div>

      <button
        type="button"
        class="btn-principal"
        :disabled="
          cargando ||
          procesando ||
          !!errorCarga
        "
        @click="abrirCrear"
      >
        {{
          tipo === 'familias'
            ? '+ Agregar familia'
            : '+ Agregar agrupación temática'
        }}
      </button>
    </div>

    <!-- =====================================
         NOTIFICACIÓN
    ====================================== -->

    <p
      v-if="exito"
      class="mensaje"
      role="status"
    >
      {{ exito }}
    </p>

    <!-- =====================================
         CONTADORES
    ====================================== -->

    <div class="clas-resumen">
      <div>
        <span>Total</span>
        <strong>{{ totalRegistros }}</strong>
      </div>

      <div>
        <span>Activos</span>
        <strong>{{ totalActivos }}</strong>
      </div>

      <div>
        <span>Inactivos</span>
        <strong>{{ totalInactivos }}</strong>
      </div>
    </div>

    <!-- =====================================
         FILTROS
    ====================================== -->

    <div class="clas-filtros">
      <input
        v-model="busqueda"
        type="search"
        aria-label="Buscar registros"
        placeholder="Buscar por código o nombre..."
      />

      <select
        v-model="filtro"
        aria-label="Filtrar por estado"
      >
        <option value="todos">
          Todos
        </option>

        <option value="activos">
          Activos
        </option>

        <option value="inactivos">
          Inactivos
        </option>
      </select>

      <button
        type="button"
        class="btn-secundario"
        :disabled="
          cargando ||
          procesando
        "
        @click="cargar"
      >
        Actualizar
      </button>
    </div>

    <!-- =====================================
         ESTADOS DE CARGA
    ====================================== -->

    <p
      v-if="errorCarga"
      class="error"
      role="alert"
    >
      {{ errorCarga }}
    </p>

    <p
      v-if="cargando"
      class="nota"
      role="status"
    >
      Cargando registros...
    </p>

    <!-- =====================================
         TABLA
    ====================================== -->

    <div
      v-else-if="!errorCarga"
      class="tabla-scroll"
    >
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Nombre</th>

            <th v-if="tipo === 'familias'">
              Agrupación temática
            </th>

            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="registro in filtrados"
            :key="registro.id"
          >
            <td>
              <strong>
                {{ registro.codigo }}
              </strong>
            </td>

            <td>
              {{ registro.nombre }}
            </td>

            <td v-if="tipo === 'familias'">
              {{ registro.agrupacion_nombre }}
            </td>

            <td>
              <span
                class="estado"
                :class="
                  registro.activo
                    ? 'activo'
                    : 'inactivo'
                "
              >
                {{
                  registro.activo
                    ? 'Activo'
                    : 'Inactivo'
                }}
              </span>
            </td>

            <td>
              <div class="clas-acciones">

                <!-- EDITAR -->

                <button
                  type="button"
                  class="clas-icono editar"
                  title="Editar"
                  :aria-label="
                    `Editar ${registro.nombre}`
                  "
                  :disabled="procesando"
                  @click="abrirEditar(registro)"
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

                <!-- ACTIVAR / DESACTIVAR -->

                <button
                  type="button"
                  class="clas-icono"
                  :class="
                    registro.activo
                      ? 'desactivar'
                      : 'reactivar'
                  "
                  :title="
                    registro.activo
                      ? 'Desactivar'
                      : 'Reactivar'
                  "
                  :aria-label="
                    `${registro.activo ? 'Desactivar' : 'Reactivar'} ${registro.nombre}`
                  "
                  :disabled="procesando"
                  @click="abrirEstado(registro)"
                >
                  <svg
                    v-if="registro.activo"
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

          <!-- SIN RESULTADOS -->

          <tr v-if="filtrados.length === 0">
            <td
              :colspan="
                tipo === 'familias'
                  ? 5
                  : 4
              "
              class="vacio"
            >
              No hay registros que coincidan
              con los filtros seleccionados.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- =====================================
         MODAL CREAR / EDITAR
    ====================================== -->

    <Teleport to="body">
      <div
        v-if="modalEditarAbierto"
        class="modal-fondo admin-modal"
        @click.self="cerrarEditar"
      >
        <section
          ref="modalEditarDialog"
          class="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-editar-clasificacion"
          tabindex="-1"
        >

          <header class="modal-header">
            <div>
              <span class="eyebrow">
                GESTIÓN DEL CATÁLOGO
              </span>

              <h2 id="titulo-editar-clasificacion">
                {{ tituloModal }}
              </h2>

              <p>
                {{
                  creando
                    ? 'Completa los datos para registrar una nueva clasificación.'
                    : 'Modifica los datos del registro seleccionado.'
                }}
              </p>
            </div>

            <button
              type="button"
              class="cerrar"
              aria-label="Cerrar modal"
              :disabled="procesando"
              @click="cerrarEditar"
            >
              ×
            </button>
          </header>

          <form
            class="modal-form"
            @submit.prevent="guardar"
          >

            <fieldset
              class="campos-form"
              :disabled="procesando"
            >

              <!-- CÓDIGO -->

              <label>
                Código

                <input
                  v-model.trim="form.codigo"
                  required
                  :maxlength="
                    tipo === 'familias'
                      ? 3
                      : 2
                  "
                  :pattern="
                    tipo === 'familias'
                      ? 'F[0-9]{2}'
                      : '[0-9]{2}'
                  "
                  autocomplete="off"
                  :placeholder="
                    tipo === 'familias'
                      ? 'Ej. F55'
                      : 'Ej. 09'
                  "
                />
              </label>

              <!-- NOMBRE -->

              <label>
                Nombre

                <input
                  v-model.trim="form.nombre"
                  required
                  maxlength="500"
                  autocomplete="off"
                  placeholder="Nombre del registro"
                />
              </label>

              <!-- AGRUPACIÓN PARA FAMILIAS -->

              <label v-if="tipo === 'familias'">
                Agrupación temática

                <select
                  v-model="form.agrupacion_id"
                  required
                >
                  <option disabled value="">
                    Selecciona una agrupación
                  </option>

                  <option
                    v-for="agrupacion in agrupaciones"
                    :key="agrupacion.id"
                    :value="agrupacion.id"
                    :disabled="
                      !agrupacion.activo &&
                      agrupacion.id !==
                        editar?.agrupacion_id
                    "
                  >
                    {{ agrupacion.codigo }}
                    ·
                    {{ agrupacion.nombre }}
                    {{
                      agrupacion.activo
                        ? ''
                        : '(inactiva)'
                    }}
                  </option>
                </select>
              </label>

            </fieldset>

            <!-- ERROR DEL MODAL -->

            <p
              v-if="errorModal"
              class="error"
              role="alert"
            >
              {{ errorModal }}
            </p>

            <footer class="modal-acciones">
              <button
                type="button"
                class="btn-secundario"
                :disabled="procesando"
                @click="cerrarEditar"
              >
                Cancelar
              </button>

              <button
                type="submit"
                class="btn-principal"
                :disabled="procesando"
              >
                {{
                  procesando
                    ? 'Guardando...'
                    : creando
                      ? 'Agregar registro'
                      : 'Guardar cambios'
                }}
              </button>
            </footer>

          </form>
        </section>
      </div>
    </Teleport>

    <!-- =====================================
         MODAL ESTADO
    ====================================== -->

    <EstadoRegistroModal
      v-if="cambiar"
      :abierto="true"
      :entidad="tipoEntidad"
      :nombre="cambiar.nombre"
      :activo="cambiar.activo"
      :procesando="procesando"
      :error="errorModal"
      @cerrar="cerrarEstado"
      @confirmar="confirmarEstado"
    />

  </section>
</template>

<style scoped>
/* ============================================
   CONTADORES
============================================ */

.clas-resumen {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 20px;
}

.clas-resumen > div {
  display: grid;
  gap: 6px;
  min-width: 0;
  padding: 14px;
  border: 1px solid #e6ebef;
  border-radius: 10px;
  background: #f5f7fa;
}

.clas-resumen span {
  color: #757b85;
  font-size: 11px;
}

.clas-resumen strong {
  color: #245a81;
  font-size: 20px;
  font-weight: 800;
}

/* ============================================
   FILTROS
============================================ */

.clas-filtros {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 20px 0;
}

.clas-filtros input {
  flex: 1;
  min-width: 200px;
}

.clas-filtros input,
.clas-filtros select {
  padding: 10px 12px;
  border: 1px solid #d7dfe5;
  border-radius: 9px;
  background: #fff;
  color: #34383f;
  font: inherit;
  font-size: 12px;
}

/* ============================================
   ACCIONES DE TABLA
============================================ */

.clas-acciones {
  display: flex;
  align-items: center;
  gap: 8px;
}

.clas-icono {
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

.clas-icono svg {
  width: 17px;
  height: 17px;
}

.clas-icono.editar {
  background: #eef5fa;
  color: #245a81;
}

.clas-icono.desactivar {
  background: #fff0f2;
  color: #962c43;
}

.clas-icono.reactivar {
  background: #eaf7f0;
  color: #24624c;
}

.clas-icono:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgb(0 0 0 / 8%);
}

.clas-icono:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.clas-icono:focus-visible {
  outline: 2px solid #c69a4b;
  outline-offset: 2px;
}

/* ============================================
   RESPONSIVO
============================================ */

@media (max-width: 600px) {
  .clas-resumen {
    gap: 7px;
  }

  .clas-resumen > div {
    padding: 10px 9px;
  }

  .clas-resumen span {
    font-size: 10px;
  }

  .clas-resumen strong {
    font-size: 18px;
  }

  .clasificaciones-admin .panel-header {
    gap: 16px;
  }
}
</style>
