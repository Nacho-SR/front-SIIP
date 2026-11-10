<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import axios from 'axios';
import { useRoute } from 'vue-router';
import api from '../../core/api';
import { useDialogFocus } from '../../core/useDialogFocus';
import type { User } from '../../store/auth.store';
import EstadoRegistroModal from './components/EstadoRegistroModal.vue';

interface Dependency {
  id: string;
  clave: string;
  nombre: string;
  activo: boolean;
}

interface ManagedUser extends User {
  activo: boolean;
  dependencia_nombre: string | null;
}

type EditableRole = 'captura' | 'revision' | 'consulta';

const route = useRoute();
const dependencies = ref<Dependency[]>([]);
const loadingDependencies = ref(true);
const dependenciesError = ref('');
const users = ref<ManagedUser[]>([]);
const loadingUsers = ref(false);
const usersError = ref('');
const busqueda = ref('');
const estadoFiltro = ref<'todos' | 'activos' | 'inactivos'>('todos');
const userSuccess = ref('');
const userError = ref('');
const savingUser = ref(false);

const modalAbierto = ref(false);
const modalDialog = ref<HTMLElement | null>(null);
const usuarioEditando = ref<ManagedUser | null>(null);
const usuarioEstado = ref<ManagedUser | null>(null);
const guardandoEstado = ref(false);
const errorEstado = ref('');

const userForm = reactive({
  nombre: '',
  correo: '',
  password: '',
  rol: 'captura' as EditableRole,
  dependencia_id: ''
});

const editando = computed(() => usuarioEditando.value !== null);
const requiresDependency = computed(() => userForm.rol !== 'consulta');
const activeDependencies = computed(() => dependencies.value.filter(d => d.activo));
const selectedDependencyActive = computed(() =>
  activeDependencies.value.some(d => d.id === userForm.dependencia_id)
);
const dependencyUnavailable = computed(() =>
  requiresDependency.value &&
  (loadingDependencies.value || !!dependenciesError.value || !selectedDependencyActive.value)
);

useDialogFocus(modalDialog, modalAbierto, cerrarModal);

function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail: unknown = error.response?.data?.detail;
    return typeof detail === 'string' && detail
      ? detail
      : 'No se pudo conectar con el servidor. Intenta de nuevo.';
  }
  return 'No se pudo completar la solicitud. Intenta de nuevo.';
}

function nombreRol(rol: User['rol']): string {
  return {
    administrador: 'Administrador',
    captura: 'Captura',
    revision: 'Revisión',
    consulta: 'Consulta'
  }[rol];
}

function dependencyName(id: string | null): string {
  if (id === null) return 'No aplica';
  return dependencies.value.find(d => d.id === id)?.nombre || id;
}

const usuariosFiltrados = computed(() => {
  const termino = busqueda.value.trim().toLocaleLowerCase('es');
  return users.value.filter(usuario => {
    if (estadoFiltro.value === 'activos' && !usuario.activo) return false;
    if (estadoFiltro.value === 'inactivos' && usuario.activo) return false;
    return [
      usuario.nombre,
      usuario.correo,
      usuario.dependencia_nombre ?? dependencyName(usuario.dependencia_id),
      nombreRol(usuario.rol)
    ].some(valor => valor.toLocaleLowerCase('es').includes(termino));
  });
});

async function loadUsers() {
  if (loadingUsers.value || savingUser.value || guardandoEstado.value) return;
  loadingUsers.value = true;
  usersError.value = '';
  try {
    const { data } = await api.get<ManagedUser[]>('/administracion/usuarios');
    users.value = data;
  } catch (error) {
    usersError.value = errorMessage(error);
  } finally {
    loadingUsers.value = false;
  }
}

async function loadDependencies() {
  loadingDependencies.value = true;
  dependenciesError.value = '';
  try {
    const { data } = await api.get<Dependency[]>('/administracion/dependencias');
    dependencies.value = data;
  } catch (error) {
    dependenciesError.value = errorMessage(error);
  } finally {
    loadingDependencies.value = false;
  }
}

function nuevoUsuario(dependenciaId = '') {
  usuarioEditando.value = null;
  Object.assign(userForm, {
    nombre: '', correo: '', password: '', rol: 'captura',
    dependencia_id: activeDependencies.value.some(d => d.id === dependenciaId)
      ? dependenciaId : ''
  });
  userError.value = '';
  modalAbierto.value = true;
}

