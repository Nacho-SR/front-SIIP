
<script setup lang="ts">
import {
  computed,
  ref,
  watch
} from 'vue';

import {
  RouterLink,
  useRoute,
  useRouter
} from 'vue-router';

import axios from 'axios';

import api from '../../core/api';
import { useAuthStore } from '../../store/auth.store';

import './recovery.css';

// ============================================
// COMPOSABLES
// ============================================

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

// ============================================
// ESTADO DEL FORMULARIO
// ============================================

const password = ref('');
const confirmarPassword = ref('');

const mostrarPassword = ref(false);
const mostrarConfirmacion = ref(false);

const guardando = ref(false);
const completado = ref(false);
const error = ref('');

// ============================================
// ESTADO DEL ENLACE
// ============================================

type EstadoEnlace =
  | 'verificando'
  | 'valido'
  | 'invalido'
  | 'error';

const estadoEnlace = ref<EstadoEnlace>(
  'verificando'
);

let verificacionActual = 0;

const token = computed(() => {
  const value = route.query.token;

  return typeof value === 'string'
    ? value
    : '';
});

const formatoValido = computed(() =>
  /^[a-f0-9]{64}$/i.test(token.value)
);

// ============================================
// VALIDACIONES
// ============================================

const passwordValida = computed(() =>
  password.value.length >= 15 &&
  password.value.length <= 1024
);

const contrasenasCoinciden = computed(() =>
  password.value === confirmarPassword.value
);

const puedeGuardar = computed(() =>
  estadoEnlace.value === 'valido' &&
  passwordValida.value &&
  contrasenasCoinciden.value &&
  !guardando.value &&
  !completado.value
);

// ============================================
// VERIFICAR TOKEN EN POSTGRESQL
// ============================================

async function verificarEnlace() {
  const numeroVerificacion = ++verificacionActual;

  if (completado.value) return;

  error.value = '';
  password.value = '';
  confirmarPassword.value = '';

  if (!formatoValido.value) {
    estadoEnlace.value = 'invalido';
    return;
  }

  estadoEnlace.value = 'verificando';

  const tokenConsultado = token.value;

  try {
    // Obtener sesión anónima y CSRF.
    await authStore.initAuth();

    const { data } = await api.post<{
      valido: boolean;
    }>(
      '/auth/validar-recuperacion',
      {
        token: tokenConsultado
      }
    );

    // Descartar respuestas antiguas si
    // el usuario cambió de enlace.
    if (
      numeroVerificacion !== verificacionActual ||
      token.value !== tokenConsultado
    ) {
      return;
    }

    estadoEnlace.value = data.valido
      ? 'valido'
      : 'invalido';

  } catch (err: unknown) {
    if (
      numeroVerificacion !== verificacionActual
    ) {
      return;
    }

    estadoEnlace.value = 'error';

    if (
      axios.isAxiosError(err) &&
      err.response?.status === 429
    ) {
      error.value =
        'Demasiadas verificaciones. Inténtalo más tarde.';
    } else {
      error.value =
        'No pudimos verificar el enlace. Revisa tu conexión e inténtalo nuevamente.';
    }
  }
}

// ============================================
// GUARDAR NUEVA CONTRASEÑA
// ============================================

async function restablecerContrasena() {
  if (!puedeGuardar.value) return;

  error.value = '';

  if (!passwordValida.value) {
    error.value =
      'La contraseña debe tener entre 15 y 1024 caracteres.';
    return;
  }

  if (!contrasenasCoinciden.value) {
    error.value =
      'Las contraseñas no coinciden.';
    return;
  }

  guardando.value = true;

  try {
    await authStore.initAuth();

    await api.post(
      '/auth/restablecer',
      {
        token: token.value,
        password: password.value
      }
    );

    // Limpiar datos sensibles del formulario.
    password.value = '';
    confirmarPassword.value = '';

    completado.value = true;

    // Evitar que el token utilizado
    // permanezca en la barra de direcciones.
    await router.replace({
      name: 'RestablecerContrasena'
    });

  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;

      if (status === 400) {
        // El enlace pudo caducar o consumirse
        // mientras el usuario completaba el
        // formulario.
        estadoEnlace.value = 'invalido';

        password.value = '';
        confirmarPassword.value = '';

      } else if (status === 422) {
        error.value =
          'Verifica que la contraseña cumpla los requisitos.';

      } else if (status === 429) {
        error.value =
          'Demasiados intentos. Inténtalo más tarde.';

      } else {
        error.value =
          'No pudimos actualizar tu contraseña. Inténtalo nuevamente.';
      }
    } else {
      error.value =
        'Ocurrió un error inesperado.';
    }

  } finally {
    guardando.value = false;
  }
}

