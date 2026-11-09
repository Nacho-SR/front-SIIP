
<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import VChart from 'vue-echarts';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { BarChart, PieChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent
} from 'echarts/components';

import catalogo from '../consulta/data/indicadores-siip.json';

use([
  CanvasRenderer,
  BarChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent
]);

interface Indicador {
  clave: string;
  nombre: string;
  agrupacion: string;
  familia: string;
  ambito: string;
  tipologia: string;
  dimension: string;
  frecuencia: string;
  sentido: string;
  nivelObjetivo: string;
}

const router = useRouter();

const indicadores: Indicador[] = catalogo;

const COLOR_VINO = '#70273b';

const colores = [
  '#70273b',
  '#c69a4b',
  '#356e58',
  '#93667c',
  '#597c99',
  '#ad7650',
  '#83936a',
  '#796c9c'
];

const agrupacionSeleccionada = ref('');

const agrupaciones = computed(() =>
  [...new Set(indicadores.map(i => i.agrupacion))].sort()
);

const indicadoresFiltrados = computed(() =>
  agrupacionSeleccionada.value
    ? indicadores.filter(
        i => i.agrupacion === agrupacionSeleccionada.value
      )
    : indicadores
);

const nombreCorto = (nombre: string): string =>
  nombre.replace(/^\d+\.\s*/, '');

const contarPor = (
  campo: keyof Indicador,
  valores: Indicador[] = indicadoresFiltrados.value
) => {
  const conteos = new Map<string, number>();

  valores.forEach(indicador => {
    const valor = String(indicador[campo] || 'No especificado')
      .trim();

    const clave = valor.toLowerCase();

    // Unificar diferencias como "Trimestral" y "trimestral".
    const existente = [...conteos.keys()].find(
      item => item.toLowerCase() === clave
    );

    const etiqueta =
      existente ||
      valor.charAt(0).toUpperCase() + valor.slice(1);

    conteos.set(
      etiqueta,
      (conteos.get(etiqueta) || 0) + 1
    );
  });

  return [...conteos.entries()]
    .map(([nombre, total]) => ({ nombre, total }))
    .sort((a, b) => b.total - a.total);
};

// DATOS
const datosTematicos = computed(() =>
  contarPor('agrupacion').map(dato => ({
    ...dato,
    nombre: nombreCorto(dato.nombre)
  }))
);

const datosAmbito = computed(() => contarPor('ambito'));
const datosTipologia = computed(() => contarPor('tipologia'));
const datosDimension = computed(() => contarPor('dimension'));
const datosFrecuencia = computed(() => contarPor('frecuencia'));
const datosSentido = computed(() => contarPor('sentido'));

// RESUMEN
const totalIndicadores = computed(
  () => indicadoresFiltrados.value.length
);

const totalFamilias = computed(
  () => new Set(
    indicadoresFiltrados.value.map(i => i.familia)
  ).size
);

const totalAmbitos = computed(
  () => datosAmbito.value.length
);

const totalFrecuencias = computed(
  () => datosFrecuencia.value.length
);

// CONFIGURACIONES DE GRÁFICAS
const opcionBarras = (
  datos: { nombre: string; total: number }[],
  horizontal = false
) => {
  const categorias = datos.map(d => d.nombre);
  const valores = datos.map(d => d.total);

  const ejeCategorias = {
    type: 'category' as const,
    data: categorias,
    axisLabel: {
      color: '#686d77',
      fontSize: 11,
      width: horizontal ? 165 : 90,
      overflow: 'truncate' as const
    }
  };

  const ejeValores = {
    type: 'value' as const,
    minInterval: 1,
    axisLabel: { color: '#686d77' }
  };

  return {
    color: [COLOR_VINO],
    tooltip: {
      trigger: 'axis' as const,
      axisPointer: { type: 'shadow' as const }
    },
    grid: {
      top: 18,
      right: 30,
      bottom: horizontal ? 20 : 75,
      left: horizontal ? 190 : 45,
      containLabel: false
    },
    xAxis: horizontal ? ejeValores : ejeCategorias,
    yAxis: horizontal
      ? { ...ejeCategorias, inverse: true }
      : ejeValores,
    series: [
      {
        type: 'bar' as const,
        data: valores,
        barMaxWidth: 33,
        itemStyle: {
          borderRadius: horizontal
            ? [0, 5, 5, 0]
            : [5, 5, 0, 0]
        },
        label: {
          show: true,
          position: horizontal
            ? 'right' as const
            : 'top' as const,
          color: '#431c2a',
          fontWeight: 'bold' as const
        }
      }
    ]
  };
};

