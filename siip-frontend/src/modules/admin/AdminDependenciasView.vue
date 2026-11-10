
<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import axios from 'axios';
import api from '../../core/api';
import { useDialogFocus } from '../../core/useDialogFocus';
import EstadoRegistroModal from './components/EstadoRegistroModal.vue';

interface Dependency {
  id: string;
  clave: string;
  nombre: string;
  activo: boolean;
}

type FiltroEstado = 'todos' | 'activos' | 'inactivos';

// -----------------------------------------
// ESTADO GENERAL
// -----------------------------------------

const dependencies = ref<Dependency[]>([]);
const loadingDependencies = ref(true);
const dependenciesError = ref('');
const dependencySuccess = ref('');

const busqueda = ref('');
const filtroEstado = ref<FiltroEstado>('todos');

// -----------------------------------------
// CREACIÓN
// -----------------------------------------

const dependencyForm = reactive({
  clave: '',
  nombre: ''
});

const savingDependency = ref(false);
const dependencyError = ref('');
const dependenciaCreada = ref<Dependency | null>(null);

// -----------------------------------------
// EDICIÓN
// -----------------------------------------

const modalEditarAbierto = ref(false);
const modalEditarDialog = ref<HTMLElement | null>(null);

const dependenciaEditar = ref<Dependency | null>(null);
const editForm = reactive({
  clave: '',
  nombre: ''
});

const savingEdit = ref(false);
const editError = ref('');

// -----------------------------------------
// ACTIVACIÓN / DESACTIVACIÓN
// -----------------------------------------

const dependenciaEstado = ref<Dependency | null>(null);
const savingStatus = ref(false);
const statusError = ref('');

useDialogFocus(
  modalEditarDialog,
  modalEditarAbierto,
  cerrarEditar
);

// -----------------------------------------
// FILTROS
// -----------------------------------------

const dependenciasFiltradas = computed(() => {
  const termino = busqueda.value.trim().toLocaleLowerCase('es');

  return dependencies.value.filter(dependency => {
    const coincideBusqueda =
      dependency.clave.toLocaleLowerCase('es').includes(termino) ||
      dependency.nombre.toLocaleLowerCase('es').includes(termino);

    const coincideEstado =
      filtroEstado.value === 'todos' ||
      (filtroEstado.value === 'activos' && dependency.activo) ||
      (filtroEstado.value === 'inactivos' && !dependency.activo);

    return coincideBusqueda && coincideEstado;
  });
});

const totalActivas = computed(() =>
  dependencies.value.filter(item => item.activo).length
);

const totalInactivas = computed(() =>
  dependencies.value.filter(item => !item.activo).length
);

// -----------------------------------------
// MANEJO DE ERRORES
// -----------------------------------------

function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as {
      detail?: string;
      message?: string;
    } | undefined;

    if (!error.response) {
      return 'No se pudo conectar con el servidor. Verifica que el backend esté disponible.';
    }

    return (
      data?.detail ||
      data?.message ||
      `El servidor devolvió un error HTTP ${error.response.status}.`
    );
  }

  return 'No se pudo completar la solicitud.';
}

// -----------------------------------------
// ACTUALIZAR DATOS LOCALES
// -----------------------------------------

function actualizarDependencia(updated: Dependency) {
  const index = dependencies.value.findIndex(
    item => item.id === updated.id
  );

  if (index === -1) {
    dependencies.value.push(updated);
  } else {
    dependencies.value.splice(index, 1, updated);
  }

  dependencies.value.sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es')
  );
}

// -----------------------------------------
// LISTAR DEPENDENCIAS
// -----------------------------------------

async function loadDependencies() {
  if (
    savingDependency.value ||
    savingEdit.value ||
    savingStatus.value
  ) return;

  loadingDependencies.value = true;
  dependenciesError.value = '';

  try {
    const { data } = await api.get<Dependency[]>(
      '/administracion/dependencias'
    );

    dependencies.value = data.sort((a, b) =>
      a.nombre.localeCompare(b.nombre, 'es')
    );
  } catch (error) {
    dependenciesError.value = errorMessage(error);
  } finally {
    loadingDependencies.value = false;
  }
}