// ============================================
// VERIFICAR AL ABRIR EL ENLACE
// ============================================

watch(
  token,
  () => {
    if (!completado.value) {
      void verificarEnlace();
    }
  },
  { immediate: true }
);
</script>

<template>
  <main class="recovery-page">
    <section class="recovery-card">

      <!-- IDENTIDAD INSTITUCIONAL -->
      <div class="recovery-brand">
        <div
          class="recovery-emblem"
          aria-hidden="true"
        >
          S
        </div>

        <div>
          <strong>SIIP SALAMANCA</strong>
          <span>Sistema institucional</span>
        </div>
      </div>

      <div class="recovery-heading">
        <span class="recovery-eyebrow">
          SEGURIDAD DE LA CUENTA
        </span>

        <h1>
          Restablecer contraseña
        </h1>
      </div>

      <!-- ===================================
           CONTRASEÑA ACTUALIZADA
           =================================== -->

      <div
        v-if="completado"
        class="recovery-result"
        role="status"
      >
        <div
          class="recovery-result-icon"
          aria-hidden="true"
        >
          ✓
        </div>

        <h2>
          Contraseña actualizada
        </h2>

        <p>
          Tu contraseña se ha cambiado
          correctamente.
        </p>

        <p>
          El enlace de recuperación ya fue
          utilizado y no podrá volver a usarse.
        </p>

        <p>
          Ahora puedes iniciar sesión con
          tu nueva contraseña.
        </p>

        <RouterLink
          :to="{ name: 'Login' }"
          class="recovery-button recovery-button-link"
        >
          <span>Ir al inicio de sesión</span>
          <span aria-hidden="true">→</span>
        </RouterLink>
      </div>

      <!-- ===================================
           VERIFICACIÓN
           =================================== -->

      <div
        v-else-if="estadoEnlace === 'verificando'"
        class="recovery-result"
        role="status"
        aria-live="polite"
      >
        <h2>
          Verificando enlace...
        </h2>

        <p>
          Estamos comprobando que tu enlace
          de recuperación siga disponible.
        </p>
      </div>

      <!-- ===================================
           ENLACE INVÁLIDO / UTILIZADO
           =================================== -->

      <div
        v-else-if="estadoEnlace === 'invalido'"
        class="recovery-result recovery-result-error"
        role="alert"
      >
        <div class="recovery-invalid-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9"/>
            <path d="M12 7v6"/>
            <path d="M12 17h.01"/>
          </svg>
        </div>

        <h2>
          Este enlace ya no está disponible
        </h2>

        <p>
          El enlace de recuperación
          <strong>
            ya fue utilizado, ha caducado
            o no es válido.
          </strong>
        </p>

        <p>
          Por seguridad, los enlaces solo pueden
          utilizarse una vez y tienen una
          vigencia de 20 minutos.
        </p>

        <p>
          Para establecer una nueva contraseña,
          solicita otro enlace de recuperación.
        </p>

        <RouterLink
          :to="{ name: 'RecuperarContrasena' }"
          class="recovery-button recovery-button-link"
        >
          <span>Solicitar nuevo enlace</span>
          <span aria-hidden="true">→</span>
        </RouterLink>
      </div>

      <!-- ===================================
           ERROR DE COMUNICACIÓN
           =================================== -->

      <div
        v-else-if="estadoEnlace === 'error'"
        class="recovery-result"
        role="alert"
      >
        <h2>
          No se pudo verificar el enlace
        </h2>

        <p>
          {{ error }}
        </p>

        <button
          type="button"
          class="recovery-button"
          @click="verificarEnlace"
        >
          <span>Intentar nuevamente</span>
          <span aria-hidden="true">↻</span>
        </button>
      </div>

      <!-- ===================================
           FORMULARIO: SOLO TOKEN VÁLIDO
           =================================== -->

      <form
        v-else-if="estadoEnlace === 'valido'"
        class="recovery-form"
        @submit.prevent="restablecerContrasena"
      >
        <p class="recovery-description">
          El enlace está disponible.
          Establece una contraseña nueva de
          entre 15 y 1024 caracteres.
        </p>

        <!-- NUEVA CONTRASEÑA -->
        <div class="recovery-field">
          <label for="new-password">
            Nueva contraseña
          </label>

          <div class="recovery-password">
            <input
              id="new-password"
              v-model="password"
              :type="
                mostrarPassword
                  ? 'text'
                  : 'password'
              "
              autocomplete="new-password"
              minlength="15"
              maxlength="1024"
              :disabled="guardando"
              placeholder="Ingresa tu nueva contraseña"
              required
            />

            <button
              type="button"
              class="recovery-toggle"
              :aria-pressed="mostrarPassword"
              :disabled="guardando"
              @click="
                mostrarPassword = !mostrarPassword
              "
            >
              {{
                mostrarPassword
                  ? 'Ocultar'
                  : 'Mostrar'
              }}
            </button>
          </div>

          <span
            class="recovery-hint"
            :class="{
              'is-valid': passwordValida
            }"
          >
            De 15 a 1024 caracteres
          </span>
        </div>

        <!-- CONFIRMAR CONTRASEÑA -->
        <div class="recovery-field">
          <label for="confirm-password">
            Confirmar contraseña
          </label>

          <div class="recovery-password">
            <input
              id="confirm-password"
              v-model="confirmarPassword"
              :type="
                mostrarConfirmacion
                  ? 'text'
                  : 'password'
              "
              autocomplete="new-password"
              minlength="15"
              maxlength="1024"
              :disabled="guardando"
              placeholder="Repite tu contraseña"
              required
            />

            <button
              type="button"
              class="recovery-toggle"
              :aria-pressed="mostrarConfirmacion"
              :disabled="guardando"
              @click="
                mostrarConfirmacion =
                  !mostrarConfirmacion
              "
            >
              {{
                mostrarConfirmacion
                  ? 'Ocultar'
                  : 'Mostrar'
              }}
            </button>
          </div>

          <span
            v-if="confirmarPassword"
            class="recovery-hint"
            :class="{
              'is-valid': contrasenasCoinciden,
              'is-invalid': !contrasenasCoinciden
            }"
          >
            {{
              contrasenasCoinciden
                ? 'Las contraseñas coinciden'
                : 'Las contraseñas no coinciden'
            }}
          </span>
        </div>

        <p
          v-if="error"
          class="recovery-error"
          role="alert"
        >
          {{ error }}
        </p>

        <button
          type="submit"
          class="recovery-button"
          :disabled="!puedeGuardar"
        >
          <span>
            {{
              guardando
                ? 'Guardando...'
                : 'Guardar nueva contraseña'
            }}
          </span>

          <span aria-hidden="true">→</span>
        </button>
      </form>

      <!-- PIE -->
      <div class="recovery-footer">
        <RouterLink
          :to="{ name: 'RecuperarContrasena' }"
          class="recovery-back"
        >
          Solicitar otro enlace
        </RouterLink>

        <RouterLink
          :to="{ name: 'Login' }"
          class="recovery-back"
        >
          Volver al inicio de sesión
        </RouterLink>
      </div>

    </section>

    <p class="recovery-caption">
      SIIP Salamanca · Acceso institucional
    </p>
  </main>
</template>

<style scoped>
.recovery-invalid-icon {
  display: grid;
  place-items: center;
  width: 58px;
  height: 58px;
  margin-bottom: 5px;
  border-radius: 50%;
  background: #fff0f2;
  color: #a32c45;
}

.recovery-invalid-icon svg {
  width: 29px;
  height: 29px;
}
</style>
