
<script setup lang="ts">
import { ref } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../store/auth.store';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const errorMsg = ref('');
const cargando = ref(false);
const mostrarPassword = ref(false);

const handleLogin = async () => {
  if (cargando.value) return;

  errorMsg.value = '';
  cargando.value = true;

  try {
    await authStore.login(email.value, password.value);
    password.value = '';
    await router.replace({ name: 'Estadisticas' });
  } catch (error) {
    errorMsg.value = axios.isAxiosError(error)
      ? error.response?.data?.detail || 'No se pudo conectar con el servidor. Intenta de nuevo.'
      : 'Ocurrió un error al intentar acceder.';
  } finally {
    cargando.value = false;
  }
};
</script>

<template>
  <div class="login-page">
    <!-- PANEL INSTITUCIONAL -->
    <section class="login-hero">
      <div class="hero-brand">
        <div class="hero-seal">S</div>

        <div>
          <strong>SIIP · SALAMANCA</strong>
          <span>Sistema institucional</span>
        </div>
      </div>

      <div class="hero-content">
        <span class="hero-eyebrow">
          INTELIGENCIA PARA LA PLANEACIÓN
        </span>

        <h1>
          Los datos construyen
          <em>mejores decisiones.</em>
        </h1>

        <p>
          Plataforma municipal para consultar,
          capturar, revisar y dar seguimiento
          a los indicadores estratégicos de Salamanca.
        </p>

        <!-- DETALLE TRICOLOR -->
        <div class="hero-divider">
          <span></span>
          <span></span>
          <span></span>
        </div>

        <div class="hero-features">
          <div>
            <span class="feature-dot"></span>
            Información institucional
          </div>

          <div>
            <span class="feature-dot"></span>
            Seguimiento municipal
          </div>

          <div>
            <span class="feature-dot"></span>
            Planeación basada en datos
          </div>
        </div>
      </div>

      <footer class="hero-footer">
        <span>Salamanca, Guanajuato</span>
        <span>Prototipo demostrativo · 2026</span>
      </footer>
    </section>

    <!-- FORMULARIO -->
    <main class="login-form-area">
      <div class="login-form-container">
        <div class="login-intro">
          <span class="form-eyebrow">
            BIENVENIDO AL SISTEMA
          </span>

          <h2>Iniciar sesión</h2>

          <p>
            Accede al Sistema Integrado de
            Indicadores de Planeación.
          </p>
        </div>

        <form
          class="login-form"
          @submit.prevent="handleLogin"
        >
          <div class="form-group">
            <label for="email">
              Correo electrónico
            </label>

            <input
              id="email"
              v-model.trim="email"
              type="email"
              autocomplete="username"
              maxlength="255"
              placeholder="usuario@salamanca.gob.mx"
              required
            />
          </div>

          <div class="form-group">
            <label for="password">
              Contraseña
            </label>

            <div class="password-wrapper">
              <input
                id="password"
                v-model="password"
                :type="
                  mostrarPassword ? 'text' : 'password'
                "
                autocomplete="current-password"
                maxlength="1024"
                placeholder="Ingresa tu contraseña"
                required
              />

              <button
                type="button"
                class="password-toggle"
                :aria-label="
                  mostrarPassword
                    ? 'Ocultar contraseña'
                    : 'Mostrar contraseña'
                "
                :aria-pressed="mostrarPassword"
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
          </div>

          <p
            v-if="errorMsg"
            class="form-error"
            role="alert"
          >
            {{ errorMsg }}
          </p>

          <button
            type="submit"
            class="login-button"
            :disabled="cargando"
          >
            <span>
              {{
                cargando
                  ? 'Ingresando...'
                  : 'Entrar al sistema'
              }}
            </span>

            <span class="button-arrow" aria-hidden="true">
              →
            </span>
          </button>

          <p class="demo-note">
            Entorno de demostración.
            La autenticación real se integrará posteriormente.
          </p>
        </form>

        <div class="login-bottom">
          <span class="bottom-line"></span>

          <p>
            SIIP Salamanca
            <span>· Plataforma institucional</span>
          </p>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.login-page {
  --wine: #70273b;
  --deep: #431c2a;
  --gold: #c69a4b;
  --blue: #245a81;
  --blue-dark: #183e5a;
  --blue-light: #eaf3f9;
  --ink: #272b32;
  --muted: #777d85;

  min-height: 100vh;
  min-height: 100dvh;
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  background: #f7f5f1;
  color: var(--ink);
}