function editarUsuario(usuario: ManagedUser) {
  if (usuario.rol === 'administrador') return;
  usuarioEditando.value = usuario;
  Object.assign(userForm, {
    nombre: usuario.nombre,
    correo: usuario.correo,
    password: '',
    rol: usuario.rol,
    dependencia_id: usuario.dependencia_id ?? ''
  });
  userError.value = '';
  modalAbierto.value = true;
}

function cerrarModal() {
  if (savingUser.value) return;
  modalAbierto.value = false;
  usuarioEditando.value = null;
  userError.value = '';
  userForm.password = '';
}

async function guardarUsuario() {
  if (savingUser.value || loadingUsers.value || dependencyUnavailable.value) return;
  userError.value = '';
  userSuccess.value = '';
  savingUser.value = true;
  try {
    const datos = {
      nombre: userForm.nombre.trim(),
      correo: userForm.correo.trim(),
      rol: userForm.rol,
      dependencia_id: requiresDependency.value ? userForm.dependencia_id : null
    };

    if (usuarioEditando.value) {
      const { data } = await api.patch<ManagedUser>(
        `/administracion/usuarios/${encodeURIComponent(usuarioEditando.value.id)}`,
        datos
      );
      users.value = users.value.map(u => u.id === data.id ? data : u);
      userSuccess.value = `Usuario ${data.nombre} actualizado correctamente.`;
    } else {
      const { data } = await api.post<User>('/administracion/usuarios', {
        ...datos,
        password: userForm.password
      });
      users.value.unshift({
        ...data,
        activo: true,
        dependencia_nombre: dependencies.value.find(d => d.id === data.dependencia_id)?.nombre ?? null
      });
      userSuccess.value = `Usuario ${data.nombre} creado. Ya puede iniciar sesión con su correo.`;
    }
    cerrarModalDespuesDeGuardar();
  } catch (error) {
    userError.value = errorMessage(error);
  } finally {
    userForm.password = '';
    savingUser.value = false;
  }
}

function cerrarModalDespuesDeGuardar() {
  modalAbierto.value = false;
  usuarioEditando.value = null;
  userError.value = '';
}

function abrirEstado(usuario: ManagedUser) {
  if (usuario.rol === 'administrador') return;
  usuarioEstado.value = usuario;
  errorEstado.value = '';
}

function cerrarEstado() {
  if (guardandoEstado.value) return;
  usuarioEstado.value = null;
  errorEstado.value = '';
}

async function confirmarEstado(datos: { activo: boolean }) {
  const seleccionado = usuarioEstado.value;
  if (!seleccionado || guardandoEstado.value) return;
  guardandoEstado.value = true;
  errorEstado.value = '';
  userSuccess.value = '';
  try {
    const { data } = await api.patch<ManagedUser>(
      `/administracion/usuarios/${encodeURIComponent(seleccionado.id)}/estado`,
      datos
    );
    users.value = users.value.map(u => u.id === data.id ? data : u);
    userSuccess.value = `Usuario ${data.nombre} ${data.activo ? 'reactivado' : 'desactivado'} correctamente.`;
    usuarioEstado.value = null;
  } catch (error) {
    errorEstado.value = errorMessage(error);
  } finally {
    guardandoEstado.value = false;
  }
}

watch(() => userForm.rol, rol => {
  if (rol === 'consulta') userForm.dependencia_id = '';
  userError.value = '';
});

onMounted(async () => {
  void loadUsers();
  await loadDependencies();
  const id = route.query.dependencia;
  if (typeof id === 'string' && activeDependencies.value.some(d => d.id === id)) {
    nuevoUsuario(id);
  }
});
</script>

