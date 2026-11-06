
<script setup lang="ts">
import {
  computed,
  onMounted,
  onUnmounted,
  ref,
  watch
} from 'vue';

interface Indicador {
  clave: string;
  nombre: string;
  definicion: string;
  nivelObjetivo: string;
  tipologia: string;
  ambito: string;
  dimension: string;
  agrupacion: string;
  familia: string;
  objetivo: string;
  unidad: string;
  desagregacion: string;
  frecuencia: string;
  fuente: string;
  sentido: string;
}

type Semaforo =
  | 'verde'
  | 'amarillo'
  | 'rojo'
  | 'gris';

type Seccion =
  | 'identificacion'
  | 'metodologia'
  | 'fuentes';

const props = defineProps<{
  indicador: Indicador;
  semaforo: Semaforo;
  periodoValidado?: string | null;
}>();

const emit = defineEmits<{
  (e: 'cerrar'): void;
}>();

const seccionActiva = ref<Seccion>('identificacion');

const secciones: {
  id: Seccion;
  numero: string;
  nombre: string;
}[] = [
  {
    id: 'identificacion',
    numero: '01',
    nombre: 'Identificación'
  },
  {
    id: 'metodologia',
    numero: '02',
    nombre: 'Metodología'
  },
  {
    id: 'fuentes',
    numero: '03',
    nombre: 'Fuentes y medición'
  }
];

const nombreSemaforo = computed(() => {
  const nombres: Record<Semaforo, string> = {
    verde: 'Verde',
    amarillo: 'Amarillo',
    rojo: 'Rojo',
    gris: 'Sin evaluar'
  };

  return nombres[props.semaforo];
});

const descripcionSemaforo = computed(() => {
  const descripciones: Record<Semaforo, string> = {
    verde:
      'El último resultado validado disponible se encuentra en un rango favorable.',
    amarillo:
      'El último resultado validado disponible requiere atención.',
    rojo:
      'El último resultado validado disponible requiere atención prioritaria.',
    gris:
      'No existe una evaluación publicada suficiente para asignar un color.'
  };

  return descripciones[props.semaforo];
});

function mostrar(valor?: string | null) {
  return valor?.trim() || 'No especificado en el catálogo';
}

function cerrar() {
  emit('cerrar');
}

function manejarTecla(evento: KeyboardEvent) {
  if (evento.key === 'Escape') {
    cerrar();
  }
}

watch(
  () => props.indicador.clave,
  () => {
    seccionActiva.value = 'identificacion';
  }
);

onMounted(() => {
  window.addEventListener('keydown', manejarTecla);
});

onUnmounted(() => {
  window.removeEventListener('keydown', manejarTecla);
});
</script>

