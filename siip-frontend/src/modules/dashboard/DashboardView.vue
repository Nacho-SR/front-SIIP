
<script setup lang="ts">
import { computed } from 'vue';
import {
  agrupacionesTematicas,
  resumenCatalogo
} from './data/dashboard.data.ts';

import AgrupacionesChart from '../dashboard/components/AgrupacionesChart.vue';
import { ref } from 'vue';
import { useRouter } from 'vue-router';


const router = useRouter();

const abrirAnalisis = () => {
  router.push({ name: 'AnalisisIndicadores' });
};

// null significa que se muestran todas las agrupaciones.
const agrupacionSeleccionada = ref<number | null>(null);

// Catálogo filtrado.
const agrupacionesFiltradas = computed(() => {
  if (agrupacionSeleccionada.value === null) {
    return agrupacionesTematicas;
  }

  return agrupacionesTematicas.filter(
    agrupacion =>
      agrupacion.id === agrupacionSeleccionada.value
  );
});

// Total de indicadores de la selección.
const totalFiltrado = computed(() =>
  agrupacionesFiltradas.value.reduce(
    (total, agrupacion) => total + agrupacion.indicadores,
    0
  )
);

// Limpiar filtros.
const limpiarFiltros = () => {
  agrupacionSeleccionada.value = null;
};

// Abrir el módulo de consulta existente.
const irAConsulta = () => {
  router.push({ name: 'Consulta' });
};


// Tarjetas de resumen del catálogo
const tarjetas = [
  {
    titulo: 'Indicadores registrados',
    valor: resumenCatalogo.indicadores,
    descripcion: 'Catálogo de la fase actual',
    unidad: 'indicadores'
  },
  {
    titulo: 'Agrupaciones temáticas',
    valor: resumenCatalogo.agrupaciones,
    descripcion: 'Áreas estratégicas de análisis',
    unidad: 'agrupaciones'
  },
  {
    titulo: 'Familias de indicadores',
    valor: resumenCatalogo.familias,
    descripcion: 'Clasificación del catálogo',
    unidad: 'familias'
  },
  {
    titulo: 'Ámbito de captura',
    valor: resumenCatalogo.ambitoCaptura,
    descripcion: 'Alcance operativo de esta fase',
    unidad: ''
  }
];

// Total calculado a partir de las agrupaciones
const totalIndicadores = computed(() =>
  agrupacionesTematicas.reduce(
    (total, agrupacion) => total + agrupacion.indicadores,
    0
  )
);

// Proporción de cada agrupación dentro del catálogo
const porcentajeAgrupacion = (cantidad: number): number => {
  if (totalIndicadores.value === 0) return 0;
  return (cantidad / totalIndicadores.value) * 100;
};
</script>

<template>
  <div class="dashboard">

    <!-- Encabezado de la pantalla -->
    <section class="dashboard-header">
      <div>
        <span class="dashboard-eyebrow">
          SISTEMA INTEGRADO DE INDICADORES DE PLANEACIÓN
        </span>

        <h1>Panorama general</h1>

        <p>
          Información institucional y distribución de los
          indicadores estratégicos del municipio de Salamanca.
        </p>
      </div>

      <div class="dashboard-period">
        <span class="period-dot"></span>
        Catálogo institucional
      </div>
    </section>

    
<!-- Filtros del catálogo -->
<section class="dashboard-filters">
  <div class="filters-heading">
    <div>
      <span class="section-eyebrow">
        EXPLORACIÓN INTERACTIVA
      </span>

      <h2>Filtros de información</h2>

      <p>
        Selecciona una agrupación para explorar su
        participación dentro del catálogo.
      </p>
    </div>
  </div>

  <div class="filters-controls">
    <div class="filter-field">
      <label for="filtro-agrupacion">
        Agrupación temática
      </label>

      <select
        id="filtro-agrupacion"
        v-model="agrupacionSeleccionada"
      >
        <option :value="null">
          Todas las agrupaciones
        </option>

        <option
          v-for="agrupacion in agrupacionesTematicas"
          :key="agrupacion.id"
          :value="agrupacion.id"
        >
          {{ String(agrupacion.id).padStart(2, '0') }}
          · {{ agrupacion.nombre }}
        </option>
      </select>
    </div>

    <div class="filter-actions">
      <button
        type="button"
        class="filter-reset"
        :disabled="agrupacionSeleccionada === null"
        @click="limpiarFiltros"
      >
        Limpiar filtros
      </button>

      <button
        type="button"
        class="filter-consulta"
        @click="irAConsulta"
      >
        Ir a Consulta →
      </button>
    </div>
  </div>

  <div class="filters-summary">
    <strong>{{ totalFiltrado }}</strong>
    indicadores en
    <strong>{{ agrupacionesFiltradas.length }}</strong>
    agrupación(es) seleccionada(s).
  </div>
