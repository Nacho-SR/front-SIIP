
<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import api from '../../core/api';
import type { User } from '../../store/auth.store';
import { adminState, refrescarAdmin } from './data/admin.store';

interface Dependency {
  id: string;
  clave: string;
  nombre: string;
  activo: boolean;
}

const router = useRouter();
const dependencies = ref<Dependency[]>([]);
const loadingDependencies = ref(true);
const dependenciesError = ref('');
const userForm = reactive({
  nombre: '', correo: '', password: '',
  rol: 'captura' as Exclude<User['rol'], 'administrador'>, dependencia_id: '',
});
const requiresDependency = computed(() => userForm.rol !== 'consulta');
const dependencyUnavailable = computed(() => requiresDependency.value
  && (loadingDependencies.value || !!dependenciesError.value || !dependencies.value.length));
const dependencyForm = reactive({ clave: '', nombre: '' });
const savingUser = ref(false);
const savingDependency = ref(false);
const userError = ref('');
const dependencyError = ref('');
const userSuccess = ref('');
const dependencySuccess = ref('');
// shortcut: solo altas confirmadas en esta vista; incorporar el catálogo al existir GET de usuarios.
const createdUsers = ref<User[]>([]);
const busqueda = ref('');
const modalAbierto = ref(false);
const modalDialog = ref<HTMLElement | null>(null);
let previousFocus: HTMLElement | null = null;

function errorMessage(error: unknown) {
  return axios.isAxiosError(error)
    ? error.response?.data?.detail || 'No se pudo conectar con el servidor. Intenta de nuevo.'
    : 'No se pudo completar la solicitud. Intenta de nuevo.';
}

async function loadDependencies() {
  if (savingDependency.value) return;
  loadingDependencies.value = true;
  dependenciesError.value = '';
  try {
    const { data } = await api.get<Dependency[]>('/administracion/dependencias');
    dependencies.value = data;
    if (!data.some(({ id, activo }) => activo && id === userForm.dependencia_id)) {
      userForm.dependencia_id = '';
    }
  } catch (error) {
    dependenciesError.value = errorMessage(error);
  } finally {
    loadingDependencies.value = false;
  }
}

async function createUser() {
  if (savingUser.value || (requiresDependency.value && (loadingDependencies.value || dependenciesError.value))) return;
  userError.value = '';
  userSuccess.value = '';
  if (requiresDependency.value && !dependencies.value.some(({ id, activo }) => activo && id === userForm.dependencia_id)) {
    userError.value = 'Selecciona una dependencia activa.';
    return;
  }
  savingUser.value = true;
  try {
    const { data } = await api.post<User>('/administracion/usuarios', {
      ...userForm, dependencia_id: requiresDependency.value ? userForm.dependencia_id : null,
    });
    createdUsers.value.unshift(data);
    userSuccess.value = `Usuario ${data.nombre} creado. Ya puede iniciar sesión con su correo.`;
    userForm.nombre = '';
    userForm.correo = '';
  } catch (error) {
    userError.value = errorMessage(error);
  } finally {
    userForm.password = '';
    savingUser.value = false;
  }
  if (userSuccess.value) await cerrarModal();
}

async function createDependency() {
  if (savingDependency.value || loadingDependencies.value || dependenciesError.value) return;
  savingDependency.value = true;
  dependencyError.value = '';
  dependencySuccess.value = '';
  try {
    const { data } = await api.post<Dependency>('/administracion/dependencias', { ...dependencyForm });
    dependencies.value.push(data);
    dependencies.value.sort((a, b) => a.nombre.localeCompare(b.nombre));
    userForm.dependencia_id = data.id;
    dependencySuccess.value = `Dependencia ${data.clave} creada. Disponible para Captura y Revisión.`;
    dependencyForm.clave = '';
    dependencyForm.nombre = '';
  } catch (error) {
    dependencyError.value = errorMessage(error);
  } finally {
    savingDependency.value = false;
  }
}

function dependencyName(id: string | null) {
  if (id === null) return 'No aplica';
  return dependencies.value.find(dependency => dependency.id === id)?.nombre || id;
}