// -----------------------------------------
// CREAR DEPENDENCIA
// -----------------------------------------

async function createDependency() {
  if (
    savingDependency.value ||
    loadingDependencies.value ||
    dependenciesError.value
  ) return;

  savingDependency.value = true;
  dependencyError.value = '';
  dependencySuccess.value = '';
  dependenciaCreada.value = null;

  try {
    const { data } = await api.post<Dependency>(
      '/administracion/dependencias',
      { ...dependencyForm }
    );

    actualizarDependencia(data);

    dependenciaCreada.value = data;
    dependencySuccess.value =
      `Dependencia ${data.clave} creada correctamente.`;

    dependencyForm.clave = '';
    dependencyForm.nombre = '';

  } catch (error) {
    dependencyError.value = errorMessage(error);
  } finally {
    savingDependency.value = false;
  }
}

// -----------------------------------------
// EDITAR DEPENDENCIA
// -----------------------------------------

function abrirEditar(dependency: Dependency) {
  dependenciaEditar.value = dependency;

  editForm.clave = dependency.clave;
  editForm.nombre = dependency.nombre;

  editError.value = '';
  modalEditarAbierto.value = true;
}

function cerrarEditar() {
  if (savingEdit.value) return;

  modalEditarAbierto.value = false;
  dependenciaEditar.value = null;
  editError.value = '';
}

async function guardarEdicion() {
  if (
    !dependenciaEditar.value ||
    savingEdit.value ||
    loadingDependencies.value
  ) return;

  const id = dependenciaEditar.value.id;

  savingEdit.value = true;
  editError.value = '';
  dependencySuccess.value = '';

  let guardado = false;

  try {
    const { data } = await api.patch<Dependency>(
      `/administracion/dependencias/${encodeURIComponent(id)}`,
      {
        clave: editForm.clave,
        nombre: editForm.nombre
      }
    );

    actualizarDependencia(data);

    dependencySuccess.value =
      `Dependencia ${data.clave} actualizada correctamente.`;

    guardado = true;
  } catch (error) {
    editError.value = errorMessage(error);
  } finally {
    savingEdit.value = false;
  }

  if (guardado) {
    cerrarEditar();
  }
}

// -----------------------------------------
// DESACTIVAR / REACTIVAR
// -----------------------------------------

function abrirEstado(dependency: Dependency) {
  dependenciaEstado.value = dependency;
  statusError.value = '';
}

function cerrarEstado() {
  if (savingStatus.value) return;

  dependenciaEstado.value = null;
  statusError.value = '';
}

async function confirmarEstado(data: { activo: boolean }) {
  if (!dependenciaEstado.value || savingStatus.value) return;

  const id = dependenciaEstado.value.id;

  savingStatus.value = true;
  statusError.value = '';
  dependencySuccess.value = '';

  try {
    const { data: updated } = await api.patch<Dependency>(
      `/administracion/dependencias/${encodeURIComponent(id)}/estado`,
      data
    );

    actualizarDependencia(updated);

    dependencySuccess.value = updated.activo
      ? `Dependencia ${updated.clave} reactivada correctamente.`
      : `Dependencia ${updated.clave} desactivada correctamente.`;

    dependenciaEstado.value = null;

  } catch (error) {
    statusError.value = errorMessage(error);
  } finally {
    savingStatus.value = false;
  }
}

onMounted(() => {
  void loadDependencies();
});
</script>