const opcionPastel = (
  datos: { nombre: string; total: number }[],
  dona = true
) => ({
  color: colores,
  tooltip: {
    trigger: 'item' as const,
    formatter: '{b}: {c} indicadores ({d}%)'
  },
  legend: {
    type: 'scroll' as const,
    bottom: 0,
    textStyle: {
      color: '#686d77',
      fontSize: 11
    }
  },
  series: [
    {
      type: 'pie' as const,
      radius: dona ? ['42%', '67%'] : ['0%', '65%'],
      center: ['50%', '42%'],
      avoidLabelOverlap: true,
      label: { show: false },
      emphasis: {
        label: {
          show: true,
          formatter: '{b}\n{c}',
          fontSize: 12,
          fontWeight: 'bold' as const
        }
      },
      data: datos.map(dato => ({
        name: dato.nombre,
        value: dato.total
      }))
    }
  ]
});

// OPCIONES REACTIVAS
const graficaAgrupaciones = computed(() =>
  opcionBarras(datosTematicos.value, true)
);

const graficaAmbitos = computed(() =>
  opcionBarras(datosAmbito.value)
);

const graficaTipologia = computed(() =>
  opcionPastel(datosTipologia.value)
);

const graficaDimensiones = computed(() =>
  opcionPastel(datosDimension.value)
);

const graficaFrecuencias = computed(() =>
  opcionBarras(datosFrecuencia.value)
);

const graficaSentido = computed(() =>
  opcionPastel(datosSentido.value)
);

// FAMILIAS DEL FILTRO SELECCIONADO
const familiasDetalle = computed(() =>
  contarPor('familia')
);

// REGRESAR
const regresar = () => {
  router.push({ name: 'Estadisticas' });
};
</script>