const usuariosFiltrados = computed(() => {
  const termino = busqueda.value.trim().toLocaleLowerCase('es');
  return createdUsers.value.filter(usuario =>
    [usuario.nombre, usuario.correo, dependencyName(usuario.dependencia_id), nombreRol(usuario.rol)]
      .some(valor => valor.toLocaleLowerCase('es').includes(termino)));
});
const totalIndicadoresNuevos = computed(() => adminState.indicadores.length);

function nombreRol(rol: User['rol']) {
  return { administrador: 'Administrador', captura: 'Captura', revision: 'Revisión', consulta: 'Consulta' }[rol];
}

async function nuevoUsuario() {
  const dependencia_id = dependencies.value.some(({ id, activo }) => activo && id === userForm.dependencia_id)
    ? userForm.dependencia_id : '';
  Object.assign(userForm, { nombre: '', correo: '', password: '', dependencia_id, rol: 'captura' });
  userError.value = '';
  userSuccess.value = '';
  previousFocus = typeof document === 'undefined' ? null : document.activeElement as HTMLElement;
  modalAbierto.value = true;
  await nextTick();
  modalDialog.value?.querySelector('input')?.focus();
}

async function cerrarModal() {
  if (savingUser.value) return;
  modalAbierto.value = false;
  userError.value = '';
  userForm.password = '';
  await nextTick();
  if (previousFocus?.isConnected) previousFocus.focus();
}

function manejarTeclado(evento: KeyboardEvent) {
  if (!modalAbierto.value) return;
  if (evento.key === 'Escape') void cerrarModal();
  if (evento.key !== 'Tab') return;
  const elementos = modalDialog.value?.querySelectorAll<HTMLElement>('button:enabled, input:enabled, select:enabled, [tabindex="0"]');
  const primero = elementos?.[0];
  const ultimo = elementos?.[elementos.length - 1];
  if (!primero || !ultimo) {
    evento.preventDefault();
    modalDialog.value?.focus();
  } else if (evento.shiftKey && (document.activeElement === primero || !modalDialog.value?.contains(document.activeElement))) {
    evento.preventDefault();
    ultimo.focus();
  } else if (!evento.shiftKey && (document.activeElement === ultimo || !modalDialog.value?.contains(document.activeElement))) {
    evento.preventDefault();
    primero.focus();
  }
}

watch(() => userForm.rol, (rol) => {
  if (rol === 'consulta') userForm.dependencia_id = '';
  userError.value = '';
});

onMounted(() => {
  refrescarAdmin();
  void loadDependencies();
  window.addEventListener('keydown', manejarTeclado);
});
onUnmounted(() => window.removeEventListener('keydown', manejarTeclado));

function nuevoIndicador() {
  router.push({ name: 'AdministradorNuevoIndicador' });
}
function editarIndicador(id: string) {
  router.push({ name: 'AdministradorNuevoIndicador', query: { editar: id } });
}
</script>