</section>


    <!-- Tarjetas estadísticas -->
    <section class="stats-grid">
      <article
        v-for="(tarjeta, index) in tarjetas"
        :key="tarjeta.titulo"
        class="stat-card"
      >
        <div class="stat-card-top">
          <span class="stat-label">
            {{ tarjeta.titulo }}
          </span>

          <span class="stat-number">
            {{ String(index + 1).padStart(2, '0') }}
          </span>
        </div>

        <div class="stat-value">
          {{ tarjeta.valor }}
        </div>

        <div v-if="tarjeta.unidad" class="stat-unit">
          {{ tarjeta.unidad }}
        </div>

        <p class="stat-description">
          {{ tarjeta.descripcion }}
        </p>
      </article>
    </section>

    <!-- Distribución temática -->
    <section class="dashboard-panel">
      <div class="panel-header">
        <div>
          <span class="section-eyebrow">ESTRUCTURA DEL CATÁLOGO</span>

          <h2>Indicadores por agrupación temática</h2>

          <p>
            Distribución de los {{ totalFiltrado }} indicadores de la selección, según las ocho
            indicadores incluidos en el anexo.
          </p>
        </div>

        <span class="panel-counter">
          8 agrupaciones
        </span>
      </div>

      <div class="themes-grid">
        <article
          v-for="agrupacion in agrupacionesTematicas"
          :key="agrupacion.id"
          class="theme-card"
        >
          <div class="theme-heading">
            <span class="theme-code">
              {{ String(agrupacion.id).padStart(2, '0') }}
            </span>

            <span class="theme-count">
              {{ agrupacion.indicadores }}
            </span>
          </div>

          <h3>{{ agrupacion.nombre }}</h3>

          <div class="theme-progress">
            <div
              class="theme-progress-fill"
              :style="{
                width: porcentajeAgrupacion(
                  agrupacion.indicadores
                ) + '%'
              }"
            ></div>
          </div>

          <span class="theme-caption">
            {{ agrupacion.indicadores }}
            indicadores del catálogo
          </span>
        </article>
      </div>
    </section>

    <!-- Gráficos de barras y dona -->
    
<section class="seccion-graficas">
  <div class="graficas-encabezado">
    <div>
      <span class="graficas-etiqueta">
        ANÁLISIS DEL CATÁLOGO
      </span>

      <h2>Distribución de indicadores</h2>

      <p>
        Visualización de los indicadores por
        agrupación temática.
      </p>
    </div>

    <button
      type="button"
      class="btn-analisis"
      @click="abrirAnalisis"
    >
      Ver análisis completo
      <span aria-hidden="true">→</span>
    </button>
  </div>

  <AgrupacionesChart
    :agrupaciones="agrupacionesFiltradas"
  />
</section>

    <p class="dashboard-note">
      Fuente: Anexo 3_4 SIIP Sist, hoja IPSM.
      Esta vista presenta cantidades del catálogo,
      no resultados de desempeño municipal.
    </p>

  </div>
</template>

<style scoped>
.dashboard {
  --wine: #70273b;
  --deep: #431c2a;
  --gold: #c69a4b;
  --green: #356e58;
  --ink: #272b32;
  --muted: #777d85;
  --line: #e8e4dd;

  width: 100%;
  max-width: 1540px;
  margin: 0 auto;
  color: var(--ink);
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 30px;
}

.dashboard-eyebrow,
.section-eyebrow {
  color: var(--wine);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.dashboard-header h1 {
  font-family: Georgia, serif;
  font-size: clamp(30px, 3.5vw, 44px);
  font-weight: 500;
  margin: 9px 0;
  letter-spacing: -0.035em;
}

.dashboard-header p,
.panel-header p {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.65;
}

.dashboard-period {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 15px;
  border: 1px solid var(--line);
  background: white;
  border-radius: 9px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
}

.period-dot {
  width: 8px;
  height: 8px;
  background: var(--green);
  border-radius: 50%;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
  margin-bottom: 26px;
}

.stat-card,
.dashboard-panel {
  background: white;
  border: 1px solid var(--line);
  border-radius: 16px;
  box-shadow: 0 12px 35px rgba(56, 44, 38, 0.04);
}

.stat-card {
  padding: 24px;
  position: relative;
  overflow: hidden;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: var(--gold);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 38px rgba(56, 44, 38, 0.09);
}

.stat-card-top,
.theme-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.stat-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
}

.stat-number {
  color: var(--gold);
  font-size: 13px;
  font-weight: 800;
}

.stat-value {
  margin-top: 18px;
  font-size: clamp(26px, 3vw, 38px);
  font-weight: 800;
  color: var(--deep);
  letter-spacing: -0.05em;
}