<template>
  <section
    class="panel dependencias-admin"
    aria-labelledby="dependencias-titulo"
  >
    <!-- ENCABEZADO -->
    <div class="panel-header">
      <div>
        <span class="eyebrow">
          ORGANIZACIÓN INSTITUCIONAL
        </span>

        <h2 id="dependencias-titulo">
          Gestión de dependencias
        </h2>

        <p>
          Registra, edita, desactiva y reactiva
          las dependencias institucionales del SIIP.
        </p>
      </div>
    </div>

    <!-- MENSAJES -->
    <div
      v-if="dependencySuccess"
      class="mensaje"
      role="status"
    >
      <span>{{ dependencySuccess }}</span>
      <button
        type="button"
        class="cerrar-mensaje"
        aria-label="Cerrar notificación"
        @click="dependencySuccess = ''"
      >
        ×
      </button>
    </div>

    <div v-if="dependenciesError">
      <p class="error" role="alert">
        {{ dependenciesError }}
      </p>

      <button
        type="button"
        class="btn-secundario"
        @click="loadDependencies"
      >
        Reintentar carga
      </button>
    </div>

    <!-- FORMULARIO CREAR -->
    <section class="bloque">
      <div class="bloque-encabezado">
        <h3>Registrar dependencia</h3>
        <p>
          Crea una dependencia antes de asignarle
          usuarios de Captura o Revisión.
        </p>
      </div>

      <form
        class="modal-form formulario-dependencia"
        @submit.prevent="createDependency"
      >
        <fieldset
          class="campos-form"
          :disabled="
            savingDependency ||
            loadingDependencies ||
            !!dependenciesError
          "
        >
          <label>
            Clave
            <input
              v-model.trim="dependencyForm.clave"
              required
              maxlength="40"
              autocomplete="off"
              placeholder="Ej. PLAN"
            />
          </label>

          <label>
            Nombre de la dependencia
            <input
              v-model.trim="dependencyForm.nombre"
              required
              maxlength="200"
              autocomplete="off"
              placeholder="Ej. Dirección de Planeación"
            />
          </label>
        </fieldset>

        <p v-if="dependencyError" class="error" role="alert">
          {{ dependencyError }}
        </p>

        <button
          type="submit"
          class="btn-principal"
          :disabled="
            savingDependency ||
            loadingDependencies ||
            !!dependenciesError
          "
        >
          {{
            savingDependency
              ? 'Creando dependencia…'
              : 'Crear dependencia'
          }}
        </button>
      </form>

      <div
        v-if="dependenciaCreada"
        class="enlace-usuario"
      >
        <span>
          ¿Deseas asignar un usuario a
          {{ dependenciaCreada.nombre }}?
        </span>

        <router-link
          :to="{
            name: 'AdministradorUsuarios',
            query: {
              dependencia: dependenciaCreada.id
            }
          }"
        >
          Crear usuario en esta dependencia
        </router-link>
      </div>
    </section>

    <!-- LISTADO -->
    <section class="bloque">
      <div class="listado-encabezado">
        <div>
          <h3>Dependencias registradas</h3>
          <p>
            Consulta tanto los registros activos
            como los inactivos.
          </p>
        </div>

        <button
          type="button"
          class="btn-secundario"
          :disabled="
            loadingDependencies ||
            savingDependency ||
            savingEdit ||
            savingStatus
          "
          @click="loadDependencies"
        >
          Actualizar
        </button>
      </div>

      <!-- CONTADORES -->
      <div class="contadores">
        <div>
          <span>Total</span>
          <strong>{{ dependencies.length }}</strong>
        </div>

        <div>
          <span>Activas</span>
          <strong>{{ totalActivas }}</strong>
        </div>

        <div>
          <span>Inactivas</span>
          <strong>{{ totalInactivas }}</strong>
        </div>
      </div>

      <!-- FILTROS -->
      <div class="filtros">
        <input
          v-model="busqueda"
          type="search"
          aria-label="Buscar dependencias"
          placeholder="Buscar por clave o nombre..."
        />

        <select
          v-model="filtroEstado"
          aria-label="Filtrar dependencias por estado"
        >
          <option
            v-for="dependency in dependencies.filter(d => d.activo)"
            :key="dependency.id"
            :value="dependency.id"
          >
            {{ dependency.clave }} — {{ dependency.nombre }}
          </option>
        </select>
      </div>

      <div :aria-busy="loadingDependencies">
        <p
          v-if="loadingDependencies"
          class="nota"
          role="status"
        >
          Cargando dependencias…
        </p>

        <p
          v-else-if="!dependenciesError && !dependencies.length"
          class="nota"
        >
          Todavía no hay dependencias registradas.
        </p>

        <div
          v-else-if="!dependenciesError"
          class="tabla-scroll tabla-dependencias"
        >
          <table>
            <caption class="nota">
              Dependencias institucionales
            </caption>

            <thead>
              <tr>
                <th>Clave</th>
                <th>Nombre</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="dependency in dependenciasFiltradas"
                :key="dependency.id"
              >
                <td>
                  <strong>{{ dependency.clave }}</strong>
                </td>

                <td>{{ dependency.nombre }}</td>

                <td>
                  <span
                    class="estado"
                    :class="
                      dependency.activo
                        ? 'activo'
                        : 'inactivo'
                    "
                  >
                    {{
                      dependency.activo
                        ? 'Activa'
                        : 'Inactiva'
                    }}
                  </span>
                </td>

                <td>
                  <div class="acciones-iconos">
                    <!-- EDITAR -->
                    <button
                      type="button"
                      class="accion-icono editar"
                      title="Editar dependencia"
                      :aria-label="
                        `Editar ${dependency.nombre}`
                      "
                      :disabled="
                        savingEdit || savingStatus
                      "
                      @click="abrirEditar(dependency)"
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
                        <path d="M12 20h9"/>
                        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4Z"/>
                      </svg>
                    </button>

                    <!-- DESACTIVAR -->
                    <button
                      v-if="dependency.activo"
                      type="button"
                      class="accion-icono desactivar"
                      title="Desactivar dependencia"
                      :aria-label="
                        `Desactivar ${dependency.nombre}`
                      "
                      :disabled="
                        savingEdit || savingStatus
                      "
                      @click="abrirEstado(dependency)"
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
                        <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/>
                        <path d="M12 2v10"/>
                      </svg>
                    </button>

                    <!-- REACTIVAR -->
                    <button
                      v-else
                      type="button"
                      class="accion-icono reactivar"
                      title="Reactivar dependencia"
                      :aria-label="
                        `Reactivar ${dependency.nombre}`
                      "
                      :disabled="
                        savingEdit || savingStatus
                      "
                      @click="abrirEstado(dependency)"
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
                        <path d="M3 12a9 9 0 1 0 3-6.7L3 8"/>
                        <path d="M3 3v5h5"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>

              <tr v-if="!dependenciasFiltradas.length">
                <td colspan="4" class="vacio">
                  No hay dependencias que coincidan
                  con los filtros seleccionados.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- MODAL DE EDICIÓN -->
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
          aria-labelledby="editar-dependencia-titulo"
          tabindex="-1"
        >
          <header class="modal-header">
            <div>
              <span class="eyebrow">
                ORGANIZACIÓN INSTITUCIONAL
              </span>
              <h2 id="editar-dependencia-titulo">
                Editar dependencia
              </h2>
              <p>
                Modifica la información del registro.
              </p>
            </div>

            <button
              type="button"
              class="cerrar"
              aria-label="Cerrar modal"
              :disabled="savingEdit"
              @click="cerrarEditar"
            >
              ×
            </button>
          </header>

          <form
            class="modal-form"
            @submit.prevent="guardarEdicion"
          >
            <fieldset
              class="campos-form"
              :disabled="savingEdit"
            >
              <label>
                Clave
                <input
                  v-model.trim="editForm.clave"
                  required
                  maxlength="40"
                  autocomplete="off"
                />
              </label>

              <label>
                Nombre de la dependencia
                <input
                  v-model.trim="editForm.nombre"
                  required
                  maxlength="200"
                  autocomplete="off"
                />
              </label>
            </fieldset>

            <p
              v-if="editError"
              class="error"
              role="alert"
            >
              {{ editError }}
            </p>

            <footer class="modal-acciones">
              <button
                type="button"
                class="btn-secundario"
                :disabled="savingEdit"
                @click="cerrarEditar"
              >
                Cancelar
              </button>

              <button
                type="submit"
                class="btn-principal"
                :disabled="savingEdit"
              >
                {{
                  savingEdit
                    ? 'Guardando cambios…'
                    : 'Guardar cambios'
                }}
              </button>
            </footer>
          </form>
        </section>
      </div>
    </Teleport>

    <!-- MODAL DE ESTADO -->
    <EstadoRegistroModal
      v-if="dependenciaEstado"
      :abierto="true"
      entidad="dependencia"
      :nombre="dependenciaEstado.nombre"
      :activo="dependenciaEstado.activo"
      :procesando="savingStatus"
      :error="statusError"
      @cerrar="cerrarEstado"
      @confirmar="confirmarEstado"
    />
  </section>