<template>
  <div class="admin">
    <header class="encabezado">
      <div>
        <span class="eyebrow">GESTIÓN Y CONFIGURACIÓN</span>
        <h1>Administrador</h1>
        <p>Administración de usuarios, dependencias e indicadores del SIIP Salamanca.</p>
      </div>
      <span class="etiqueta">Acceso administrativo</span>
    </header>

    <section class="resumen">
      <article class="tarjeta">
        <span>Usuarios creados en esta sesión</span>
        <strong>{{ createdUsers.length }}</strong>
        <small>Altas confirmadas</small>
      </article>
      <article class="tarjeta">
        <span>Dependencias activas</span>
        <strong>{{ loadingDependencies || dependenciesError ? '—' : dependencies.length }}</strong>
        <small>Catálogo institucional</small>
      </article>
      <article class="tarjeta">
        <span>Indicadores del catálogo base</span>
        <strong>63</strong>
        <small>Fase inicial del SIIP</small>
      </article>
      <article class="tarjeta">
        <span>Indicadores nuevos</span>
        <strong>{{ totalIndicadoresNuevos }}</strong>
        <small>Registrados en esta demo</small>
      </article>
    </section>

    <div v-if="userSuccess" class="mensaje" role="status">
      <span>{{ userSuccess }}</span>
      <button type="button" aria-label="Cerrar notificación" @click="userSuccess = ''">×</button>
    </div>

    <section class="panel">
      <div class="panel-header">
        <div>
          <span class="eyebrow">CONTROL DE ACCESO</span>
          <h2>Gestión de usuarios</h2>
          <p>Altas de Captura, Revisión y Consulta. Las cuentas creadas ya pueden iniciar sesión.</p>
        </div>
        <button type="button" class="btn-principal btn-agregar-usuario" @click="nuevoUsuario">
          <span class="btn-icono">+</span><span>Agregar usuario</span>
        </button>
      </div>

      <p class="nota">Se muestran solo las altas realizadas desde que abriste esta pantalla.</p>
      <div class="busqueda">
        <input v-model="busqueda" type="search" aria-label="Buscar usuarios creados en esta sesión"
          placeholder="Buscar por nombre, correo, dependencia o rol..." />
      </div>
      <div class="tabla-scroll">
        <table>
          <thead><tr><th>Nombre</th><th>Correo electrónico</th><th>Dependencia</th><th>Rol</th></tr></thead>
          <tbody>
            <tr v-for="usuario in usuariosFiltrados" :key="usuario.id">
              <td class="nombre-usuario"><strong>{{ usuario.nombre }}</strong></td>
              <td class="correo-usuario">{{ usuario.correo }}</td>
              <td class="dependencia-usuario">
                <span :class="usuario.dependencia_id === null ? 'sin-dependencia' : 'dependencia-etiqueta'">
                  {{ dependencyName(usuario.dependencia_id) }}
                </span>
              </td>
              <td><span class="rol">{{ nombreRol(usuario.rol) }}</span></td>
            </tr>
            <tr v-if="usuariosFiltrados.length === 0">
              <td colspan="4" class="vacio">
                {{ createdUsers.length ? 'No hay usuarios que coincidan con la búsqueda.' : 'Todavía no has creado usuarios en esta sesión.' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel" aria-labelledby="dependencias-titulo">
      <div class="panel-header">
        <div>
          <span class="eyebrow">ORGANIZACIÓN INSTITUCIONAL</span>
          <h2 id="dependencias-titulo">Dependencias</h2>
          <p>Registra una dependencia antes de asignarle usuarios de Captura o Revisión. Consulta no requiere dependencia.</p>
        </div>
      </div>

      <div v-if="dependenciesError">
        <p class="error" role="alert">{{ dependenciesError }}</p>
        <button type="button" class="btn-secundario" @click="loadDependencies">Reintentar carga</button>
      </div>

      <form class="modal-form formulario-dependencia" @submit.prevent="createDependency">
        <fieldset class="campos-form" :disabled="savingDependency || loadingDependencies || !!dependenciesError">
          <label>
            Clave
            <input v-model.trim="dependencyForm.clave" required maxlength="40" autocomplete="off" placeholder="Ej. PLAN" />
          </label>
          <label>
            Nombre de la dependencia
            <input v-model.trim="dependencyForm.nombre" required maxlength="200" autocomplete="off" placeholder="Ej. Dirección de Planeación" />
          </label>
        </fieldset>
        <p v-if="dependencyError" class="error" role="alert">{{ dependencyError }}</p>
        <p v-if="dependencySuccess" class="mensaje" role="status">{{ dependencySuccess }}</p>
        <div>
          <button type="submit" class="btn-principal" :disabled="savingDependency || loadingDependencies || !!dependenciesError">
            {{ savingDependency ? 'Creando dependencia…' : 'Crear dependencia' }}
          </button>
        </div>
      </form>

      <div :aria-busy="loadingDependencies">
        <p v-if="loadingDependencies" class="nota" role="status">Cargando dependencias…</p>
        <p v-else-if="!dependenciesError && !dependencies.length" class="nota">
          Todavía no hay dependencias. Crea la primera para dar de alta Captura o Revisión.
        </p>
        <div v-else-if="!dependenciesError" class="tabla-scroll">
          <table>
            <caption class="nota">Dependencias activas</caption>
            <thead><tr><th>Clave</th><th>Nombre</th></tr></thead>
            <tbody>
              <tr v-for="dependency in dependencies" :key="dependency.id">
                <td><strong>{{ dependency.clave }}</strong></td>
                <td>{{ dependency.nombre }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- GESTIÓN DE INDICADORES -->
    <!-- ======================================= -->

    <section class="panel">
      <div class="panel-header">

        <div>
          <span class="eyebrow">
            CATÁLOGO METODOLÓGICO
          </span>

          <h2>Administración de indicadores</h2>

          <p>
            Registra indicadores con los campos
            metodológicos establecidos en el Excel
            del SIIP Salamanca.
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

      <div
        v-if="adminState.indicadores.length"
        class="tabla-scroll tabla-indicadores"
      >
        <table>
          <thead>
            <tr>
              <th>Clave</th>
              <th>Nombre</th>
              <th>Agrupación</th>
              <th>Frecuencia</th>
              <th>Acción</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="indicador in adminState.indicadores"
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
                {{ indicador.campos.frecuencia }}
              </td>

              <td>
                <button
                  type="button"
                  class="btn-editar"
                  @click="editarIndicador(indicador.id)"
                >
                  Editar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        v-else
        class="indicadores-vacio"
      >
        <strong>
          Listo para registrar nuevos indicadores
        </strong>

        <p>
          El catálogo inicial conserva sus
          63 indicadores.

          Los indicadores adicionales se registran
          por separado para proteger la información
          original del Excel.
        </p>
      </div>
    </section>

    <!-- ======================================= -->

    <Teleport to="body">
      <div v-if="modalAbierto" class="modal-fondo" @click.self="cerrarModal">
        <section ref="modalDialog" class="modal" role="dialog" aria-modal="true"
          aria-labelledby="titulo-modal-usuario" tabindex="-1">
          <header class="modal-header">
            <div>
              <span class="eyebrow">GESTIÓN DE USUARIOS</span>
              <h2 id="titulo-modal-usuario">Agregar usuario</h2>
              <p>Configura sus datos, rol y contraseña inicial.</p>
            </div>
            <button type="button" class="cerrar" aria-label="Cerrar modal" :disabled="savingUser" @click="cerrarModal">×</button>
          </header>

          <form class="modal-form" @submit.prevent="createUser">
            <fieldset class="campos-form" :disabled="savingUser">
              <label>
                Nombre completo
                <input v-model.trim="userForm.nombre" required maxlength="200" autocomplete="name" placeholder="Nombre y apellidos" />
              </label>
              <label>
                Correo electrónico
                <input v-model.trim="userForm.correo" type="email" required maxlength="255" autocomplete="off" placeholder="usuario@institucion.gob.mx" />
              </label>
              <label>
                Rol del usuario
                <select v-model="userForm.rol" required>
                  <option value="captura">Captura</option>
                  <option value="revision">Revisión</option>
                  <option value="consulta">Consulta</option>
                </select>
              </label>
              <div class="rol-ayuda">
                <strong>Permisos por rol</strong>
                <p v-if="userForm.rol === 'consulta'">
                  Lectura global de información publicada, fichas técnicas y estadísticas. Sin dependencia ni acciones de captura, revisión o administración.
                </p>
                <p v-else-if="userForm.rol === 'captura'">
                  Aporta información de su dependencia, envía capturas y atiende observaciones. Solo puede haber una cuenta de Captura activa por dependencia.
                </p>
                <p v-else>
                  Consulta globalmente, revisa y valida desde Seguimiento. Su dependencia no limita la consulta global ni concede captura.
                </p>
              </div>

              <template v-if="requiresDependency">
                <label>
                  Dependencia
                  <span class="campo-ayuda">Selecciona una dependencia activa del catálogo institucional.</span>
                  <select v-model="userForm.dependencia_id" required :disabled="loadingDependencies || !!dependenciesError">
                    <option disabled value="">{{ loadingDependencies ? 'Cargando…' : 'Selecciona una dependencia' }}</option>
                    <option v-for="dependency in dependencies" :key="dependency.id" :value="dependency.id">
                      {{ dependency.clave }} — {{ dependency.nombre }}
                    </option>
                  </select>
                </label>
                <p v-if="dependenciesError" class="error" role="alert">{{ dependenciesError }}</p>
                <button v-if="dependenciesError" type="button" class="btn-secundario" @click="loadDependencies">Reintentar carga</button>
                <p v-else-if="!loadingDependencies && !dependencies.length" class="nota">
                  Crea primero una dependencia en el panel Dependencias.
                </p>
              </template>

              <label>
                Contraseña inicial
                <input v-model="userForm.password" type="password" required minlength="15" maxlength="1024"
                  autocomplete="new-password" aria-describedby="password-help" />
                <span id="password-help" class="campo-ayuda">De 15 a 1024 caracteres. Compártela con la persona por un medio privado.</span>
              </label>
            </fieldset>
            <p v-if="userError" class="error" role="alert">{{ userError }}</p>
            <footer class="modal-acciones">
              <button type="button" class="btn-secundario" :disabled="savingUser" @click="cerrarModal">Cancelar</button>
              <button type="submit" class="btn-principal btn-guardar-usuario" :disabled="savingUser || dependencyUnavailable">
                {{ savingUser ? 'Creando usuario…' : 'Registrar usuario' }}
              </button>
            </footer>
          </form>
        </section>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.admin {
  --wine: #70273b;
  --deep: #431c2a;
  --gold: #c69a4b;
  --blue: #245a81;
  --blue-dark: #183e5a;
  --blue-light: #eaf3f9;
  --muted: #777d85;
  --line: #e8e4dd;

  max-width: 1500px;
  margin: auto;
  padding-bottom: 35px;
  color: #282c33;
  font-family: 'Manrope', 'Segoe UI', sans-serif;
}

/* =========================================
   ENCABEZADO
   ========================================= */

.encabezado,
.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}

.encabezado {
  margin-bottom: 22px;
}

.eyebrow {
  display: block;
  color: #a17738;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .12em;
}

h1,
h2 {
  color: var(--deep);
  font-family: 'Manrope', 'Segoe UI', sans-serif;
  font-weight: 750;
  letter-spacing: -.025em;
}

h1 {
  margin: 8px 0;
  font-size: clamp(30px, 3.5vw, 42px);
}

h2 {
  margin: 8px 0;
  font-size: 25px;
}

.encabezado p,
.panel-header p,
.modal-header p {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.7;
}

.etiqueta {
  padding: 10px 14px;
  border: 1px solid #b8d2e4;
  border-radius: 9px;
  background: var(--blue-light);
  color: var(--blue-dark);
  font-size: 11px;
  font-weight: 800;
}

/* =========================================
   TARJETAS
   ========================================= */

.resumen {
  display: grid;
  grid-template-columns:
    repeat(4, minmax(0, 1fr));
  gap: 15px;
  margin-bottom: 22px;
}

.tarjeta,
.panel {
  padding: 23px;
  border: 1px solid var(--line);
  border-radius: 15px;
  background: white;
  box-shadow: 0 12px 35px #382c260a;
}

.tarjeta {
  position: relative;
  overflow: hidden;
}

.tarjeta::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  background: var(--gold);
}

.tarjeta:nth-child(2)::before {
  background: var(--blue);
}

.tarjeta strong {
  display: block;
  margin: 12px 0 6px;
  color: var(--deep);
  font-size: 32px;
}

.tarjeta span,
.tarjeta small {
  display: block;
  color: var(--muted);
  font-size: 11px;
}

.panel {
  margin-bottom: 20px;
}

/* =========================================
   BOTONES
   ========================================= */

.btn-principal,
.btn-secundario,
.btn-editar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  min-height: 42px;
  padding: 11px 16px;

  border-radius: 9px;
  font-family: 'Manrope', 'Segoe UI', sans-serif;
  font-size: 12px;
  font-weight: 800;

  cursor: pointer;

  transition:
    transform .2s,
    background .2s,
    box-shadow .2s;
}