<template>
  <Teleport to="body">
    <div
      class="ficha-overlay"
      @click.self="cerrar"
    >
      <section
        class="ficha-modal"
        role="dialog"
        aria-modal="true"
        :aria-label="
          `Ficha técnica: ${indicador.nombre}`
        "
      >

        <!-- ================================= -->
        <!-- ENCABEZADO INSTITUCIONAL -->
        <!-- ================================= -->

        <header class="ficha-header">
          <div class="ficha-header-info">
            <span class="institucional">
              SISTEMA INTEGRADO DE INDICADORES
              DE PLANEACIÓN
            </span>

            <span class="categoria">
              FICHA TÉCNICA DEL INDICADOR
            </span>

            <h2>{{ indicador.nombre }}</h2>

            <div class="ficha-identificadores">
              <span class="clave">
                {{ indicador.clave }}
              </span>

              <span
                class="semaforo"
                :class="semaforo"
              >
                <span class="semaforo-dot"></span>
                {{ nombreSemaforo }}
              </span>
            </div>
          </div>

          <button
            type="button"
            class="cerrar"
            aria-label="Cerrar ficha técnica"
            @click="cerrar"
          >
            ×
          </button>
        </header>

        <!-- ================================= -->
        <!-- NAVEGACIÓN: TRES APARTADOS -->
        <!-- ================================= -->

        <nav
          class="ficha-tabs"
          aria-label="Secciones de la ficha"
        >
          <button
            v-for="seccion in secciones"
            :key="seccion.id"
            type="button"
            class="ficha-tab"
            :class="{
              activo: seccionActiva === seccion.id
            }"
            :aria-current="
              seccionActiva === seccion.id
                ? 'true'
                : undefined
            "
            @click="seccionActiva = seccion.id"
          >
            <span class="tab-numero">
              {{ seccion.numero }}
            </span>

            <span>{{ seccion.nombre }}</span>
          </button>
        </nav>

        <!-- ================================= -->
        <!-- CONTENIDO -->
        <!-- ================================= -->

        <div class="ficha-body">

          <!-- ============================== -->
          <!-- 01. IDENTIFICACIÓN -->
          <!-- ============================== -->

          <section
            v-if="seccionActiva === 'identificacion'"
            class="contenido-seccion"
          >
            <div class="seccion-heading">
              <span class="seccion-numero">01</span>

              <div>
                <h3>Identificación del indicador</h3>

                <p>
                  Clasificación, definición y propósito
                  del indicador conforme al catálogo SIIP.
                </p>
              </div>
            </div>

            <div class="datos-grid">
              <div class="dato dato-ancho">
                <span class="dato-label">
                  AGRUPACIÓN TEMÁTICA
                </span>

                <strong>
                  {{ mostrar(indicador.agrupacion) }}
                </strong>
              </div>

              <div class="dato dato-ancho">
                <span class="dato-label">
                  FAMILIA
                </span>

                <strong>
                  {{ mostrar(indicador.familia) }}
                </strong>
              </div>

              <div class="dato">
                <span class="dato-label">
                  NIVEL DE OBJETIVO
                </span>

                <strong>
                  {{ mostrar(indicador.nivelObjetivo) }}
                </strong>
              </div>

              <div class="dato">
                <span class="dato-label">
                  TIPO DE INDICADOR
                </span>

                <strong>
                  {{ mostrar(indicador.tipologia) }}
                </strong>
              </div>

              <div class="dato">
                <span class="dato-label">
                  ÁMBITO DE DESEMPEÑO
                </span>

                <strong>
                  {{ mostrar(indicador.ambito) }}
                </strong>
              </div>

              <div class="dato">
                <span class="dato-label">
                  DIMENSIÓN DE DESEMPEÑO
                </span>

                <strong>
                  {{ mostrar(indicador.dimension) }}
                </strong>
              </div>
            </div>

            <div class="bloque-texto">
              <div class="bloque-titulo">
                <span class="marcador"></span>
                <h4>Definición del indicador</h4>
              </div>

              <p>
                {{ mostrar(indicador.definicion) }}
              </p>
            </div>

            <div class="bloque-texto">
              <div class="bloque-titulo">
                <span class="marcador"></span>
                <h4>Objetivo del indicador</h4>
              </div>

              <p>
                {{ mostrar(indicador.objetivo) }}
              </p>
            </div>
          </section>

          <!-- ============================== -->
          <!-- 02. METODOLOGÍA -->
          <!-- ============================== -->

          <section
            v-else-if="seccionActiva === 'metodologia'"
            class="contenido-seccion"
          >
            <div class="seccion-heading">
              <span class="seccion-numero">02</span>

              <div>
                <h3>Metodología del indicador</h3>

                <p>
                  Características de medición
                  establecidas en la ficha metodológica.
                </p>
              </div>
            </div>

            <div class="datos-grid">
              <div class="dato">
                <span class="dato-label">
                  UNIDAD DE MEDIDA
                </span>

                <strong>
                  {{ mostrar(indicador.unidad) }}
                </strong>
              </div>

              <div class="dato">
                <span class="dato-label">
                  SENTIDO DEL INDICADOR
                </span>

                <strong>
                  {{ mostrar(indicador.sentido) }}
                </strong>
              </div>

              <div class="dato">
                <span class="dato-label">
                  FRECUENCIA DE MEDICIÓN
                </span>

                <strong>
                  {{ mostrar(indicador.frecuencia) }}
                </strong>
              </div>

              <div class="dato">
                <span class="dato-label">
                  DESAGREGACIÓN TERRITORIAL
                </span>

                <strong>
                  {{
                    mostrar(indicador.desagregacion)
                  }}
                </strong>
              </div>
            </div>

            <div class="bloque-texto">
              <div class="bloque-titulo">
                <span class="marcador"></span>
                <h4>Propósito de la medición</h4>
              </div>

              <p>
                {{ mostrar(indicador.objetivo) }}
              </p>
            </div>

            <div class="aviso-metodologico">
              <div class="aviso-icono">i</div>

              <div>
                <strong>
                  Información de consulta
                </strong>

                <p>
                  Esta sección presenta las
                  características metodológicas
                  descriptivas del indicador.

                  El algoritmo matemático, las variables
                  capturadas y el cálculo preliminar
                  se consultan dentro del módulo de
                  Seguimiento, de acuerdo con los
                  permisos asignados.
                </p>
              </div>
            </div>
          </section>

          <!-- ============================== -->
          <!-- 03. FUENTES Y MEDICIÓN -->
          <!-- ============================== -->

          <section
            v-else
            class="contenido-seccion"
          >
            <div class="seccion-heading">
              <span class="seccion-numero">03</span>

              <div>
                <h3>Fuentes y medición</h3>

                <p>
                  Procedencia de los datos y
                  características del registro.
                </p>
              </div>
            </div>

            <div class="bloque-texto fuente">
              <div class="bloque-titulo">
                <span class="marcador"></span>

                <h4>
                  Medio de verificación
                </h4>
              </div>

              <p>
                {{ mostrar(indicador.fuente) }}
              </p>
            </div>

            <div class="datos-grid">
              <div class="dato">
                <span class="dato-label">
                  FRECUENCIA DE MEDICIÓN
                </span>

                <strong>
                  {{ mostrar(indicador.frecuencia) }}
                </strong>
              </div>

              <div class="dato">
                <span class="dato-label">
                  DESAGREGACIÓN TERRITORIAL
                </span>

                <strong>
                  {{
                    mostrar(indicador.desagregacion)
                  }}
                </strong>
              </div>
            </div>

            <div
              class="estado-publicacion"
              :class="semaforo"
            >
              <span class="estado-punto"></span>

              <div>
                <strong>
                  Estado publicado: {{ nombreSemaforo }}
                </strong>

                <p>
                  {{ descripcionSemaforo }}
                </p>

                <small>
                  {{
                    periodoValidado
                      ? `Periodo validado: ${periodoValidado}`
                      : 'Sin periodo validado disponible'
                  }}
                </small>
              </div>
            </div>

            <p class="aclaracion">
              El estado semafórico solo es aplicable
              a un resultado validado que cuente
              con una regla metodológica definida.
            </p>
          </section>
        </div>

        <!-- ================================= -->
        <!-- PIE -->
        <!-- ================================= -->

        <footer class="ficha-footer">
          <span>
            SIIP Salamanca · Ficha técnica
          </span>

          <div class="ficha-actions">
            <button
              type="button"
              class="btn-cerrar"
              @click="cerrar"
            >
              Cerrar
            </button>
          </div>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.ficha-overlay {
  --wine: #70273b;
  --deep: #431c2a;
  --gold: #c69a4b;
  --line: #e8e4dd;
  --muted: #777d85;

  position: fixed;
  inset: 0;
  z-index: 1200;

  display: flex;
  justify-content: center;
  align-items: center;

  padding: 20px;
  background: rgba(23, 17, 24, .72);
  backdrop-filter: blur(6px);
}

