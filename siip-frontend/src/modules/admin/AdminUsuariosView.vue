<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import axios from 'axios';
import { useRoute } from 'vue-router';
import api from '../../core/api';
import { useDialogFocus } from '../../core/useDialogFocus';
import type { User } from '../../store/auth.store';

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

const route = useRoute();
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
const savingUser = ref(false);
const userError = ref('');
const userSuccess = ref('');
const users = ref<ManagedUser[]>([]);
const loadingUsers = ref(false);
const usersError = ref('');
const busqueda = ref('');
const modalAbierto = ref(false);
const modalDialog = ref<HTMLElement | null>(null);
useDialogFocus(modalDialog, modalAbierto, cerrarModal);

function errorMessage(error: unknown) {
  return axios.isAxiosError(error)
    ? error.response?.data?.detail || 'No se pudo conectar con el servidor. Intenta de nuevo.'
    : 'No se pudo completar la solicitud. Intenta de nuevo.';
}

async function loadUsers() {
  if (loadingUsers.value || savingUser.value) return;
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
  if (savingUser.value || loadingUsers.value || (requiresDependency.value && (loadingDependencies.value || dependenciesError.value))) return;
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
    users.value.unshift({ ...data, activo: true,
      dependencia_nombre: dependencies.value.find(({ id }) => id === data.dependencia_id)?.nombre ?? null });
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


function dependencyName(id: string | null) {
  if (id === null) return 'No aplica';
  return dependencies.value.find(dependency => dependency.id === id)?.nombre || id;
}

const usuariosFiltrados = computed(() => {
  const termino = busqueda.value.trim().toLocaleLowerCase('es');
  return users.value.filter(usuario =>
    [usuario.nombre, usuario.correo, usuario.dependencia_nombre ?? dependencyName(usuario.dependencia_id), nombreRol(usuario.rol)]
      .some(valor => valor.toLocaleLowerCase('es').includes(termino)));
});

function nombreRol(rol: User['rol']) {
  return { administrador: 'Administrador', captura: 'Captura', revision: 'Revisión', consulta: 'Consulta' }[rol];
}

function nuevoUsuario() {
  const dependencia_id = dependencies.value.some(({ id, activo }) => activo && id === userForm.dependencia_id)
    ? userForm.dependencia_id : '';
  Object.assign(userForm, { nombre: '', correo: '', password: '', dependencia_id, rol: 'captura' });
  userError.value = '';
  userSuccess.value = '';
  modalAbierto.value = true;
}

function cerrarModal() {
  if (savingUser.value) return;
  modalAbierto.value = false;
  userError.value = '';
  userForm.password = '';
}

watch(() => userForm.rol, (rol) => {
  if (rol === 'consulta') userForm.dependencia_id = '';
  userError.value = '';
});

onMounted(async () => {
  void loadUsers();
  await loadDependencies();
  const id = route.query.dependencia;
  if (typeof id === 'string' && dependencies.value.some(dependency => dependency.id === id && dependency.activo)) {
    userForm.dependencia_id = id;
    nuevoUsuario();
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
          <p>Altas de Captura, Revisión y Consulta. Las cuentas creadas ya pueden iniciar sesión.</p>
        </div>
        <button type="button" class="btn-principal btn-agregar-usuario" @click="nuevoUsuario">
          <span class="btn-icono">+</span><span>Agregar usuario</span>
        </button>
      </div>

      <p class="nota">Se muestran las cuentas registradas, incluidas las inactivas. El correo es único entre todos los roles.</p>
      <button type="button" class="btn-secundario" :disabled="loadingUsers || savingUser" @click="loadUsers">
        {{ loadingUsers ? 'Cargando usuarios…' : 'Actualizar usuarios' }}
      </button>
      <p v-if="loadingUsers" class="nota" role="status">Cargando usuarios…</p>
      <p v-else-if="usersError" class="error" role="alert">{{ usersError }}</p>
      <div class="busqueda">
        <input v-model="busqueda" type="search" aria-label="Buscar usuarios registrados"
          placeholder="Buscar por nombre, correo, dependencia o rol..." />
      </div>
      <div v-if="!loadingUsers && !usersError" class="tabla-scroll">
        <table>
          <thead><tr><th>Nombre</th><th>Correo electrónico</th><th>Dependencia</th><th>Rol</th><th>Estado</th></tr></thead>
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
            </tr>
            <tr v-if="usuariosFiltrados.length === 0">
              <td colspan="5" class="vacio">
                {{ users.length ? 'No hay usuarios que coincidan con la búsqueda.' : 'No hay usuarios registrados.' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="modalAbierto" class="modal-fondo admin-modal" @click.self="cerrarModal">
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
                  Crea primero una dependencia.
                  <router-link :to="{ name: 'AdministradorDependencias' }">Ir a Dependencias</router-link>
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
              <button type="submit" class="btn-principal btn-guardar-usuario" :disabled="savingUser || loadingUsers || dependencyUnavailable">
                {{ savingUser ? 'Creando usuario…' : 'Registrar usuario' }}
              </button>
            </footer>
          </form>
        </section>
      </div>
    </Teleport>
</div>
</template>