.btn-principal {
  border: 1px solid var(--wine);
  background: var(--wine);
  color: #fff;
}

.btn-principal:hover:not(:disabled) {
  background: var(--deep);
  transform: translateY(-1px);
}

.btn-principal:disabled,
.btn-secundario:disabled {
  opacity: .6;
  cursor: not-allowed;
}

.btn-secundario,
.btn-editar {
  border: 1px solid #e4d7d5;
  background: #f8f2ef;
  color: var(--wine);
}

.btn-secundario:hover:not(:disabled),
.btn-editar:hover {
  background: #eee4dc;
}

.btn-principal:focus-visible,
.btn-secundario:focus-visible,
.btn-editar:focus-visible {
  outline: 3px solid var(--gold);
  outline-offset: 3px;
}

/* BOTÓN AGREGAR USUARIO */

.btn-agregar-usuario {
  min-height: 44px;
  padding: 11px 19px;
  background: var(--wine);
  color: #fff;
  box-shadow:
    0 5px 15px rgba(112, 39, 59, .16);
}

.btn-agregar-usuario > span {
  color: #fff;
}

.btn-icono {
  display: grid;
  place-items: center;

  width: 23px;
  height: 23px;

  border-radius: 6px;
  background: #ffffff24;

  font-size: 18px;
  line-height: 1;
}