<template>
  <div class="analisis">

    <header class="page-header">
      <div>
        <button
          type="button"
          class="volver"
          @click="regresar"
        >
          ← Volver a Estadísticas
        </button>

        <span class="eyebrow">ANÁLISIS ESTADÍSTICO</span>

        <h1>Tablero de análisis completo</h1>

        <p>
          Exploración de los 63 indicadores del SIIP Salamanca,
          organizada por características metodológicas
          y agrupaciones temáticas.
        </p>
      </div>

      <span class="etiqueta">Datos del catálogo</span>
    </header>

    <!-- FILTRO GENERAL -->
    <section class="panel filtro-panel">
      <div class="filtro-contenido">
        <div>
          <h2>Explorar indicadores</h2>
          <p>
            Selecciona una agrupación para actualizar
            las gráficas y sus estadísticas.
          </p>
        </div>

        <div class="filtro-controles">
          <select v-model="agrupacionSeleccionada" aria-label="Agrupación temática del análisis">
            <option value="">Todas las agrupaciones</option>

            <option
              v-for="agrupacion in agrupaciones"
              :key="agrupacion"
              :value="agrupacion"
            >
              {{ agrupacion }}
            </option>
          </select>

          <button
            type="button"
            @click="agrupacionSeleccionada = ''"
          >
            Limpiar
          </button>
        </div>
      </div>
    </section>

    <!-- TARJETAS -->
    <div class="estadisticas-grid">
      <article class="stat-card">
        <span>Indicadores</span>
        <strong>{{ totalIndicadores }}</strong>
        <small>Dentro del filtro seleccionado</small>
      </article>

      <article class="stat-card">
        <span>Familias</span>
        <strong>{{ totalFamilias }}</strong>
        <small>Familias de indicadores</small>
      </article>

      <article class="stat-card">
        <span>Ámbitos</span>
        <strong>{{ totalAmbitos }}</strong>
        <small>Clasificaciones presentes</small>
      </article>

      <article class="stat-card">
        <span>Frecuencias</span>
        <strong>{{ totalFrecuencias }}</strong>
        <small>Periodicidades presentes</small>
      </article>
    </div>

    <!-- FILA 1 -->
    <div class="graficas-grid">
      <section class="panel grafica-panel">
        <div class="panel-heading">
          <span class="eyebrow">01 / DISTRIBUCIÓN</span>
          <h2>Indicadores por agrupación temática</h2>
          <p>
            Total de indicadores asignados a cada temática.
          </p>
        </div>

        <VChart
          :option="graficaAgrupaciones"
          autoresize
          class="grafica"
        />
      </section>

      <section class="panel grafica-panel">
        <div class="panel-heading">
          <span class="eyebrow">02 / DESEMPEÑO</span>
          <h2>Ámbito de desempeño</h2>
          <p>
            Distribución metodológica en la cadena
            de resultados.
          </p>
        </div>

        <VChart
          :option="graficaAmbitos"
          autoresize
          class="grafica"
        />
      </section>
    </div>

    <!-- FILA 2 -->
    <div class="graficas-grid">
      <section class="panel grafica-panel">
        <div class="panel-heading">
          <span class="eyebrow">03 / CLASIFICACIÓN</span>
          <h2>Tipología de indicadores</h2>
          <p>
            Participación de los indicadores estratégicos
            y de gestión.
          </p>
        </div>

        <VChart
          :option="graficaTipologia"
          autoresize
          class="grafica"
        />
      </section>

      <section class="panel grafica-panel">
        <div class="panel-heading">
          <span class="eyebrow">04 / EVALUACIÓN</span>
          <h2>Dimensión de medición</h2>
          <p>
            Indicadores según su dimensión metodológica.
          </p>
        </div>

        <VChart
          :option="graficaDimensiones"
          autoresize
          class="grafica"
        />
      </section>
    </div>

    <!-- FILA 3 -->
    <div class="graficas-grid">
      <section class="panel grafica-panel">
        <div class="panel-heading">
          <span class="eyebrow">05 / MEDICIÓN</span>
          <h2>Frecuencia de actualización</h2>
          <p>
            Cantidad de indicadores mensuales,
            trimestrales, semestrales y anuales.
          </p>
        </div>

        <VChart
          :option="graficaFrecuencias"
          autoresize
          class="grafica"
        />
      </section>

      <section class="panel grafica-panel">
        <div class="panel-heading">
          <span class="eyebrow">06 / INTERPRETACIÓN</span>
          <h2>Sentido del indicador</h2>
          <p>
            Distribución de los sentidos de medición
            registrados en el catálogo.
          </p>
        </div>

        <VChart
          :option="graficaSentido"
          autoresize
          class="grafica"
        />
      </section>
    </div>

    <!-- DETALLE DE FAMILIAS -->
    <section class="panel detalle-panel">
      <div class="panel-heading">
        <span class="eyebrow">DESGLOSE METODOLÓGICO</span>
        <h2>Indicadores por familia</h2>
        <p>
          Familias incluidas en la selección actual.
        </p>
      </div>

      <div class="familias-lista">
        <div
          v-for="familia in familiasDetalle"
          :key="familia.nombre"
          class="familia-item"
        >
          <span>{{ familia.nombre }}</span>
          <strong>{{ familia.total }}</strong>
        </div>
      </div>
    </section>

    <p class="nota-fuente">
      Fuente: Anexo 3_4 SIIP Sist, hoja IPSM.
      Estas gráficas representan la estructura del catálogo,
      no resultados de desempeño ni semáforos municipales.
    </p>

  </div>
