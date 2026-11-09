
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import axios from 'axios';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../store/auth.store';
import { useDialogFocus } from '../core/useDialogFocus';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

// Menú expandido en escritorio, cerrado en móvil.
const menuContraido = ref(false);
const menuMovilAbierto = ref(false);
const esMovil = ref(false);
const barraLateral = ref<HTMLElement | null>(null);
const dialogoMovil = computed(() => esMovil.value && menuMovilAbierto.value);
const isLoggingOut = ref(false);
const logoutError = ref('');

interface MenuItem {
  label: string;
  path: string;
  icono: string;
  visible: boolean;
}

const menuItems = computed<MenuItem[]>(() => [
  {
    label: 'Estadísticas',
    path: '/estadisticas',
    icono: '◫',
    visible: true
  },
  {
    label: 'Consulta',
    path: '/',
    icono: '▦',
    visible: true
  },
  {
    label: 'Captura',
    path: '/captura',
    icono: '✎',
    visible: authStore.isCapturista
  },
  {
    label: 'Seguimiento',
    path: '/seguimiento',
    icono: '◎',
    visible: authStore.isRevisor
  },
  {
    label: 'Administrador',
    path: '/administrador',
    icono: '⚙',
    visible: authStore.isAdmin
  }
]);

const opcionesVisibles = computed(() =>
  menuItems.value.filter(item => item.visible)
);

// Reconoce rutas anidadas.
const estaActivo = (path: string): boolean => {
  if (path === '/') {
    return route.path === '/';
  }

  return (
    route.path === path ||
    route.path.startsWith(`${path}/`)
  );
};

const tituloActual = computed(() => {
  const actual = menuItems.value.find(
    item => estaActivo(item.path)
  );

  return actual?.label || 'Panel institucional';
});

const inicialesUsuario = computed(() => {
  const nombre = authStore.user?.nombre || 'Usuario';

  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(palabra => palabra.charAt(0).toUpperCase())
    .join('');
});

const cambiarMenu = () => {
  menuContraido.value = !menuContraido.value;
};

const cerrarMenuMovil = () => {
  menuMovilAbierto.value = false;
};

useDialogFocus(barraLateral, dialogoMovil, cerrarMenuMovil);
let mediaMovil: MediaQueryList | null = null;
function actualizarTamano() {
  esMovil.value = mediaMovil?.matches ?? false;
  if (!esMovil.value) cerrarMenuMovil();
}
onMounted(() => {
  mediaMovil = window.matchMedia('(max-width: 850px)');
  actualizarTamano();
  mediaMovil.addEventListener('change', actualizarTamano);
});
onUnmounted(() => mediaMovil?.removeEventListener('change', actualizarTamano));

const handleLogout = async () => {
  if (isLoggingOut.value) return;
  cerrarMenuMovil();
  isLoggingOut.value = true;
  logoutError.value = '';
  try {
    await authStore.logout();
    await router.replace({ name: 'Login' });
  } catch (error) {
    logoutError.value = axios.isAxiosError(error)
      ? error.response?.data?.detail || 'No se pudo cerrar la sesión. Intenta de nuevo.'
      : 'No se pudo cerrar la sesión. Intenta de nuevo.';
  } finally {
    isLoggingOut.value = false;
  }
};

watch(
  () => route.fullPath,
  () => cerrarMenuMovil()
);
</script>