/* =========================================
   BÚSQUEDA
   ========================================= */

.busqueda {
  margin: 22px 0 12px;
}

.busqueda input {
  width: 100%;
  padding: 12px;

  border: 1px solid #dddcd7;
  border-radius: 9px;

  background: #fff;
  color: #282c33;

  font-family: inherit;
  font-size: 13px;
  outline: none;
}

.busqueda input:focus {
  border-color: var(--blue);
  box-shadow: 0 0 0 3px #245a8122;
}

/* =========================================
   TABLAS
   ========================================= */

.tabla-scroll {
  width: 100%;
  overflow-x: auto;
}

table {
  width: 100%;
  min-width: 780px;

  border-collapse: collapse;
  text-align: left;
}

th,
td {
  padding: 14px 12px;
  border-bottom: 1px solid var(--line);
  font-size: 12px;
  vertical-align: middle;
}

th {
  background: #faf9f7;
  color: var(--muted);
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
}

tbody tr:hover {
  background: #fcfaf8;
}

td strong {
  color: var(--deep);
}

.nombre-usuario {
  min-width: 150px;
}

.correo-usuario {
  overflow-wrap: anywhere;
}

.dependencia-usuario {
  min-width: 190px;
}

.dependencia-etiqueta {
  display: inline-block;
  color: var(--blue-dark);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.6;
}

