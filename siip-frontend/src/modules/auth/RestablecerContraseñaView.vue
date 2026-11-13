<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  RouterLink,
  useRoute,
  useRouter
} from 'vue-router';

import axios from 'axios';

import api from '../../core/api';
import { useAuthStore } from '../../store/auth.store';

import './recovery.css';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const password = ref('');
const confirmarPassword = ref('');

const mostrarPassword = ref(false);
const mostrarConfirmacion = ref(false);

const guardando = ref(false);
const completado = ref(false);
const error = ref('');

const token = computed(() => {
  const value = route.query.token;

  return typeof value === 'string'
    ? value
    : '';
});

const tokenValido = computed(() =>
  /^[a-f0-9]{64}$/i.test(token.value)
);

const contrasenasCoinciden = computed(() =>
  password.value === confirmarPassword.value
);

const passwordValida = computed(() =>
  password.value.length >= 12 &&
  password.value.length <= 128
);

const puedeGuardar = computed(() =>
  tokenValido.value &&
  passwordValida.value &&
  contrasenasCoinciden.value &&
  !guardando.value &&
  !completado.value
);

async function restablecerContrasena() {
  if (guardando.value || completado.value) return;

  error.value = '';

  if (!tokenValido.value) {
    error.value =
      'El enlace de recuperación no es válido.';
    return;
  }

  if (!passwordValida.value) {
    error.value =
      'La contraseña debe tener entre 12 y 128 caracteres.';
    return;
  }

  if (!contrasenasCoinciden.value) {
    error.value =
      'Las contraseñas no coinciden.';
    return;
  }

  guardando.value = true;

  try {
    // Obtener token CSRF para la solicitud.
    await authStore.initAuth();

    await api.post('/auth/restablecer', {
      token: token.value,
      password: password.value
    });

    password.value = '';
    confirmarPassword.value = '';

    completado.value = true;

    // Evitar dejar el token en la URL
    // después de usarlo correctamente.
    await router.replace({
      name: 'RestablecerContrasena'
    });
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;

      if (status === 400 || status === 404) {
        error.value =
          'El enlace es inválido, caducó o ya fue utilizado. Solicita uno nuevo.';
      } else if (status === 422) {
        error.value =
          'Verifica que la nueva contraseña cumpla los requisitos.';
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
</script>

<template>
  <main class="recovery-page">
    <section class="recovery-card">
      <div class="recovery-brand">
        <div class="recovery-emblem" aria-hidden="true">
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

        <h1>Establecer contraseña</h1>
      </div>

      <!-- RECUPERACIÓN EXITOSA -->
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

        <h2>Contraseña actualizada</h2>

        <p>
          Tu contraseña se cambió correctamente.
          Ya puedes iniciar sesión con tus
          nuevas credenciales.
        </p>

        <RouterLink
          :to="{ name: 'Login' }"
          class="recovery-button recovery-button-link"
        >
          Ir al inicio de sesión
          <span aria-hidden="true">→</span>
        </RouterLink>
      </div>

      <!-- ENLACE INVÁLIDO -->
      <div
        v-else-if="!tokenValido"
        class="recovery-result recovery-result-error"
        role="alert"
      >
        <h2>Enlace no válido</h2>

        <p>
          El enlace de recuperación está incompleto
          o no tiene un formato válido.
        </p>

        <RouterLink
          :to="{ name: 'RecuperarContrasena' }"
          class="recovery-button recovery-button-link"
        >
          Solicitar otro enlace
          <span aria-hidden="true">→</span>
        </RouterLink>
      </div>

      <!-- FORMULARIO NUEVA CONTRASEÑA -->
      <form
        v-else
        class="recovery-form"
        @submit.prevent="restablecerContrasena"
      >
        <p class="recovery-description">
          Ingresa una contraseña nueva de al menos
          12 caracteres. No compartas tu contraseña
          con otras personas.
        </p>

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
              minlength="12"
              maxlength="128"
              :disabled="guardando"
              required
              placeholder="Ingresa tu nueva contraseña"
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
            Mínimo 12 caracteres
          </span>
        </div>

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
              minlength="12"
              maxlength="128"
              :disabled="guardando"
              required
              placeholder="Repite tu nueva contraseña"
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
                ? 'Guardando contraseña...'
                : 'Guardar nueva contraseña'
            }}
          </span>

          <span aria-hidden="true">→</span>
        </button>
      </form>

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