/* ========================================
   PANEL INSTITUCIONAL
   ======================================== */

.login-hero {
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 50px;
  min-height: 100vh;
  min-height: 100dvh;
  overflow: hidden;
  padding: clamp(35px, 6vw, 90px);
  color: white;

  background:
    radial-gradient(
      circle at 88% 18%,
      rgba(36, 90, 129, .38),
      transparent 34%
    ),
    linear-gradient(
      145deg,
      #351825 0%,
      #602337 56%,
      #70273b 100%
    );
}

/* Círculos decorativos */

.login-hero::before {
  content: '';
  position: absolute;
  z-index: -1;

  width: 540px;
  height: 540px;
  right: -240px;
  bottom: -250px;

  border: 1px solid rgba(184, 210, 228, .32);
  border-radius: 50%;

  box-shadow:
    0 0 0 85px rgba(36, 90, 129, .12),
    0 0 0 170px rgba(255, 255, 255, .025);

  pointer-events: none;
}

.login-hero::after {
  content: '';
  position: absolute;
  z-index: -1;

  width: 350px;
  height: 350px;
  left: -250px;
  top: 20%;

  border: 1px solid rgba(198, 154, 75, .28);
  border-radius: 50%;

  pointer-events: none;
}

/* Identidad */

.hero-brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.hero-seal {
  display: grid;
  place-items: center;
  width: 50px;
  height: 50px;
  flex-shrink: 0;

  border: 2px solid var(--gold);
  border-radius: 13px;

  background:
    linear-gradient(
      145deg,
      var(--blue),
      var(--blue-dark)
    );

  color: #f5d59a;
  font-family: Georgia, serif;
  font-size: 26px;

  box-shadow:
    0 5px 20px rgba(0, 0, 0, .16),
    0 0 0 4px rgba(36, 90, 129, .17);
}

.hero-brand strong {
  display: block;
  color: white;
  font-size: 14px;
  letter-spacing: .07em;
}

.hero-brand span {
  display: block;
  margin-top: 3px;
  color: #e5c6ce;
  font-size: 11px;
}

/* Mensaje principal */

.hero-content {
  position: relative;
  max-width: 620px;
}

.hero-eyebrow {
  color: #edcb89;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .16em;
}

.hero-content h1 {
  margin: 18px 0 25px;
  font-family: Georgia, serif;
  font-size: clamp(40px, 5vw, 72px);
  font-weight: 500;
  line-height: 1.12;
  letter-spacing: -.04em;
}

.hero-content h1 em {
  display: block;
  color: #edcb89;
  font-style: normal;
}

.hero-content > p {
  max-width: 450px;
  color: #f0dce1;
  font-size: 16px;
  line-height: 1.85;
}

/* Línea institucional tricolor */

.hero-divider {
  display: flex;
  gap: 0;
  width: 100px;
  height: 4px;
  margin: 34px 0;
  overflow: hidden;
  border-radius: 20px;
}

.hero-divider span:first-child {
  width: 35%;
  background: var(--gold);
}

.hero-divider span:nth-child(2) {
  width: 35%;
  background: var(--blue);
}

.hero-divider span:last-child {
  width: 30%;
  background: #f4e7ec;
}

/* Características */

.hero-features {
  display: grid;
  gap: 13px;
}

.hero-features > div {
  display: flex;
  align-items: center;
  gap: 11px;
  color: #ead5dc;
  font-size: 12px;
}

.feature-dot {
  width: 8px;
  height: 8px;
  flex-shrink: 0;

  background: var(--gold);
  border-radius: 50%;
}

.hero-features > div:nth-child(2) .feature-dot {
  background: #69a6ce;
}

.hero-footer {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  color: #debfc8;
  font-size: 11px;
}

/* ========================================
   ÁREA DEL FORMULARIO
   ======================================== */

.login-form-area {
  position: relative;
  display: grid;
  place-items: center;
  padding: 35px;

  background:
    radial-gradient(
      circle at 100% 0%,
      rgba(36, 90, 129, .07),
      transparent 40%
    ),
    #f7f5f1;
}

.login-form-container {
  width: min(410px, 100%);
}

