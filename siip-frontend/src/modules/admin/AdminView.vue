
<script setup lang="ts">
import {
  computed,
  onMounted,
  onUnmounted,
  reactive,
  ref
} from 'vue';

import { useRouter } from 'vue-router';

import {
  adminState,
  guardarUsuario,
  refrescarAdmin,
  type RolGestionable,
  type UsuarioAdmin
} from './data/admin.store';

const router = useRouter();

// ==============================================
// ESTADO DEL MÓDULO
// ==============================================

const modalAbierto = ref(false);
const usuarioEditando = ref<string | null>(null);
const busqueda = ref('');
const mensaje = ref('');
const error = ref('');
const guardando = ref(false);

const formulario = reactive({
  nombre: '',
  correo: '',
  dependencia: '',
  rol: 'consulta' as RolGestionable,
  activo: true
});

// ==============================================
// BÚSQUEDA DE USUARIOS
// ==============================================

const usuariosFiltrados = computed(() => {
  const termino = busqueda.value
    .trim()
    .toLocaleLowerCase('es');

  return adminState.usuarios.filter(usuario =>
    [
      usuario.nombre,
      usuario.correo,
      usuario.dependencia ?? '',
      usuario.rol
    ].some(valor =>
      String(valor ?? '')
        .toLocaleLowerCase('es')
        .includes(termino)
    )
  );
});

// ==============================================
// ESTADÍSTICAS
// ==============================================

const usuariosActivos = computed(() =>
  adminState.usuarios.filter(
    usuario => usuario.activo
  ).length
);

const totalIndicadoresNuevos = computed(() =>
  adminState.indicadores.length
);

onMounted(refrescarAdmin);

// ==============================================
// CREAR USUARIO
// ==============================================

function nuevoUsuario() {
  usuarioEditando.value = null;

  Object.assign(formulario, {
    nombre: '',
    correo: '',
    dependencia: '',
    rol: 'consulta',
    activo: true
  });

  error.value = '';
  mensaje.value = '';
  modalAbierto.value = true;
}

// ==============================================
// EDITAR USUARIO
// ==============================================

function editarUsuario(usuario: UsuarioAdmin) {
  usuarioEditando.value = usuario.id;

  Object.assign(formulario, {
    nombre: usuario.nombre,
    correo: usuario.correo,
    dependencia: usuario.dependencia ?? '',
    rol: usuario.rol,
    activo: usuario.activo
  });

  error.value = '';
  mensaje.value = '';
  modalAbierto.value = true;
}

// ==============================================
// CERRAR MODAL
// ==============================================

function cerrarModal() {
  if (guardando.value) return;

  modalAbierto.value = false;
  error.value = '';
}

function manejarEscape(evento: KeyboardEvent) {
  if (
    evento.key === 'Escape' &&
    modalAbierto.value
  ) {
    cerrarModal();
  }
}

onMounted(() => {
  window.addEventListener(
    'keydown',
    manejarEscape
  );
});

onUnmounted(() => {
  window.removeEventListener(
    'keydown',
    manejarEscape
  );
});

// ==============================================
// GUARDAR USUARIO
// ==============================================

function guardar() {
  if (guardando.value) return;

  error.value = '';
  guardando.value = true;

  try {
    guardarUsuario(
      {
        nombre: formulario.nombre,
        correo: formulario.correo,
        dependencia: formulario.dependencia,
        rol: formulario.rol,
        activo: formulario.activo
      },
      usuarioEditando.value ?? undefined
    );

    mensaje.value = usuarioEditando.value
      ? 'Usuario actualizado correctamente.'
      : 'Usuario registrado correctamente.';

    modalAbierto.value = false;
    error.value = '';

  } catch (e) {
    error.value = e instanceof Error
      ? e.message
      : 'No fue posible guardar el usuario.';
  } finally {
    guardando.value = false;
  }
}

// ==============================================
// NOMBRES DE ROLES
// ==============================================

function nombreRol(rol: RolGestionable) {
  const nombres: Record<RolGestionable, string> = {
    consulta: 'Consulta',
    captura: 'Captura',
    seguimiento: 'Seguimiento'
  };

  return nombres[rol];
}

// ==============================================
// INDICADORES
// ==============================================