<template>
  <div
    class="app-shell"
    :class="{
      'menu-contraido': menuContraido,
      'menu-movil-abierto': menuMovilAbierto
    }"
  >
    <!-- Fondo para cerrar el menú en móvil -->
    <button
      v-if="menuMovilAbierto"
      type="button"
      class="mobile-backdrop"
      aria-label="Cerrar menú de navegación"
      @click="cerrarMenuMovil"
    ></button>

    <!-- BARRA LATERAL -->
    <aside
      id="siip-sidebar"
      ref="barraLateral"
      class="sidebar"
      :inert="esMovil && !menuMovilAbierto"
      :role="dialogoMovil ? 'dialog' : undefined"
      :aria-modal="dialogoMovil ? true : undefined"
      tabindex="-1"
      aria-label="Navegación principal"
    >
      <!-- Marca institucional -->
      <div class="sidebar-brand">
        <div class="brand-seal">S</div>

        <div class="brand-info">
          <strong>SIIP Salamanca</strong>
          <span>Panel institucional</span>
        </div>

        <button
          type="button"
          class="sidebar-close-mobile"
          aria-label="Cerrar menú"
          @click="cerrarMenuMovil"
        >
          ×
        </button>
      </div>

      <!-- Contraer / expandir -->
      <button
        type="button"
        class="sidebar-toggle"
        aria-controls="siip-sidebar"
        :aria-label="
          menuContraido
            ? 'Expandir menú lateral'
            : 'Contraer menú lateral'
        "
        :aria-expanded="!menuContraido"
        @click="cambiarMenu"
      >
        <span class="toggle-symbol">
          {{ menuContraido ? '»' : '«' }}
        </span>

        <span class="toggle-label">
          Contraer menú
        </span>
      </button>

      <!-- Navegación -->
      <div class="sidebar-scroll">
        <div class="nav-heading">
          MENÚ PRINCIPAL
        </div>

        <nav class="sidebar-nav">
          <router-link
            v-for="item in opcionesVisibles"
            :key="item.path"
            :to="item.path"
            class="sidebar-link"
            :class="{
              activo: estaActivo(item.path)
            }"
            :title="
              menuContraido
                ? item.label
                : undefined
            "
            :aria-current="
              estaActivo(item.path)
                ? 'page'
                : undefined
            "
            @click="cerrarMenuMovil"
          >
            <span
              class="sidebar-icon"
              aria-hidden="true"
            >
              {{ item.icono }}
            </span>

            <span class="sidebar-label">
              {{ item.label }}
            </span>
          </router-link>
        </nav>
      </div>

      <!-- Pie de la barra lateral -->
      <div class="sidebar-footer">
        <div class="environment-dot"></div>

        <div class="footer-copy">
          <strong>Entorno demostrativo</strong>
          <span>SIIP Salamanca · 2026</span>
        </div>
      </div>
    </aside>

    <!-- CONTENIDO PRINCIPAL -->
    <div class="main-area" :inert="dialogoMovil">
      <!-- Barra superior -->
      <header class="topbar">
        <div class="topbar-left">
          <button
            type="button"
            class="mobile-menu-button"
            aria-label="Abrir menú de navegación"
            aria-controls="siip-sidebar"
            :aria-expanded="menuMovilAbierto"
            @click="menuMovilAbierto = true"
          >
            ☰
          </button>

          <div class="topbar-title">
            <span class="breadcrumbs">
              SIIP / {{ tituloActual }}
            </span>

            <strong>
              {{ tituloActual }}
            </strong>
          </div>
        </div>

        <div class="topbar-right">
          <div class="user-details">
            <strong>
              {{ authStore.user?.nombre || 'Usuario' }}
            </strong>

            <span>
              {{ authStore.user?.rol || 'Sin rol' }}
            </span>
          </div>

          <div class="user-avatar">
            {{ inicialesUsuario }}
          </div>

          <button
            type="button"
            class="logout-button"
            :aria-label="isLoggingOut ? 'Cerrando sesión' : 'Cerrar sesión'"
            :disabled="isLoggingOut"
            @click="handleLogout"
          >
            <span>{{ isLoggingOut ? 'Cerrando sesión…' : 'Salir' }}</span>
            <span aria-hidden="true">↗</span>
          </button>
        </div>
      </header>

      <!-- Vistas actuales -->
      <main class="main-content">
        <p v-if="logoutError" role="alert" class="mb-4 text-red-600">{{ logoutError }}</p>
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  --wine: #70273b;
  --deep: #431c2a;
  --gold: #c69a4b;

  --blue: #245a81;
  --blue-dark: #183e5a;
  --blue-light: #eaf3f9;

  --muted: #777d85;
  --line: #e8e4dd;
  --sidebar-width: 260px;

  display: grid;
  grid-template-columns:
    var(--sidebar-width) minmax(0, 1fr);

  min-height: 100vh;
  min-height: 100dvh;

  background: #f7f5f1;
  color: #272b32;

  transition: grid-template-columns .25s ease;
}

.app-shell.menu-contraido {
  --sidebar-width: 76px;
}

/* ========================================
   BARRA LATERAL
   ======================================== */

.sidebar {
  position: sticky;
  top: 0;

  display: flex;
  flex-direction: column;

  width: 100%;
  height: 100vh;
  height: 100dvh;
  min-height: 0;

  overflow: hidden;
  padding: 24px 13px 16px;

  color: white;

  background:
    radial-gradient(
      ellipse at 110% 14%,
      rgba(36, 90, 129, .28),
      transparent 43%
    ),
    linear-gradient(
      170deg,
      #431c2a 0%,
      #3c1a28 100%
    );

  z-index: 30;
}

/* Marca */

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 11px;

  min-height: 55px;
  padding: 0 9px 20px;

  border-bottom: 1px solid #ffffff1c;
}

.brand-seal {
  display: grid;
  place-items: center;

  width: 44px;
  height: 44px;
  flex-shrink: 0;

  border: 2px solid var(--gold);
  border-radius: 12px;

  background:
    linear-gradient(
      135deg,
      var(--blue),
      var(--blue-dark)
    );

  color: #f0d29a;
  font-family: Georgia, serif;
  font-size: 23px;

  box-shadow:
    0 4px 15px #0002,
    0 0 0 3px #245a8124;
}