.stat-unit {
  color: var(--wine);
  font-weight: 700;
  font-size: 12px;
}

.stat-description {
  margin-top: 15px;
  font-size: 12px;
  color: var(--muted);
}

.dashboard-panel {
  padding: 26px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 25px;
}

.panel-header h2 {
  font-family: Georgia, serif;
  font-size: 25px;
  font-weight: 500;
  margin: 8px 0;
}

.panel-counter {
  background: #f5eee5;
  color: var(--wine);
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 750;
}

.themes-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.theme-card {
  border: 1px solid var(--line);
  border-radius: 13px;
  padding: 20px;
  background: #fdfcfb;
  transition: border-color 0.2s, background 0.2s;
}

.theme-card:hover {
  border-color: var(--gold);
  background: #fffcf6;
}

.theme-code {
  color: var(--gold);
  font-size: 12px;
  font-weight: 800;
}

.theme-count {
  font-size: 25px;
  font-weight: 800;
  color: var(--wine);
}

.theme-card h3 {
  min-height: 65px;
  margin: 17px 0;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.5;
}

.theme-progress {
  width: 100%;
  height: 6px;
  overflow: hidden;
  border-radius: 10px;
  background: #eee9e4;
}

.theme-progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--wine), var(--gold));
}

.theme-caption {
  display: block;
  margin-top: 11px;
  font-size: 11px;
  color: var(--muted);
}

.dashboard-note {
  margin-top: 18px;
  font-size: 12px;
  color: var(--muted);
}

@media (max-width: 1100px) {
  .stats-grid,
  .themes-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .stats-grid,
  .themes-grid {
    grid-template-columns: 1fr;
  }

  .dashboard-panel {
    padding: 18px;
  }

  .theme-card h3 {
    min-height: auto;
  }
}


/* Filtros interactivos */

.dashboard-filters {
  padding: 24px;
  margin-bottom: 26px;
  background: #ffffff;
  border: 1px solid #e8e4dd;
  border-radius: 16px;
  box-shadow: 0 12px 35px rgba(56, 44, 38, 0.04);
}

.filters-heading h2 {
  margin: 8px 0;
  font-family: Georgia, serif;
  font-size: 24px;
  font-weight: 500;
  color: #272b32;
}

.filters-heading p {
  color: #777d85;
  font-size: 13px;
  line-height: 1.6;
}

.filters-controls {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 22px;
}

.filter-field {
  flex: 1;
  min-width: 240px;
}

.filter-field label {
  display: block;
  margin-bottom: 8px;
  color: #54545b;
  font-size: 12px;
  font-weight: 700;
}

.filter-field select {
  display: block;
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #dddcd7;
  border-radius: 10px;
  background: #ffffff;
  color: #272b32;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.filter-field select:focus {
  border-color: #c69a4b;
  box-shadow: 0 0 0 3px rgba(198, 154, 75, 0.15);
}

.filter-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.filter-reset,
.filter-consulta {
  padding: 12px 16px;
  border: none;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 750;
  cursor: pointer;
  transition: transform 0.2s, background 0.2s;
}

.filter-reset {
  background: #f3eee6;
  color: #70273b;
}

.filter-reset:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.filter-consulta {
  background: #70273b;
  color: #ffffff;
}

.filter-consulta:hover {
  background: #431c2a;
  transform: translateY(-2px);
}

.filters-summary {
  margin-top: 18px;
  padding-top: 15px;
  border-top: 1px solid #e8e4dd;
  font-size: 12px;
  color: #777d85;
}

.filters-summary strong {
  color: #70273b;
  font-weight: 800;
}

@media (max-width: 640px) {
  .dashboard-filters {
    padding: 18px;
  }

  .filter-field {
    min-width: 100%;
  }

  .filter-actions {
    width: 100%;
  }

  .filter-actions button {
    flex: 1;
  }
}


/* Acceso al tablero de análisis completo */

.seccion-graficas {
  margin-top: 24px;
}

.graficas-encabezado {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 20px;
}

.graficas-etiqueta {
  color: #a17738;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .13em;
}

.graficas-encabezado h2 {
  margin: 8px 0;
  color: #431c2a;
  font-family: Georgia, serif;
  font-size: 26px;
  font-weight: 500;
}

.graficas-encabezado p {
  margin: 0;
  color: #777d85;
  font-size: 13px;
  line-height: 1.7;
}

.btn-analisis {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 13px;
  padding: 13px 19px;
  border: 1px solid #70273b;
  border-radius: 10px;
  background: #70273b;
  color: white;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition: background .2s, transform .2s;
}

.btn-analisis:hover {
  background: #431c2a;
  transform: translateY(-2px);
}

@media (max-width: 650px) {
  .graficas-encabezado {
    align-items: stretch;
  }

  .btn-analisis {
    width: 100%;
  }
}

</style>