function nuevoIndicador() {
  router.push({
    name: 'AdministradorNuevoIndicador'
  });
}

function editarIndicador(id: string) {
  router.push({
    name: 'AdministradorNuevoIndicador',
    query: { editar: id }
  });
}
</script>

<template>
  <div class="admin">

    <!-- ======================================= -->
    <!-- ENCABEZADO -->
    <!-- ======================================= -->

    <header class="encabezado">
      <div>
        <span class="eyebrow">
          GESTIÓN Y CONFIGURACIÓN
        </span>

        <h1>Administrador</h1>

        <p>
          Administración de usuarios, dependencias,
          permisos e indicadores del SIIP Salamanca.
        </p>
      </div>

      <span class="etiqueta">
        Acceso administrativo
      </span>
    </header>

    <!-- ======================================= -->
    <!-- TARJETAS DE RESUMEN -->
    <!-- ======================================= -->

    <section class="resumen">

      <article class="tarjeta">
        <span>Usuarios registrados</span>

        <strong>
          {{ adminState.usuarios.length }}
        </strong>

        <small>Perfiles gestionados</small>
      </article>

      <article class="tarjeta">
        <span>Usuarios activos</span>

        <strong>
          {{ usuariosActivos }}
        </strong>

        <small>Con estado habilitado</small>
      </article>

      <article class="tarjeta">
        <span>Indicadores del catálogo base</span>

        <strong>63</strong>

        <small>Fase inicial del SIIP</small>
      </article>

      <article class="tarjeta">
        <span>Indicadores nuevos</span>

        <strong>
          {{ totalIndicadoresNuevos }}
        </strong>

        <small>Registrados en esta demo</small>
      </article>

    </section>

    <!-- ======================================= -->
    <!-- NOTIFICACIÓN -->
    <!-- ======================================= -->

    <div
      v-if="mensaje"
      class="mensaje"
      role="status"
    >
      <span>{{ mensaje }}</span>

      <button
        type="button"
        aria-label="Cerrar notificación"
        @click="mensaje = ''"
      >
        ×
      </button>
    </div>

    <!-- ======================================= -->
    <!-- GESTIÓN DE USUARIOS -->
    <!-- ======================================= -->

    <section class="panel">
      <div class="panel-header">

        <div>
          <span class="eyebrow">
            CONTROL DE ACCESO
          </span>

          <h2>Gestión de usuarios</h2>

          <p>
            Registra y administra usuarios,
            dependencias y roles de acceso.
          </p>
        </div>

        <button
          type="button"
          class="btn-principal btn-agregar-usuario"
          @click="nuevoUsuario"
        >
          <span class="btn-icono">+</span>
          <span>Agregar usuario</span>
        </button>

      </div>

      <!-- BÚSQUEDA -->

      <div class="busqueda">
        <input
          v-model="busqueda"
          type="search"
          aria-label="Buscar usuarios"
          placeholder="Buscar por nombre, correo, dependencia o rol..."
        />
      </div>

      <!-- TABLA -->

      <div class="tabla-scroll">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo electrónico</th>
              <th>Dependencia</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="usuario in usuariosFiltrados"
              :key="usuario.id"
            >
              <td class="nombre-usuario">
                <strong>
                  {{ usuario.nombre }}
                </strong>
              </td>

              <td class="correo-usuario">
                {{ usuario.correo }}
              </td>

              <!-- NUEVA COLUMNA -->
              <td class="dependencia-usuario">
                <span
                  v-if="usuario.dependencia"
                  class="dependencia-etiqueta"
                >
                  {{ usuario.dependencia }}
                </span>

                <span
                  v-else
                  class="sin-dependencia"
                >
                  Sin asignar
                </span>
              </td>

              <td>
                <span class="rol">
                  {{ nombreRol(usuario.rol) }}
                </span>
              </td>

              <td>
                <span
                  class="estado"
                  :class="{
                    activo: usuario.activo,
                    inactivo: !usuario.activo
                  }"
                >
                  {{
                    usuario.activo
                      ? 'Activo'
                      : 'Inactivo'
                  }}
                </span>
              </td>

              <td>
                <button
                  type="button"
                  class="btn-editar"
                  @click="editarUsuario(usuario)"
                >
                  Editar
                </button>
              </td>
            </tr>

            <tr
              v-if="usuariosFiltrados.length === 0"
            >
              <td
                colspan="6"
                class="vacio"
              >
                {{
                  adminState.usuarios.length
                    ? 'No hay usuarios que coincidan con la búsqueda.'
                    : 'Todavía no hay usuarios registrados.'
                }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="nota">
        Los usuarios registrados pertenecen al
        entorno demostrativo. Todavía no generan
        credenciales de autenticación reales.
      </p>
    </section>

    <!-- ======================================= -->
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
    <!-- MODAL CREAR / EDITAR USUARIO -->
    <!-- ======================================= -->

    <Teleport to="body">
      <div
        v-if="modalAbierto"
        class="modal-fondo"
        @click.self="cerrarModal"
      >
        <section
          class="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-modal-usuario"
        >
          <!-- ENCABEZADO DEL MODAL -->

          <header class="modal-header">
            <div>
              <span class="eyebrow">
                GESTIÓN DE USUARIOS
              </span>

              <h2 id="titulo-modal-usuario">
                {{
                  usuarioEditando
                    ? 'Editar usuario'
                    : 'Agregar usuario'
                }}
              </h2>

              <p>
                Configura sus datos,
                dependencia y permisos de acceso.
              </p>
            </div>

            <button
              type="button"
              class="cerrar"
              aria-label="Cerrar modal"
              @click="cerrarModal"
            >
              ×
            </button>
          </header>

          <!-- FORMULARIO -->

          <form
            class="modal-form"
            @submit.prevent="guardar"
          >
            <!-- NOMBRE -->

            <label>
              Nombre completo

              <input
                v-model.trim="formulario.nombre"
                type="text"
                required
                minlength="3"
                maxlength="120"
                autocomplete="name"
                placeholder="Nombre y apellidos"
              />
            </label>

            <!-- CORREO -->

            <label>
              Correo electrónico

              <input
                v-model.trim="formulario.correo"
                type="email"
                required
                maxlength="180"
                autocomplete="email"
                placeholder="usuario@institucion.gob.mx"
              />
            </label>

            <!-- DEPENDENCIA -->

            <label>
              Dependencia
              <span class="campo-ayuda">
                Unidad administrativa o dependencia
                municipal a la que pertenece el usuario.
              </span>

              <input
                v-model.trim="formulario.dependencia"
                type="text"
                required
                minlength="3"
                maxlength="180"
                placeholder="Ej. Dirección de Planeación"
              />
            </label>

            <!-- ROL -->

            <label>
              Rol del usuario

              <select
                v-model="formulario.rol"
                required
              >
                <option value="consulta">
                  Consulta
                </option>

                <option value="captura">
                  Captura
                </option>

                <option value="seguimiento">
                  Seguimiento
                </option>
              </select>
            </label>

            <!-- DESCRIPCIÓN DEL ROL -->

            <div class="rol-ayuda">
              <strong>
                Permisos por rol
              </strong>

              <p
                v-if="formulario.rol === 'consulta'"
              >
                Acceso de lectura al módulo Consulta
                y a las fichas técnicas publicadas.
              </p>

              <p
                v-else-if="formulario.rol === 'captura'"
              >
                Captura de variables, envío de
                expedientes y atención de observaciones.
              </p>

              <p v-else>
                Acceso al módulo Seguimiento.

                Las operaciones de captura,
                revisión y validación tendrán
                permisos independientes cuando
                se configure el backend.
              </p>
            </div>

            <!-- ESTADO -->

            <label class="interruptor">
              <input
                v-model="formulario.activo"
                type="checkbox"
              />

              <span>
                Usuario activo
              </span>
            </label>

            <!-- ERRORES -->

            <div
              v-if="error"
              class="error"
              role="alert"
            >
              {{ error }}
            </div>

            <!-- ACCIONES -->

            <footer class="modal-acciones">
              <button
                type="button"
                class="btn-secundario"
                :disabled="guardando"
                @click="cerrarModal"
              >
                Cancelar
              </button>

              <button
                type="submit"
                class="btn-principal btn-guardar-usuario"
                :disabled="guardando"
              >
                {{
                  guardando
                    ? 'Guardando...'
                    : usuarioEditando
                      ? 'Guardar cambios'
                      : 'Registrar usuario'
                }}
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