.brand-info {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
}

.brand-info strong {
  display: block;
  color: #fff;
  font-size: 15px;
  font-weight: 800;
}

.brand-info span {
  display: block;
  margin-top: 4px;

  color: #d5bfca;
  font-size: 11px;
}

/* Contraer menú */

.sidebar-toggle {
  display: flex;
  align-items: center;
  gap: 12px;

  width: 100%;
  padding: 13px 15px;
  margin-top: 13px;

  border: 1px solid rgba(109, 164, 204, .2);
  border-radius: 10px;

  background: rgba(36, 90, 129, .14);
  color: #e4d6dd;

  font-size: 12px;
  cursor: pointer;

  transition: background .2s;
}

.sidebar-toggle:hover {
  background: rgba(36, 90, 129, .32);
}

.sidebar-toggle:focus-visible,
.sidebar-link:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
}

.toggle-symbol {
  width: 17px;
  flex-shrink: 0;
  color: #9cc1dc;

  font-size: 20px;
  line-height: 1;
}

.toggle-label {
  white-space: nowrap;
}

/* Desplazamiento */

.sidebar-scroll {
  flex: 1;
  min-height: 0;

  overflow-y: auto;
  overflow-x: hidden;

  padding-top: 18px;

  scrollbar-width: thin;
  scrollbar-color: #ffffff36 transparent;
}

.sidebar-scroll::-webkit-scrollbar {
  width: 5px;
}

.sidebar-scroll::-webkit-scrollbar-thumb {
  background: #ffffff36;
  border-radius: 10px;
}

.nav-heading {
  padding: 9px 14px 14px;

  color: #c0a4ae;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .15em;

  white-space: nowrap;
}

/* Navegación */

.sidebar-nav {
  display: grid;
  gap: 6px;
}

.sidebar-link {
  position: relative;

  display: flex;
  align-items: center;
  gap: 13px;

  min-height: 47px;
  padding: 11px 13px;

  border-left: 3px solid transparent;
  border-radius: 9px;

  color: #e4ced5;
  text-decoration: none;

  font-size: 13px;
  font-weight: 700;

  transition:
    background .2s,
    color .2s,
    box-shadow .2s,
    transform .2s;
}

.sidebar-link:hover {
  background: rgba(36, 90, 129, .28);
  color: #fff;
  transform: translateX(2px);
}

/* Opción activa azul */

.sidebar-link.activo {
  background:
    linear-gradient(
      110deg,
      #245a81 0%,
      #286589 100%
    );

  color: #fff;
  border-left-color: var(--gold);

  box-shadow:
    0 5px 15px rgba(0, 0, 0, .15),
    0 0 0 1px rgba(165, 204, 230, .12);
}

.sidebar-icon {
  display: grid;
  place-items: center;

  width: 24px;
  flex-shrink: 0;

  color: #d8b2bd;
  font-size: 20px;
  line-height: 1;
}

.sidebar-link:hover .sidebar-icon {
  color: #b8d9ef;
}

.sidebar-link.activo .sidebar-icon {
  color: #f3d399;
}

.sidebar-label {
  overflow: hidden;
  white-space: nowrap;
}

/* Pie de la barra lateral */

.sidebar-footer {
  display: flex;
  align-items: center;
  gap: 11px;

  margin-top: 15px;
  padding: 18px 11px 4px;

  border-top: 1px solid #ffffff20;
}

.environment-dot {
  width: 8px;
  height: 8px;
  flex-shrink: 0;

  border-radius: 50%;
  background: #8fbea1;

  box-shadow:
    0 0 0 4px #8fbea118;
}

.footer-copy {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
}

.footer-copy strong,
.footer-copy span {
  display: block;
}

.footer-copy strong {
  color: #e4cbd2;
  font-size: 11px;
}

.footer-copy span {
  margin-top: 4px;
  color: #b995a1;
  font-size: 10px;
}

/* ========================================
   MENÚ CONTRAÍDO
   ======================================== */

.menu-contraido .brand-info,
.menu-contraido .toggle-label,
.menu-contraido .nav-heading,
.menu-contraido .sidebar-label,
.menu-contraido .footer-copy {
  display: none;
}

.menu-contraido .sidebar-brand {
  justify-content: center;
  padding-left: 0;
  padding-right: 0;
}

.menu-contraido .sidebar-toggle,
.menu-contraido .sidebar-link,
.menu-contraido .sidebar-footer {
  justify-content: center;
}

.menu-contraido .sidebar-toggle {
  padding: 13px 0;
}

.menu-contraido .sidebar-link {
  padding: 11px 0;
}

.menu-contraido .sidebar-footer {
  padding-left: 0;
  padding-right: 0;
}

/* ========================================
   CONTENIDO PRINCIPAL
   ======================================== */