.login-intro {
  margin-bottom: 34px;
}

.form-eyebrow {
  color: var(--blue);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .15em;
}

.login-intro h2 {
  margin: 12px 0;
  color: var(--deep);
  font-family: Georgia, serif;
  font-size: 38px;
  font-weight: 500;
  letter-spacing: -.035em;
}

.login-intro p {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.8;
}

/* Campos */

.login-form {
  display: grid;
  gap: 20px;
}

.form-group {
  display: grid;
  gap: 9px;
}

.form-group label {
  color: #47434a;
  font-size: 12px;
  font-weight: 750;
}

.form-group input {
  width: 100%;
  min-width: 0;
  height: 49px;
  padding: 0 15px;

  border: 1px solid #dddcd7;
  border-radius: 10px;
  outline: none;

  background: white;
  color: var(--ink);
  font-size: 13px;

  transition:
    border-color .2s,
    box-shadow .2s;
}

.form-group input:focus {
  border-color: var(--blue);
  box-shadow: 0 0 0 3px rgba(36, 90, 129, .14);
}

.password-wrapper {
  position: relative;
}

.password-wrapper input {
  padding-right: 90px;
}

.password-toggle {
  position: absolute;
  top: 50%;
  right: 12px;
  transform: translateY(-50%);

  border: 0;
  background: transparent;
  color: var(--blue);

  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}

.password-toggle:hover {
  color: var(--blue-dark);
  text-decoration: underline;
}

.form-error {
  margin: 0;
  color: #ad3d50;
  font-size: 12px;
}

/* Botón principal azul */

.login-button {
  display: flex;
  align-items: center;
  justify-content: space-between;

  width: 100%;
  min-height: 52px;
  padding: 0 19px;

  border: 1px solid var(--blue);
  border-radius: 10px;

  background:
    linear-gradient(
      110deg,
      var(--blue),
      var(--blue-dark)
    );

  color: #fff;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;

  box-shadow:
    0 9px 22px rgba(36, 90, 129, .18);

  transition:
    background .2s,
    box-shadow .2s,
    transform .2s;
}

.login-button > span {
  color: #fff;
}

.login-button:hover:not(:disabled) {
  background:
    linear-gradient(
      110deg,
      #316f9a,
      var(--blue)
    );

  box-shadow:
    0 12px 28px rgba(36, 90, 129, .28);

  transform: translateY(-2px);
}

.login-button:focus-visible {
  outline: 3px solid var(--gold);
  outline-offset: 3px;
}

.login-button:disabled {
  opacity: .65;
  cursor: wait;
}

.button-arrow {
  font-size: 19px;
  transition: transform .2s;
}

.login-button:hover:not(:disabled) .button-arrow {
  transform: translateX(3px);
}

.demo-note {
  margin: 0;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.7;
}

/* Pie del formulario */

.login-bottom {
  margin-top: 60px;
}

.bottom-line {
  display: block;
  width: 100%;
  height: 2px;

  background:
    linear-gradient(
      to right,
      var(--wine) 0 38%,
      var(--gold) 38% 65%,
      var(--blue) 65% 100%
    );
}

.login-bottom p {
  margin-top: 18px;
  color: var(--wine);
  font-size: 12px;
  font-weight: 800;
}

.login-bottom p span {
  color: var(--muted);
  font-weight: 400;
}

/* ========================================
   RESPONSIVE
   ======================================== */

@media (max-width: 900px) {
  .login-page {
    grid-template-columns: 1fr;
  }

  .login-hero {
    min-height: 350px;
    padding: 35px;
    gap: 36px;
  }

  .hero-content h1 {
    font-size: clamp(34px, 6vw, 48px);
  }

  .hero-features,
  .hero-divider {
    display: none;
  }

  .login-form-area {
    padding: 55px 24px;
  }

  .login-bottom {
    margin-top: 35px;
  }
}

@media (max-width: 480px) {
  .login-hero {
    min-height: 290px;
    padding: 25px;
  }

  .hero-content h1 {
    font-size: 35px;
    margin: 14px 0;
  }

  .hero-content > p {
    font-size: 13px;
  }

  .hero-footer {
    font-size: 10px;
  }

  .login-intro h2 {
    font-size: 32px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .login-button,
  .button-arrow,
  .form-group input {
    transition: none;
  }
}
</style>