.sin-dependencia {
  color: #9b6a30;
  font-size: 11px;
  font-style: italic;
}

.rol,
.estado {
  display: inline-block;
  padding: 7px 10px;
  border-radius: 20px;

  background: #f3edf0;
  color: var(--wine);

  font-size: 11px;
  font-weight: 750;
  white-space: nowrap;
}

.estado.activo {
  background: #e8f5ed;
  color: #217447;
}

.estado.inactivo {
  background: #f0f1f3;
  color: #68717c;
}

/* =========================================
   ESTADOS VACÍOS
   ========================================= */

.vacio,
.indicadores-vacio {
  padding: 35px;
  text-align: center;
  color: var(--muted);
  font-size: 12px;
}

.indicadores-vacio strong {
  color: var(--deep);
  font-size: 15px;
}

.indicadores-vacio p {
  line-height: 1.8;
}

.nota {
  margin: 14px 0 0;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.7;
}

/* =========================================
   NOTIFICACIONES
   ========================================= */

.mensaje {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;

  padding: 13px 16px;
  margin-bottom: 15px;

  border-radius: 9px;
  background: #e8f5ed;
  color: #217447;

  font-size: 12px;
  font-weight: 700;
}

.mensaje button {
  flex-shrink: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 20px;
  cursor: pointer;
}

/* =========================================
   MODAL DE USUARIOS
   ========================================= */

.modal-fondo {
  --wine: #70273b;
  --deep: #431c2a;
  --gold: #c69a4b;
  --blue: #245a81;
  --muted: #777d85;
  --line: #e8e4dd;

  position: fixed;
  inset: 0;
  z-index: 1200;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 15px;

  background: #19131bb8;
  backdrop-filter: blur(5px);
}

.modal {
  width: min(550px, 100%);
  max-height: 95vh;
  max-height: 95dvh;

  overflow-y: auto;
  border-radius: 17px;
  background: white;

  font-family: 'Manrope', 'Segoe UI', sans-serif;
  box-shadow: 0 30px 90px #0004;
}

/* ENCABEZADO DEL MODAL */

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 15px;

  padding: 25px;

  border-bottom: 1px solid var(--line);
  background:
    linear-gradient(
      125deg,
      #fcf6f7,
      #f4f8fb
    );
}

.modal-header h2 {
  margin: 8px 0;
  color: var(--deep);
  font-size: 25px;
  font-weight: 750;
}