/* MODAL */

.ficha-modal {
  display: flex;
  flex-direction: column;

  width: min(960px, 100%);
  max-height: 94vh;

  background: white;
  border: 1px solid #e7dfe1;
  border-radius: 18px;
  overflow: hidden;

  box-shadow:
    0 30px 90px rgba(0, 0, 0, .25);
}

/* ENCABEZADO */

.ficha-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;

  padding: 26px 32px;

  background:
    linear-gradient(
      120deg,
      #fff 0%,
      #fcf4f6 100%
    );

  border-bottom: 1px solid var(--line);
}

.ficha-header-info {
  min-width: 0;
}

.institucional {
  display: block;
  color: #a17738;

  font-size: 10px;
  font-weight: 800;
  letter-spacing: .12em;
}

.categoria {
  display: block;
  margin-top: 14px;

  color: #8e6d78;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .08em;
}

.ficha-header h2 {
  margin: 9px 0 16px;
  color: var(--deep);

  font: 500 clamp(21px, 3vw, 29px) Georgia, serif;
  line-height: 1.3;
}

.ficha-identificadores {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.clave {
  padding: 8px 11px;

  background: var(--wine);
  color: white;
  border-radius: 7px;

  font-size: 11px;
  font-weight: 800;
  letter-spacing: .03em;
}

.cerrar {
  flex-shrink: 0;
  width: 37px;
  height: 37px;

  border: 0;
  border-radius: 9px;

  background: #f4eaed;
  color: var(--wine);

  font-size: 25px;
  cursor: pointer;
}

.cerrar:hover {
  background: #ead6de;
}

/* SEMÁFORO */

.semaforo {
  display: inline-flex;
  align-items: center;
  gap: 8px;

  padding: 8px 12px;
  border-radius: 30px;

  font-size: 11px;
  font-weight: 800;
}

.semaforo-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.semaforo.verde {
  background: #e7f5ec;
  color: #217447;
}

.semaforo.verde .semaforo-dot {
  background: #2ca25f;
}

.semaforo.amarillo {
  background: #fff4d5;
  color: #8b681a;
}

.semaforo.amarillo .semaforo-dot {
  background: #efb72e;
}

.semaforo.rojo {
  background: #fde6e6;
  color: #a62b2b;
}

.semaforo.rojo .semaforo-dot {
  background: #db4a4a;
}

.semaforo.gris {
  background: #edf0f3;
  color: #626e7a;
}

.semaforo.gris .semaforo-dot {
  background: #a5adb5;
}

/* TRES PESTAÑAS */

.ficha-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));

  gap: 0;
  padding: 0 25px;

  background: #faf8f6;
  border-bottom: 1px solid var(--line);
}