</template>

<style scoped>
.analisis {
  --wine: #70273b;
  --deep: #431c2a;
  --gold: #c69a4b;
  --muted: #777d85;
  --line: #e8e4dd;

  max-width: 1560px;
  margin: 0 auto;
  color: #272b32;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: end;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 25px;
}

.volver {
  display: block;
  margin-bottom: 22px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--wine);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.volver:hover {
  text-decoration: underline;
}

.eyebrow {
  color: #a17738;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .13em;
}

.page-header h1 {
  margin: 9px 0;
  color: var(--deep);
  font-family: Georgia, serif;
  font-size: clamp(30px, 3.5vw, 42px);
  font-weight: 500;
}

.page-header p,
.panel-heading p,
.filtro-contenido p {
  max-width: 680px;
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.75;
}

.etiqueta {
  padding: 9px 13px;
  border-radius: 9px;
  background: #f4eee5;
  color: var(--wine);
  font-size: 11px;
  font-weight: 750;
}

.panel,
.stat-card {
  min-width: 0;
  background: white;
  border: 1px solid var(--line);
  border-radius: 15px;
  box-shadow: 0 12px 35px #382c260a;
}

.panel {
  padding: 23px;
}

.filtro-panel {
  margin-bottom: 19px;
}

.filtro-contenido {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.filtro-contenido h2 {
  margin: 0 0 7px;
  color: var(--deep);
  font-size: 17px;
}

.filtro-controles {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.filtro-controles select {
  width: min(350px, 100%);
  min-width: 180px;
  padding: 12px;
  border: 1px solid #dddcd7;
  border-radius: 9px;
  outline: none;
  background: white;
  color: #272b32;
  font-size: 12px;
}

.filtro-controles select:focus-visible {
  outline: 3px solid var(--gold);
  outline-offset: 2px;
}

.filtro-controles button {
  border: 0;
  border-radius: 9px;
  padding: 11px 15px;
  background: #f3eee6;
  color: var(--wine);
  font-size: 12px;
  font-weight: 750;
  cursor: pointer;
}

.estadisticas-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 19px;
}

.stat-card {
  position: relative;
  overflow: hidden;
  padding: 22px;
}

.stat-card::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  background: var(--gold);
}

.stat-card span,
.stat-card small {
  display: block;
  color: var(--muted);
  font-size: 12px;
}

.stat-card strong {
  display: block;
  margin: 10px 0 4px;
  color: var(--deep);
  font-size: 35px;
  line-height: 1.2;
}

.graficas-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 19px;
  margin-bottom: 19px;
}

.panel-heading {
  margin-bottom: 15px;
}

.panel-heading h2 {
  margin: 8px 0;
  color: var(--deep);
  font-family: Georgia, serif;
  font-size: 23px;
  font-weight: 500;
}

.grafica {
  width: 100%;
  height: 370px;
}

.detalle-panel {
  margin-top: 6px;
}

.familias-lista {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 11px;
  max-height: 450px;
  overflow-y: auto;
}

.familia-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fdfbf8;
}

.familia-item span {
  min-width: 0;
  color: #45484d;
  font-size: 12px;
  line-height: 1.6;
}

.familia-item strong {
  color: var(--wine);
  font-size: 15px;
}

.nota-fuente {
  margin: 20px 0;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.7;
}

@media (max-width: 1100px) {
  .graficas-grid {
    grid-template-columns: 1fr;
  }

  .estadisticas-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 650px) {
  .estadisticas-grid,
  .familias-lista {
    grid-template-columns: 1fr;
  }

  .panel {
    padding: 17px;
  }

  .grafica {
    height: 340px;
  }

  .filtro-controles,
  .filtro-controles select {
    width: 100%;
  }
}
</style>