</template>

<style scoped>
.dependencias-admin {
  --dep-blue: #245a81;
  --dep-wine: #70273b;
  --dep-green: #24624c;
}

.bloque {
  margin-top: 24px;
  padding: 20px;
  border: 1px solid #e8e2e4;
  border-radius: 13px;
  background: #fff;
}

.bloque-encabezado,
.listado-encabezado {
  margin-bottom: 16px;
}

.bloque-encabezado h3,
.listado-encabezado h3 {
  margin: 0 0 6px;
  color: #431c2a;
  font-size: 16px;
  font-weight: 800;
}

.bloque-encabezado p,
.listado-encabezado p {
  margin: 0;
  color: #777b83;
  font-size: 12px;
  line-height: 1.7;
}

.listado-encabezado {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.contadores {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 17px 0;
}

.contadores > div {
  display: grid;
  gap: 7px;
  padding: 14px;
  border: 1px solid #e6ebef;
  border-radius: 10px;
  background: #f5f7fa;
}

.contadores span {
  color: #757b85;
  font-size: 11px;
}

.contadores strong {
  color: var(--dep-blue);
  font-size: 20px;
  font-weight: 800;
}

.filtros {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 190px;
  gap: 12px;
  margin-bottom: 17px;
}

.filtros input,
.filtros select {
  width: 100%;
  min-width: 0;
  padding: 11px 13px;
  border: 1px solid #dedee3;
  border-radius: 9px;
  background: #fff;
  color: #34383f;
  font: inherit;
  font-size: 12px;
}

.filtros input:focus,
.filtros select:focus {
  outline: 2px solid #245a81;
  outline-offset: 1px;
}

.acciones-iconos {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.accion-icono {
  display: inline-grid;
  place-items: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 9px;
  cursor: pointer;
  transition:
    transform .2s ease,
    background .2s ease;
}

.accion-icono svg {
  width: 17px;
  height: 17px;
}

.accion-icono.editar {
  color: var(--dep-blue);
  background: #eef5fa;
  border-color: #d9e9f3;
}

.accion-icono.desactivar {
  color: #962c43;
  background: #fff0f2;
  border-color: #f5dce1;
}

.accion-icono.reactivar {
  color: var(--dep-green);
  background: #eaf7f0;
  border-color: #d3eadc;
}

.accion-icono:hover:not(:disabled) {
  transform: translateY(-2px);
}

.accion-icono:focus-visible {
  outline: 2px solid #c69a4b;
  outline-offset: 2px;
}

.accion-icono:disabled {
  opacity: .5;
  cursor: not-allowed;
}

.enlace-usuario {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 15px;
  font-size: 12px;
  color: #686e78;
}

.enlace-usuario a {
  color: var(--dep-blue);
  font-weight: 800;
  text-decoration: none;
}

.enlace-usuario a:hover {
  text-decoration: underline;
}

.cerrar-mensaje {
  margin-left: auto;
  border: 0;
  background: transparent;
  font-size: 20px;
  cursor: pointer;
}

@media (max-width: 600px) {
  .filtros {
    grid-template-columns: 1fr;
  }

  .listado-encabezado {
    flex-direction: column;
    align-items: flex-start;
  }

  .contadores {
    gap: 7px;
  }

  .contadores > div {
    padding: 10px;
  }
}
</style>
