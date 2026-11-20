<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import axios from 'axios';

import api from '../../core/api';
import { useAuthStore } from '../../store/auth.store';

import './recovery.css';

const authStore = useAuthStore();

const correo = ref('');
const enviando = ref(false);
const enviado = ref(false);
const error = ref('');

async function solicitarRecuperacion() {
  if (enviando.value || enviado.value) return;

  enviando.value = true;
  error.value = '';

  try {
    // Obtener la sesión anónima y el token CSRF.
    await authStore.initAuth();

    await api.post('/auth/recuperacion', {
      correo: correo.value.trim().toLowerCase()
    });

    enviado.value = true;
  
} catch (err: unknown) {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;

    // Diagnóstico temporal.
    // No imprimir datos del formulario ni
    // encabezados que puedan contener tokens.
    console.error('Error recuperación SIIP:', {
      status,
      codigo: err.code,
      respuesta: err.response?.data
    });

    if (status === 429) {
      error.value =
        'Has realizado demasiadas solicitudes. Inténtalo más tarde.';
    } else if (status === 503) {
      error.value =
        'El servicio de recuperación no está disponible temporalmente.';
    } else {
      error.value =
        'No pudimos procesar la solicitud. Inténtalo nuevamente.';
    }
  } else {
    console.error(
      'Error inesperado en recuperación:',
      err instanceof Error ? err.name : 'Desconocido'
    );

    error.value =
      'Ocurrió un error inesperado. Inténtalo nuevamente.';
  }
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

        <h1>Recuperar contraseña</h1>

        <p v-if="!enviado">
          Ingresa el correo electrónico registrado
          en el SIIP. Te enviaremos un enlace para
          establecer una nueva contraseña.
        </p>
      </div>

      <!-- CONFIRMACIÓN -->
      <div
        v-if="enviado"
        class="recovery-result"
        role="status"
      >
        <div class="recovery-result-icon" aria-hidden="true">
          ✓
        </div>

        <h2>Solicitud recibida</h2>

        <p>
          Si el correo corresponde a una cuenta habilitada,
          recibirás un enlace de recuperación.
        </p>

        <p>
          El enlace tendrá una vigencia de
          <strong>20 minutos</strong>.
          Revisa también tu carpeta de correo no deseado.
        </p>
      </div>

      <!-- FORMULARIO -->
      <form
        v-else
        class="recovery-form"
        @submit.prevent="solicitarRecuperacion"
      >
        <div class="recovery-field">
          <label for="recovery-email">
            Correo electrónico
          </label>

          <input
            id="recovery-email"
            v-model.trim="correo"
            type="email"
            autocomplete="email"
            inputmode="email"
            maxlength="255"
            placeholder="correo@institucion.gob.mx"
            :disabled="enviando"
            required
          />
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
          :disabled="enviando"
        >
          <span>
            {{
              enviando
                ? 'Procesando solicitud...'
                : 'Enviar enlace de recuperación'
            }}
          </span>

          <span aria-hidden="true">→</span>
        </button>
      </form>

      <div class="recovery-footer">
        <RouterLink
          :to="{ name: 'Login' }"
          class="recovery-back"
        >
          ← Volver al inicio de sesión
        </RouterLink>
      </div>
    </section>

    <p class="recovery-caption">
      SIIP Salamanca · Acceso institucional
    </p>
  </main>
</template>