.ficha-tab {
  position: relative;

  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;

  min-width: 0;
  padding: 19px 10px;

  border: 0;
  background: transparent;

  color: #746c72;
  font-size: 12px;
  font-weight: 800;

  cursor: pointer;
  transition:
    color .2s,
    background .2s;
}

.ficha-tab:hover {
  background: #f6edef;
  color: var(--wine);
}

.ficha-tab.activo {
  color: var(--wine);
  background: #f9eff2;
}

.ficha-tab.activo::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 12px;
  right: 12px;
  height: 3px;

  border-radius: 3px 3px 0 0;
  background: var(--wine);

  box-shadow: 0 0 12px #70273b44;
}

.tab-numero {
  display: grid;
  place-items: center;

  width: 28px;
  height: 28px;

  border-radius: 8px;
  background: #f0e7e9;

  color: #946c78;
  font-size: 11px;
}

.ficha-tab.activo .tab-numero {
  background: var(--wine);
  color: white;
}

/* CUERPO */

.ficha-body {
  flex: 1;
  min-height: 0;
  padding: 26px 32px 30px;

  overflow-y: auto;
  overscroll-behavior: contain;
}

.contenido-seccion {
  animation: aparecer .22s ease;
}

@keyframes aparecer {
  from {
    opacity: 0;
    transform: translateY(5px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* TÍTULOS */

.seccion-heading {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 23px;
}

.seccion-numero {
  display: grid;
  place-items: center;

  width: 44px;
  height: 44px;
  flex-shrink: 0;

  border-radius: 12px;
  background: #f5eaee;

  color: var(--wine);
  font: 500 20px Georgia, serif;
}

.seccion-heading h3 {
  margin: 0 0 6px;

  color: var(--deep);
  font: 500 23px Georgia, serif;
}

.seccion-heading p {
  margin: 0;

  color: var(--muted);
  font-size: 12px;
  line-height: 1.6;
}

/* FICHA DE DATOS */

.datos-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));

  gap: 13px;
}

.dato {
  display: flex;
  flex-direction: column;
  gap: 9px;

  min-width: 0;
  padding: 16px;

  background: #faf9f7;
  border: 1px solid #ece8e2;
  border-radius: 10px;
}

.dato-ancho {
  grid-column: 1 / -1;
}