.main-area {
  min-width: 0;
  min-height: 100vh;
  min-height: 100dvh;

  display: flex;
  flex-direction: column;
}

/* Barra superior */

.topbar {
  position: relative;
  z-index: 10;

  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;

  min-height: 79px;
  padding: 14px clamp(20px, 3vw, 44px);

  background: white;
  border-bottom: 1px solid var(--line);
}

/* Pequeño detalle tricolor */

.topbar::after {
  content: '';
  position: absolute;

  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;

  background:
    linear-gradient(
      to right,
      var(--wine) 0 34%,
      var(--gold) 34% 65%,
      var(--blue) 65% 100%
    );

  opacity: .85;
  pointer-events: none;
}

.topbar-left,
.topbar-right {
  display: flex;
  align-items: center;
  gap: 15px;
  min-width: 0;
}

.topbar-title {
  min-width: 0;
}

.breadcrumbs {
  display: block;
  margin-bottom: 4px;

  color: var(--blue);
  font-size: 11px;
  font-weight: 650;
}

.topbar-title strong {
  display: block;
  color: var(--deep);
  font-size: 15px;
}

/* Usuario */

.user-details {
  text-align: right;
}

.user-details strong {
  display: block;
  font-size: 12px;
}

.user-details span {
  display: block;
  margin-top: 3px;

  color: var(--muted);
  font-size: 11px;
  text-transform: capitalize;
}

.user-avatar {
  display: grid;
  place-items: center;

  width: 38px;
  height: 38px;
  flex-shrink: 0;

  border: 1px solid #bdd5e5;
  border-radius: 50%;

  color: var(--blue-dark);
  background: var(--blue-light);

  font-size: 12px;
  font-weight: 800;
}

/* Cerrar sesión */

.logout-button {
  display: flex;
  align-items: center;
  gap: 8px;

  padding: 10px 13px;

  border: 1px solid #e6d8c3;
  border-radius: 9px;

  background: #f3eee6;
  color: var(--wine);

  font-size: 12px;
  font-weight: 750;
  cursor: pointer;

  transition: background .2s;
}

.logout-button:hover {
  background: #ede2d6;
}

/* Contenido de módulos */

.main-content {
  flex: 1;
  min-width: 0;
  width: 100%;

  padding: 32px clamp(18px, 3vw, 44px);
}

.mobile-menu-button,
.sidebar-close-mobile,
.mobile-backdrop {
  display: none;
}

/* ========================================
   RESPONSIVE
   ======================================== */

@media (max-width: 850px) {
  .app-shell,
  .app-shell.menu-contraido {
    display: block;
  }

  .sidebar {
    position: fixed;
    top: 0;
    left: 0;

    width: min(290px, 85vw);

    height: 100vh;
    height: 100dvh;

    transform: translateX(-100%);
    transition: transform .25s ease;

    z-index: 60;
  }

  .menu-movil-abierto .sidebar {
    transform: translateX(0);
  }

  /* En móvil se muestran siempre los nombres */

  .menu-contraido .brand-info,
  .menu-contraido .nav-heading,
  .menu-contraido .sidebar-label,
  .menu-contraido .footer-copy {
    display: block;
  }

  .menu-contraido .sidebar-brand,
  .menu-contraido .sidebar-link,
  .menu-contraido .sidebar-footer {
    justify-content: flex-start;
  }

  .menu-contraido .sidebar-link {
    padding: 11px 13px;
  }

  .sidebar-toggle {
    display: none;
  }

  .sidebar-close-mobile {
    display: grid;
    place-items: center;

    width: 32px;
    height: 32px;

    margin-left: auto;
    flex-shrink: 0;

    border: 0;
    border-radius: 8px;

    background: #ffffff15;
    color: #fff;

    font-size: 24px;
    cursor: pointer;
  }

  .mobile-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 50;

    width: 100%;
    height: 100%;

    background: rgba(25, 16, 23, .55);
    border: 0;

    cursor: pointer;
  }

  .mobile-menu-button {
    display: grid;
    place-items: center;

    width: 39px;
    height: 39px;
    flex-shrink: 0;

    border: 1px solid #bfd6e5;
    border-radius: 9px;

    background: var(--blue-light);
    color: var(--blue);

    font-size: 20px;
    cursor: pointer;
  }

  .topbar {
    min-height: 69px;
  }

  .main-content {
    padding: 22px 18px;
  }
}

@media (max-width: 500px) {
  .user-details {
    display: none;
  }

  .topbar {
    padding: 12px 15px;
  }

  .topbar-left,
  .topbar-right {
    gap: 9px;
  }

  .logout-button {
    padding: 10px;
  }

  .logout-button span:first-child {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-shell,
  .sidebar,
  .sidebar-link,
  .sidebar-toggle,
  .logout-button {
    transition: none;
  }
}
</style>