<template>
  <div class="admin-section">
    <div v-if="userSuccess" class="mensaje" role="status">
      <span>{{ userSuccess }}</span>
      <button type="button" aria-label="Cerrar notificación" @click="userSuccess = ''">×</button>
    </div>

    <section class="panel">
      <div class="panel-header">
        <div>
          <span class="eyebrow">CONTROL DE ACCESO</span>
          <h2>Gestión de usuarios</h2>
          <p>Consulta, registra, edita y administra el estado de las cuentas del SIIP.</p>
        </div>
        <button type="button" class="btn-principal btn-agregar-usuario" @click="nuevoUsuario()">
          <span class="btn-icono">+</span><span>Agregar usuario</span>
        </button>
      </div>

      <p class="nota">Se muestran cuentas activas e inactivas. Las cuentas administradoras están protegidas contra cambios desde esta pantalla.</p>
      <button type="button" class="btn-secundario" :disabled="loadingUsers || savingUser || guardandoEstado" @click="loadUsers">
        {{ loadingUsers ? 'Cargando usuarios…' : 'Actualizar usuarios' }}
      </button>
      <p v-if="loadingUsers" class="nota" role="status">Cargando usuarios…</p>
      <p v-else-if="usersError" class="error" role="alert">{{ usersError }}</p>

      <div class="filtros-usuario">
        <div class="busqueda">
          <input v-model="busqueda" type="search" aria-label="Buscar usuarios registrados" placeholder="Buscar por nombre, correo, dependencia o rol..." />
        </div>
        <label class="filtro-estado">
          Estado
          <select v-model="estadoFiltro" aria-label="Filtrar usuarios por estado">
            <option value="todos">Todos</option>
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
          </select>
        </label>
      </div>

      <div v-if="!loadingUsers && !usersError" class="tabla-scroll">
        <table>
          <thead>
            <tr>
              <th>Nombre</th><th>Correo electrónico</th><th>Dependencia</th>
              <th>Rol</th><th>Estado</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="usuario in usuariosFiltrados" :key="usuario.id">
              <td class="nombre-usuario"><strong>{{ usuario.nombre }}</strong></td>
              <td class="correo-usuario">{{ usuario.correo }}</td>
              <td class="dependencia-usuario">
                <span :class="usuario.dependencia_id === null ? 'sin-dependencia' : 'dependencia-etiqueta'">
                  {{ usuario.dependencia_nombre ?? dependencyName(usuario.dependencia_id) }}
                </span>
              </td>
              <td><span class="rol">{{ nombreRol(usuario.rol) }}</span></td>
              <td><span class="estado" :class="usuario.activo ? 'activo' : 'inactivo'">{{ usuario.activo ? 'Activo' : 'Inactivo' }}</span></td>
              <td>
                <div v-if="usuario.rol !== 'administrador'" class="acciones-usuario">
                  <button
                    type="button"
                    class="accion-btn editar"
                    :disabled="savingUser || guardandoEstado"
                    :aria-label="`Editar usuario ${usuario.nombre}`"
                    :title="`Editar a ${usuario.nombre}`"
                    @click="editarUsuario(usuario)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4Z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="accion-btn"
                    :class="usuario.activo ? 'desactivar' : 'reactivar'"
                    :disabled="savingUser || guardandoEstado"
                    :aria-label="`${usuario.activo ? 'Desactivar' : 'Reactivar'} usuario ${usuario.nombre}`"
                    :title="`${usuario.activo ? 'Desactivar' : 'Reactivar'} a ${usuario.nombre}`"
                    @click="abrirEstado(usuario)"
                  >
                    <svg v-if="usuario.activo" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                      <path d="M12 2v10" />
                    </svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                      <path d="M3 3v5h5" />
                    </svg>
                  </button>
                </div>
                <span v-else class="protegido">Cuenta protegida</span>
              </td>
            </tr>
            <tr v-if="usuariosFiltrados.length === 0">
              <td colspan="6" class="vacio">{{ users.length ? 'No hay usuarios que coincidan con los filtros.' : 'No hay usuarios registrados.' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="modalAbierto" class="modal-fondo admin-modal" @click.self="cerrarModal">
        <section ref="modalDialog" class="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-modal-usuario" tabindex="-1">
          <header class="modal-header">
            <div>
              <span class="eyebrow">GESTIÓN DE USUARIOS</span>
              <h2 id="titulo-modal-usuario">{{ editando ? 'Editar usuario' : 'Agregar usuario' }}</h2>
              <p>{{ editando ? 'Actualiza los datos y permisos de la cuenta.' : 'Configura sus datos, rol y contraseña inicial.' }}</p>
            </div>
            <button type="button" class="cerrar" aria-label="Cerrar modal" :disabled="savingUser" @click="cerrarModal">×</button>
          </header>

          <form class="modal-form" @submit.prevent="guardarUsuario">
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
                <p v-if="userForm.rol === 'consulta'">Lectura global de información publicada, fichas técnicas y estadísticas. Sin dependencia ni acciones de captura, revisión o administración.</p>
                <p v-else-if="userForm.rol === 'captura'">Aporta información de su dependencia, envía capturas y atiende observaciones. Solo puede haber una cuenta de Captura activa por dependencia.</p>
                <p v-else>Consulta globalmente, revisa y valida desde Seguimiento. Su dependencia no limita la consulta global ni concede captura.</p>
              </div>
              <template v-if="requiresDependency">
                <label>
                  Dependencia
                  <span class="campo-ayuda">Selecciona una dependencia activa del catálogo institucional.</span>
                  <select v-model="userForm.dependencia_id" required :disabled="loadingDependencies || !!dependenciesError">
                    <option disabled value="">{{ loadingDependencies ? 'Cargando…' : 'Selecciona una dependencia' }}</option>
                    <option v-for="dependency in activeDependencies" :key="dependency.id" :value="dependency.id">
                      {{ dependency.clave }} — {{ dependency.nombre }}
                    </option>
                    <option v-if="userForm.dependencia_id && !selectedDependencyActive" :value="userForm.dependencia_id" disabled>
                      Dependencia actual no disponible: {{ dependencyName(userForm.dependencia_id) }}
                    </option>
                  </select>
                </label>
                <p v-if="dependenciesError" class="error" role="alert">{{ dependenciesError }}</p>
                <button v-if="dependenciesError" type="button" class="btn-secundario" @click="loadDependencies">Reintentar carga</button>
                <p v-else-if="!loadingDependencies && !activeDependencies.length" class="nota">
                  Crea primero una dependencia. <router-link :to="{ name: 'AdministradorDependencias' }">Ir a Dependencias</router-link>
                </p>
              </template>
              <label v-if="!editando">
                Contraseña inicial
                <input v-model="userForm.password" type="password" required minlength="15" maxlength="1024" autocomplete="new-password" aria-describedby="password-help" />
                <span id="password-help" class="campo-ayuda">De 15 a 1024 caracteres. Compártela con la persona por un medio privado.</span>
              </label>
              <p v-else class="nota">La contraseña actual no se modifica al editar este usuario.</p>
            </fieldset>

            <p v-if="userError" class="error" role="alert">{{ userError }}</p>
            <footer class="modal-acciones">
              <button type="button" class="btn-secundario" :disabled="savingUser" @click="cerrarModal">Cancelar</button>
              <button type="submit" class="btn-principal btn-guardar-usuario" :disabled="savingUser || loadingUsers || dependencyUnavailable">
                {{ savingUser ? 'Guardando…' : editando ? 'Guardar cambios' : 'Registrar usuario' }}
              </button>
            </footer>
          </form>
        </section>
      </div>
    </Teleport>

    <EstadoRegistroModal
      v-if="usuarioEstado"
      :abierto="true"
      entidad="usuario"
      :nombre="usuarioEstado.nombre"
      :activo="usuarioEstado.activo"
      :procesando="guardandoEstado"
      :error="errorEstado"
      @cerrar="cerrarEstado"
      @confirmar="confirmarEstado"
    />
  </div>
</template>

<style scoped>
.filtros-usuario {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  flex-wrap: wrap;
  margin-top: 14px;
}
.filtros-usuario .busqueda { flex: 1 1 260px; }
.filtro-estado {
  display: grid;
  gap: 5px;
  color: #431c2a;
  font-size: 12px;
  font-weight: 750;
}
.filtro-estado select {
  min-width: 140px;
  padding: 11px 12px;
  background: #fff;
  border: 1px solid #d5dce3;
  border-radius: 9px;
  color: #293e4e;
  font: inherit;
}
.acciones-usuario { display: flex; gap: 8px; align-items: center; flex-wrap: nowrap; }
.accion-btn {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 36px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 9px;
  cursor: pointer;
  transition: background .18s ease, border-color .18s ease, transform .18s ease;
}
.accion-btn svg { display: block; }
.accion-btn:not(:disabled):hover { transform: translateY(-1px); }
.accion-btn.editar { color: #245a81; background: #eef5fa; border-color: #cfe0ed; }
.accion-btn.desactivar { color: #962c43; background: #fff0f2; border-color: #edcbd2; }
.accion-btn.reactivar { color: #24624c; background: #eaf7f0; border-color: #c7e6d4; }
.accion-btn:disabled { opacity: .5; cursor: not-allowed; }
.accion-btn:focus-visible { outline: 2px solid #c69a4b; outline-offset: 2px; }
.protegido { color: #777; font-size: 11px; font-weight: 650; }
</style>