.dato-label {
  color: #8c737c;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .06em;
}

.dato strong {
  color: #30343c;
  font-size: 13px;
  font-weight: 750;
  line-height: 1.65;
  overflow-wrap: anywhere;
}

/* BLOQUES DESCRIPTIVOS */

.bloque-texto {
  margin-top: 20px;

  padding: 20px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 11px;
}

.bloque-titulo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.marcador {
  width: 4px;
  height: 19px;

  border-radius: 3px;
  background: var(--gold);
}

.bloque-titulo h4 {
  margin: 0;
  color: var(--deep);
  font-size: 13px;
  font-weight: 800;
}

.bloque-texto p {
  margin: 13px 0 0;

  color: #555b64;
  font-size: 12px;
  line-height: 1.85;
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.fuente {
  margin-top: 0;
}

/* AVISO METODOLÓGICO */

.aviso-metodologico {
  display: flex;
  gap: 13px;

  margin-top: 22px;
  padding: 17px;

  border-left: 3px solid var(--gold);
  border-radius: 0 10px 10px 0;

  background: #faf7f0;
}

.aviso-icono {
  display: grid;
  place-items: center;
  flex-shrink: 0;

  width: 25px;
  height: 25px;

  border: 1px solid var(--gold);
  border-radius: 50%;

  color: #9e7833;
  font-weight: 800;
  font-size: 12px;
}

.aviso-metodologico strong {
  color: var(--deep);
  font-size: 12px;
}

.aviso-metodologico p {
  margin: 7px 0 0;

  color: #6f6964;
  font-size: 11px;
  line-height: 1.8;
}

/* ESTADO VALIDADO */

.estado-publicacion {
  display: flex;
  gap: 13px;

  margin-top: 22px;
  padding: 18px;

  border-radius: 10px;
  background: #f2f3f5;
}

.estado-publicacion.verde {
  background: #e8f5ed;
}

.estado-publicacion.amarillo {
  background: #fff5d8;
}

.estado-publicacion.rojo {
  background: #fdeaea;
}

.estado-punto {
  width: 17px;
  height: 17px;
  flex-shrink: 0;

  margin-top: 2px;
  border-radius: 50%;
  background: #a5adb5;
}

.estado-publicacion.verde .estado-punto {
  background: #2ca25f;
}

.estado-publicacion.amarillo .estado-punto {
  background: #efb72e;
}

.estado-publicacion.rojo .estado-punto {
  background: #db4a4a;
}

.estado-publicacion strong {
  color: #30343c;
  font-size: 13px;
}

.estado-publicacion p {
  margin: 8px 0;

  color: #5d626a;
  font-size: 12px;
  line-height: 1.7;
}

.estado-publicacion small {
  color: #777d85;
  font-size: 11px;
}

.aclaracion {
  margin-top: 18px;
  color: #7b8087;
  font-size: 11px;
  line-height: 1.8;
}

/* PIE */

.ficha-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;

  padding: 16px 32px;

  border-top: 1px solid var(--line);
  background: #faf9f7;
}

.ficha-footer > span {
  color: var(--muted);
  font-size: 11px;
}

.btn-cerrar {
  padding: 11px 19px;
  border: 1px solid var(--wine);
  border-radius: 8px;

  background: var(--wine);
  color: white;

  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.btn-cerrar:hover {
  background: var(--deep);
}

/* RESPONSIVE */

@media (max-width: 680px) {
  .ficha-overlay {
    padding: 7px;
  }

  .ficha-modal {
    max-height: 97vh;
    border-radius: 12px;
  }

  .ficha-header {
    padding: 20px 16px;
  }

  .ficha-tabs {
    padding: 0 5px;
  }

  .ficha-tab {
    flex-direction: column;
    gap: 6px;

    padding: 12px 5px;
    font-size: 10px;
    text-align: center;
  }

  .ficha-body {
    padding: 20px 16px;
  }

  .seccion-heading h3 {
    font-size: 20px;
  }

  .datos-grid {
    grid-template-columns: 1fr;
  }

  .ficha-footer {
    padding: 14px 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .contenido-seccion {
    animation: none;
  }

  .ficha-tab {
    transition: none;
  }
}
</style>
