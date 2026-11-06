
<script setup lang="ts">
import { computed } from 'vue';
import VChart from 'vue-echarts';

import { use } from 'echarts/core';
import { BarChart, PieChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

import type { EChartsOption } from 'echarts';

import type {
  AgrupacionTematica
} from '../data/dashboard.data';

const props = defineProps<{
  agrupaciones: AgrupacionTematica[];
}>();

// Registrar únicamente las funciones necesarias.
use([
  BarChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  CanvasRenderer
]);

const colores = [
  '#70273b',
  '#c69a4b',
  '#356e58',
  '#a65a70',
  '#8d774d',
  '#517b86',
  '#995f45',
  '#756485'
];

const total = computed(() =>
  props.agrupaciones.reduce(
    (suma, item) => suma + item.indicadores,
    0
  )
);


// Ordenamos por cantidad para facilitar la comparación.
const datosOrdenados = computed(() =>
  [...props.agrupaciones].sort(
    (a, b) => b.indicadores - a.indicadores
  )
);

// GRÁFICA DE BARRAS
const opcionesBarras = computed<EChartsOption>(() => ({
  color: ['#70273b'],

  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    formatter: (params: any) => {
      const punto = params[0];
      const indicador = datosOrdenados.value[punto.dataIndex];

      return `
        <strong>${indicador.nombre}</strong>
        <div>${indicador.indicadores} indicadores</div>
      `;
    }
  },

  grid: {
    left: 12,
    right: 35,
    top: 12,
    bottom: 25,
    containLabel: true
  },

  xAxis: {
    type: 'value',
    min: 0,
    max: 18,
    interval: 3,
    splitLine: {
      lineStyle: { color: '#eeeae5' }
    },
    axisLabel: {
      color: '#777d85'
    }
  },

  yAxis: {
    type: 'category',
    inverse: true,
    data: datosOrdenados.value.map(
      item => `Agrupación ${String(item.id).padStart(2, '0')}`
    ),
    axisTick: { show: false },
    axisLine: { show: false },
    axisLabel: {
      color: '#54545b',
      fontSize: 11
    }
  },

  series: [{
    name: 'Indicadores',
    type: 'bar',
    data: datosOrdenados.value.map(
      item => item.indicadores
    ),
    barWidth: 17,
    itemStyle: {
      borderRadius: [0, 5, 5, 0]
    },
    label: {
      show: true,
      position: 'right',
      color: '#431c2a',
      fontWeight: 'bold'
    }
  }]
}));

// GRÁFICA DE DONA
const opcionesDona = computed<EChartsOption>(() => ({
  color: colores,

  tooltip: {
    trigger: 'item',
    formatter: '{b}: {c} indicadores ({d}%)'
  },

  series: [{
    name: 'Distribución temática',
    type: 'pie',
    radius: ['58%', '78%'],
    center: ['50%', '50%'],
    avoidLabelOverlap: true,

    label: {
      show: false
    },

    itemStyle: {
      borderColor: '#ffffff',
      borderWidth: 3,
      borderRadius: 5
    },

    emphasis: {
      scale: true,
      scaleSize: 7,
      label: {
        show: false
      }
    },

    data: props.agrupaciones.map(item => ({
      name: item.nombre,
      value: item.indicadores,
      itemStyle: {
        color: colores[item.id - 1]
      }
    }))
  }]
}));
</script>

<template>
  <section class="charts-section">

    <div class="charts-heading">
      <span class="charts-eyebrow">
        ANÁLISIS DEL CATÁLOGO
      </span>

      <h2>Distribución de los indicadores</h2>

      <p>
        Visualización de la composición de las ocho
        agrupaciones temáticas del SIIP Salamanca.
      </p>
    </div>

    <div class="charts-grid">

      <!-- Barras horizontales -->
      <article class="chart-panel chart-panel-wide">
        <div class="chart-header">
          <div>
            <h3>Indicadores por agrupación</h3>
            <p>Comparativo de cantidades registradas</p>
          </div>

          <span class="chart-tag">Cantidad</span>
        </div>

        <VChart
          :option="opcionesBarras"
          autoresize
          class="bar-chart"
        />
      </article>

      <!-- Dona -->
      <article class="chart-panel">
        <div class="chart-header">
          <div>
            <h3>Composición del catálogo</h3>
            <p>Participación por agrupación</p>
          </div>

          <span class="chart-tag">Porcentaje</span>
        </div>

        <div class="donut-container">
          <VChart
            :option="opcionesDona"
            autoresize
            class="donut-chart"
          />

          <div class="donut-center">
            <strong>{{ total }}</strong>
            <span>Indicadores</span>
          </div>
        </div>

        <div class="chart-legend">
          <div
            v-for="item in props.agrupaciones""
            :key="item.id"
            class="legend-item"
          >
            <span
              class="legend-dot"
              :style="{ background: colores[item.id - 1] }"
            ></span>

            <span class="legend-name">
              Agrupación {{ item.id }}
            </span>

            <strong>
              {{ 
                total > 0
                  ? ((item.indicadores / total) * 100).toFixed(1)
                  : '0.0'
              }}%

            </strong>
          </div>
        </div>
      </article>

    </div>
  </section>
</template>

<style scoped>
.charts-section {
  margin-top: 26px;
}

.charts-heading {
  margin-bottom: 22px;
}

.charts-eyebrow {
  font-size: 11px;
  font-weight: 800;
  color: #70273b;
  letter-spacing: 0.12em;
}

.charts-heading h2 {
  font-family: Georgia, serif;
  font-size: 27px;
  font-weight: 500;
  margin: 8px 0;
  color: #272b32;
}

.charts-heading p,
.chart-header p {
  color: #777d85;
  font-size: 13px;
  line-height: 1.6;
}

.charts-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
  gap: 18px;
}

.chart-panel {
  min-width: 0;
  padding: 24px;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid #e8e4dd;
  box-shadow: 0 12px 35px rgba(56, 44, 38, 0.04);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 12px;
}

.chart-header h3 {
  margin: 0;
  color: #272b32;
  font-size: 16px;
  font-weight: 750;
}

.chart-header p {
  margin: 6px 0 0;
}

.chart-tag {
  padding: 6px 10px;
  color: #70273b;
  background: #f5eee5;
  border-radius: 7px;
  font-size: 11px;
  font-weight: 700;
}

.bar-chart {
  height: 390px;
  width: 100%;
}

.donut-container {
  position: relative;
  height: 260px;
  margin-top: 12px;
}

.donut-chart {
  width: 100%;
  height: 100%;
}

.donut-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.donut-center strong {
  font-size: 36px;
  color: #431c2a;
  letter-spacing: -0.05em;
}

.donut-center span {
  font-size: 11px;
  color: #777d85;
}

.chart-legend {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 15px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  color: #777d85;
  min-width: 0;
}

.legend-dot {
  width: 9px;
  height: 9px;
  flex-shrink: 0;
  border-radius: 50%;
}

.legend-name {
  flex: 1;
}

.legend-item strong {
  color: #431c2a;
}

@media (max-width: 1050px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .chart-panel {
    padding: 16px;
  }

  .chart-legend {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .bar-chart {
    height: 350px;
  }
}
</style>