.modal-header p {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.7;
}

.modal-header .eyebrow {
  color: #a17738;
}

.cerrar {
  display: grid;
  place-items: center;

  width: 35px;
  height: 35px;
  flex-shrink: 0;

  border: 0;
  border-radius: 8px;

  background: #f1e4e8;
  color: var(--wine);

  font-size: 24px;
  cursor: pointer;
}

.cerrar:hover {
  background: #e9d3db;
}

/* FORMULARIO */

.modal-form {
  display: grid;
  gap: 17px;
  padding: 25px;
}

.campos-form {
  display: grid;
  gap: 17px;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.formulario-dependencia {
  padding: 20px 0;
}

.formulario-dependencia .campos-form {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

@media (max-width: 700px) {
  .formulario-dependencia .campos-form {
    grid-template-columns: 1fr;
  }
}

.cerrar:focus-visible {
  outline: 3px solid var(--gold);
  outline-offset: 3px;
}

.modal-form label {
  display: grid;
  gap: 8px;
  color: #48444a;
  font-size: 12px;
  font-weight: 800;
}

.modal-form input:not([type="checkbox"]),
.modal-form select {
  width: 100%;
  min-width: 0;
  min-height: 44px;
  padding: 12px;

  border: 1px solid #dddcd7;
  border-radius: 9px;

  background: white;
  color: #282c33;

  font-family: inherit;
  font-size: 13px;
  outline: none;
}

.modal-form input:focus,
.modal-form select:focus {
  border-color: var(--blue);
  box-shadow: 0 0 0 3px #245a8122;
}

.campo-ayuda {
  color: var(--muted);
  font-size: 10px;
  font-weight: 500;
  line-height: 1.6;
}

/* AYUDA SOBRE EL ROL */

.rol-ayuda {
  padding: 14px 16px;
  border-left: 3px solid var(--gold);

  background: #faf7f0;
  border-radius: 0 9px 9px 0;
}

.rol-ayuda strong {
  color: var(--wine);
  font-size: 12px;
}

.rol-ayuda p {
  margin: 7px 0 0;
  color: #6c6767;
  font-size: 11px;
  line-height: 1.7;
}

/* USUARIO ACTIVO */

.modal-form .interruptor {
  display: flex;
  align-items: center;
  gap: 10px;
}

.interruptor input {
  width: 17px;
  height: 17px;
  accent-color: var(--wine);
}

/* ERROR */

.error {
  padding: 12px;

  background: #fde8eb;
  color: #a62b3a;

  border-radius: 8px;
  font-size: 12px;
  line-height: 1.6;
}

/* BOTONES DEL MODAL */

.modal-acciones {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;

  padding-top: 15px;
  border-top: 1px solid var(--line);
}

.modal-acciones .btn-principal,
.modal-acciones .btn-secundario {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  min-height: 44px;
  padding: 12px 20px;

  border-radius: 9px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 800;

  cursor: pointer;
}

.modal-acciones .btn-principal {
  background: #70273b !important;
  color: #ffffff !important;
  border: 1px solid #70273b !important;

  opacity: 1;
  visibility: visible;
}

.modal-acciones .btn-principal:hover:not(:disabled) {
  background: #431c2a !important;
}

.modal-acciones .btn-principal:disabled {
  opacity: .6;
  cursor: not-allowed;
}

.modal-acciones .btn-secundario {
  background: #f8f2ef;
  color: #70273b;
  border: 1px solid #e4d7d5;
}

.modal-acciones .btn-secundario:hover {
  background: #eee4dc;
}

.modal-acciones button:focus-visible {
  outline: 3px solid var(--gold);
  outline-offset: 3px;
}

/* =========================================
   RESPONSIVE
   ========================================= */

@media (max-width: 900px) {
  .resumen {
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 550px) {
  .resumen {
    grid-template-columns: 1fr;
  }

  .panel,
  .tarjeta {
    padding: 17px;
  }

  .modal-header,
  .modal-form {
    padding: 18px;
  }

  .modal-acciones {
    flex-wrap: wrap;
  }

  .modal-acciones button {
    flex: 1;
  }

  .btn-agregar-usuario {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .btn-principal,
  .btn-secundario,
  .btn-editar {
    transition: none;
  }
}
</style>
