
<script setup lang="ts">
import { computed, onActivated, onMounted, onUnmounted, ref } from 'vue';
import catalogo from './data/indicadores-siip.json';
import FichaTecnicaModal from './components/FichaTecnicaModal.vue';
import { obtenerResultadosConsulta } from '../review/data/seguimiento.store';
import {
  mensajesEstado, periodoEsperado, resultadoDelCorte, resumenTematico, ultimoCorteCerrado,
  type ColorSemaforo, type ResultadoConsulta,
} from './data/consulta';

interface Indicador {
  clave: string;
  nombre: string;
  agrupacion: string;
  familia: string;
  tipologia: string;
  ambito: string;
  desagregacion: string;
  frecuencia: string;
  unidad: string;
  sentido: string;

  // Propiedades de las fichas metodológicas
  definicion: string;
  objetivo: string;
  nivelObjetivo: string;
  dimension: string;
  fuente: string;
  algoritmo: string;
}

interface IndicadorConsulta extends Indicador {
  semaforo: ColorSemaforo | null;
  valorValidado: number | null;
  periodoValidado: string | null;
  periodoEsperado: string | null;
  mensaje: string;
  versionPublicacion: string | null;
  versionRegla: string | null;
}

const indicadoresCatalogo = catalogo as Indicador[];
const filtros = ref({
  busqueda: '', tipologia: 'Todas', ambito: 'Todos', desagregacion: 'Todas', semaforo: 'Todos',
});
const corteMaximo = ref(ultimoCorteCerrado());
const periodoElegido = ref(corteMaximo.value);
const periodoActivo = computed(() => periodoEsperado('mensual', periodoElegido.value)
  && periodoElegido.value <= corteMaximo.value ? periodoElegido.value : '');
const resultados = ref<ResultadoConsulta[]>([]);
const gruposAbiertos = ref<string[]>([]);
const claveFichaSeleccionada = ref<string | null>(null);
const fichaSeleccionada = computed(() => indicadores.value.find(indicador =>
  indicador.clave === claveFichaSeleccionada.value) ?? null);

function abrirFicha(indicador: IndicadorConsulta) {
  claveFichaSeleccionada.value = indicador.clave;
}
function cerrarFicha() {
  claveFichaSeleccionada.value = null;
}

function cargarResultados() {
  corteMaximo.value = ultimoCorteCerrado();
  resultados.value = obtenerResultadosConsulta();
}
function actualizarAlVolver() {
  if (document.visibilityState === 'visible') cargarResultados();
}
onMounted(() => {
  cargarResultados();
  window.addEventListener('focus', cargarResultados);
  document.addEventListener('visibilitychange', actualizarAlVolver);
});
onActivated(cargarResultados);
onUnmounted(() => {
  window.removeEventListener('focus', cargarResultados);
  document.removeEventListener('visibilitychange', actualizarAlVolver);
});

const indicadores = computed<IndicadorConsulta[]>(() => indicadoresCatalogo.map(indicador => {
  const esperado = periodoEsperado(indicador.frecuencia, periodoActivo.value);
  const resultado = resultadoDelCorte(resultados.value, indicador.clave, indicador.frecuencia, periodoActivo.value);
  return {
    ...indicador,
    periodoEsperado: esperado,
    valorValidado: resultado?.valor ?? null,
    periodoValidado: resultado?.estado === 'publicado' || resultado?.estado === 'validacion_local' ? resultado.periodo : null,
    semaforo: resultado?.semaforo ?? null,
    mensaje: esperado ? mensajesEstado[resultado?.estado ?? 'sin_publicacion'] : 'Sin periodo: verifica el corte y la frecuencia.',
    versionPublicacion: resultado?.versionPublicacion ?? null,
    versionRegla: resultado?.versionRegla ?? null,
  };
}));

function opciones(campo: 'tipologia' | 'ambito' | 'desagregacion'): string[] {
  return [...new Set(indicadoresCatalogo.map(indicador => indicador[campo]?.trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'es'));
}
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}
const indicadoresFiltrados = computed(() => indicadores.value.filter(indicador => {
  const texto = normalizar([indicador.clave, indicador.nombre, indicador.agrupacion, indicador.familia].join(' '));
  return texto.includes(normalizar(filtros.value.busqueda))
    && (filtros.value.tipologia === 'Todas' || indicador.tipologia === filtros.value.tipologia)
    && (filtros.value.ambito === 'Todos' || indicador.ambito === filtros.value.ambito)
    && (filtros.value.desagregacion === 'Todas' || indicador.desagregacion === filtros.value.desagregacion)
    && (filtros.value.semaforo === 'Todos' || (indicador.semaforo ?? 'sin_color') === filtros.value.semaforo);
}));
function limpiarFiltros() {
  filtros.value = { busqueda: '', tipologia: 'Todas', ambito: 'Todos', desagregacion: 'Todas', semaforo: 'Todos' };
}
function estaAbierto(nombre: string): boolean {
  return gruposAbiertos.value.includes(nombre);
}
function toggleAgrupacion(nombre: string) {
  gruposAbiertos.value = estaAbierto(nombre)
    ? gruposAbiertos.value.filter(item => item !== nombre) : [...gruposAbiertos.value, nombre];
}

const agrupaciones = computed(() => {
  const nombres = [...new Set(indicadores.value.map(indicador => indicador.agrupacion))]
    .sort((a, b) => a.localeCompare(b, 'es'));
  return nombres.map(nombreOriginal => {
    const todos = indicadores.value.filter(indicador => indicador.agrupacion === nombreOriginal);
    const visibles = indicadoresFiltrados.value.filter(indicador => indicador.agrupacion === nombreOriginal);
    return {
      clave: nombreOriginal.match(/^(\d+)[.\s-]*/)?.[1] ?? '',
      nombre: nombreOriginal.replace(/^\d+[.\s-]*/, '').trim(),
      nombreOriginal, indicadores: visibles, total: todos.length,
      ...resumenTematico(todos.map(indicador => indicador.semaforo)),
      expandido: estaAbierto(nombreOriginal),
    };
  }).filter(grupo => grupo.indicadores.length > 0);
});
type GrupoConsulta = (typeof agrupaciones.value)[number];

function mensajeGrupo(grupo: GrupoConsulta): string {
  const indice = grupo.indice === null ? 'sin índice' : `índice informativo ${grupo.indice.toFixed(2)} (${etiquetaSemaforo(grupo.colorReferencia)})`;
  return `${indice}; ${grupo.evaluables}/${grupo.total} indicadores del catálogo evaluables. Color temático oficial pendiente de política de cobertura.`;
}
const totalIndicadores = computed(() => indicadores.value.length);
const totalVisibles = computed(() => indicadoresFiltrados.value.length);
const alertasGenerales = computed(() => resumenTematico(indicadores.value.map(indicador => indicador.semaforo)).conteo);

function etiquetaSemaforo(color: ColorSemaforo | null): string {
  return color === null ? 'Sin color publicado'
    : { verde: 'Verde', amarillo: 'Amarillo', rojo: 'Rojo', gris: 'Gris · incumplimiento' }[color];
}
</script>

<template>
  <div class="consulta">

    <!-- ======================================== -->
    <!-- ENCABEZADO -->
    <!-- ======================================== -->

    <header class="page-header">
      <div>
        <span class="eyebrow">
          CONSULTA INSTITUCIONAL
        </span>

        <h1>
          Consulta por agrupaciones temáticas e indicadores
        </h1>

        <p>
          Catálogo de indicadores del SIIP Salamanca,
          fichas técnicas y evaluación semafórica
          de resultados validados.
        </p>
      </div>

      <div class="total-general">
        <strong>{{ totalIndicadores }}</strong>
        <span>Indicadores del SIIP</span>
      </div>
    </header>

    <!-- ======================================== -->
    <!-- RESUMEN DE SEMÁFOROS -->
    <!-- ======================================== -->

    <section class="resumen-general">

      <div class="resumen-item verde">
        <span class="dot"></span>
        <strong>{{ alertasGenerales.verde }}</strong>
        <span>Favorables</span>
      </div>

      <div class="resumen-item amarillo">
        <span class="dot"></span>
        <strong>{{ alertasGenerales.amarillo }}</strong>
        <span>Requieren atención</span>
      </div>

      <div class="resumen-item rojo">
        <span class="dot"></span>
        <strong>{{ alertasGenerales.rojo }}</strong>
        <span>Atención prioritaria</span>
      </div>

      <div class="resumen-item gris">
        <span class="dot"></span>
        <strong>{{ alertasGenerales.gris }}</strong>
        <span>Incumplimiento al cierre</span>
      </div>

      <div class="resumen-item sin-color">
        <span class="dot"></span>
        <strong>{{ alertasGenerales.sinColor }}</strong>
        <span>Sin color publicado</span>
      </div>

    </section>

    <!-- ======================================== -->
    <!-- FILTROS -->
    <!-- ======================================== -->

    <section class="filters-panel">
      <div class="filters">

        <!-- BÚSQUEDA -->
        <label>
          Buscar indicador

          <input
            v-model="filtros.busqueda"
            type="search"
            placeholder="Clave, nombre, familia..."
          />
        </label>

        <!-- TIPOLOGÍA -->
        <label>
          Tipología

          <select v-model="filtros.tipologia">
            <option value="Todas">
              Todas
            </option>

            <option
              v-for="opcion in opciones('tipologia')"
              :key="opcion"
              :value="opcion"
            >
              {{ opcion }}
            </option>
          </select>
        </label>

        <!-- ÁMBITO -->
        <label>
          Ámbito de desempeño

          <select v-model="filtros.ambito">
            <option value="Todos">
              Todos
            </option>

            <option
              v-for="opcion in opciones('ambito')"
              :key="opcion"
              :value="opcion"
            >
              {{ opcion }}
            </option>
          </select>
        </label>

        <!-- TERRITORIO -->
        <label>
          Desagregación territorial

          <select v-model="filtros.desagregacion">
            <option value="Todas">
              Todas
            </option>

            <option
              v-for="opcion in opciones('desagregacion')"
              :key="opcion"
              :value="opcion"
            >
              {{ opcion }}
            </option>
          </select>
        </label>

        <!-- SEMÁFORO -->
        <label>
          Semáforo

          <select v-model="filtros.semaforo">
            <option value="Todos">
              Todos
            </option>

            <option value="verde">Verde</option>
            <option value="amarillo">Amarillo</option>
            <option value="rojo">Rojo</option>
            <option value="gris">Gris · incumplimiento</option>
            <option value="sin_color">Sin color publicado</option>
          </select>
        </label>

        <!-- CORTE MENSUAL CON FRECUENCIAS MIXTAS -->
        <label>
          Mes y año de corte
          <input
            v-model="periodoElegido"
            type="month"
            :max="corteMaximo"
            required
          />
        </label>

        <button
          type="button"
          class="clear-button"
          @click="limpiarFiltros"
        >
          Limpiar filtros
        </button>

      </div>
    </section>

    <!-- ======================================== -->
    <!-- INDICADORES ENCONTRADOS -->
    <!-- ======================================== -->

    <div class="resultados-info">
      <div>
        Mostrando
        <strong>{{ totalVisibles }}</strong>
        de
        <strong>{{ totalIndicadores }}</strong>
        indicadores.

        <span
          v-if="periodoActivo"
          class="periodo-etiqueta"
        >
          Corte mensual: {{ periodoActivo }} · America/Mexico_City
        </span>
      </div>

      <button
        type="button"
        class="actualizar-button"
        @click="cargarResultados"
      >
        Actualizar resultados
      </button>
    </div>

    <p class="nota-metodologica" role="status">
      Datos de demostración; no usar como reporte oficial.
      Cada indicador usa su periodo completo correspondiente al corte, sin sustituir faltantes por resultados anteriores.
      Sin fecha de alta y exigibilidad confirmadas no se presume incumplimiento.
    </p>
    <p v-if="!periodoActivo" role="alert" class="nota-metodologica">
      Selecciona un mes cerrado, hasta {{ corteMaximo }}.
    </p>

    <!-- ======================================== -->
    <!-- AGRUPACIONES TEMÁTICAS -->
    <!-- ======================================== -->

    <section class="grupos">

      <article
        v-for="grupo in agrupaciones"
        :key="grupo.nombreOriginal"
        class="grupo"
      >

        <!-- CABECERA -->
        <button
          type="button"
          class="grupo-header"
          :class="{ abierto: grupo.expandido }"
          :aria-expanded="grupo.expandido"
          @click="
            toggleAgrupacion(
              grupo.nombreOriginal
            )
          "
        >
          <div class="grupo-titulo">

            <span class="chevron">
              {{ grupo.expandido ? '⌄' : '›' }}
            </span>

            <div>
              <h2>
                {{
                  grupo.clave
                    ? `${grupo.clave}. ${grupo.nombre}`
                    : grupo.nombre
                }}
              </h2>

              <small>
                {{ grupo.total }} indicadores
              </small>
            </div>

          </div>

          <div class="grupo-derecha">

            <span
              class="grupo-semaforo sin-color"
            >
              <span class="dot"></span>
              Color temático pendiente
            </span>

            <span class="grupo-conteo">
              {{ grupo.conteo.verde }} V ·
              {{ grupo.conteo.amarillo }} A ·
              {{ grupo.conteo.rojo }} R ·
              {{ grupo.conteo.gris }} gris ·
              {{ grupo.conteo.sinColor }} sin color
            </span>

          </div>
        </button>

        <!-- AVISO DE ATENCIÓN -->
        <div
          class="grupo-alerta sin-color"
        >
          <span class="alerta-icono">
            {{
              grupo.conteo.rojo > 0 ||
              grupo.conteo.amarillo > 0
                ? '!'
                : 'i'
            }}
          </span>

          <span>
            {{ mensajeGrupo(grupo) }}
          </span>

          <small
            v-if="
              grupo.conteo.gris > 0 &&
              (
                grupo.conteo.rojo > 0 ||
                grupo.conteo.amarillo > 0
              )
            "
          >
            · {{ grupo.conteo.gris }} incumplidos (fuera del índice)
          </small>
        </div>

        <!-- TABLA DE INDICADORES -->
        <div
          v-if="grupo.expandido"
          class="tabla-contenedor"
        >
          <table>
            <thead>
              <tr>
                <th>Clave</th>
                <th>Nombre del indicador</th>
                <th>Tipología</th>
                <th>Ámbito</th>
                <th>Territorio</th>
                <th>Periodo esperado</th>
                <th>Valor</th>
                <th>Semáforo</th>
                <th>Ficha técnica</th>
              </tr>
            </thead>

            <tbody>

              <tr
                v-for="ind in grupo.indicadores"
                :key="ind.clave"
              >
                <!-- CLAVE -->
                <td class="clave">
                  {{ ind.clave }}
                </td>

                <!-- NOMBRE -->
                <td class="nombre">
                  <button
                    type="button"
                    class="indicador-enlace"
                    @click="abrirFicha(ind)"
                  >
                    {{ ind.nombre }}
                  </button>

                  <small class="indicador-ayuda">
                    Consultar información metodológica
                  </small>
                </td>

                <!-- TIPOLOGÍA -->
                <td>
                  {{ ind.tipologia || '—' }}
                </td>

                <!-- ÁMBITO -->
                <td>
                  {{ ind.ambito || '—' }}
                </td>

                <!-- TERRITORIO -->
                <td>
                  {{ ind.desagregacion || '—' }}
                </td>

                <!-- PERIODO -->
                <td class="periodo">
                  {{
                    ind.periodoEsperado ?? 'Sin periodo definido'
                  }}
                </td>

                <td>{{ ind.valorValidado === null ? '—' : `${ind.valorValidado.toLocaleString('es-MX')} ${ind.unidad}` }}</td>

                <!-- SEMÁFORO -->
                <td>
                  <span
                    class="indicador-semaforo"
                    :class="ind.semaforo ?? 'sin-color'"
                  >
                    <span class="dot"></span>

                    {{
                      etiquetaSemaforo(
                        ind.semaforo
                      )
                    }}
                  </span>
                  <small class="indicador-ayuda">{{ ind.mensaje }}</small>
                </td>

                <!-- ABRIR FICHA -->
                <td>
                  <button
                    type="button"
                    class="ficha-button"
                    :aria-label="
                      `Abrir ficha técnica de ${ind.nombre}`
                    "
                    @click="abrirFicha(ind)"
                  >
                    Ver ficha ↗
                  </button>
                </td>

              </tr>

            </tbody>
          </table>
        </div>

      </article>

      <!-- SIN RESULTADOS -->
      <div
        v-if="agrupaciones.length === 0"
        class="sin-resultados"
      >
        <strong>
          No se encontraron indicadores
        </strong>

        <p>
          Modifica los filtros de búsqueda
          para consultar otros indicadores.
        </p>

        <button
          type="button"
          class="clear-button"
          @click="limpiarFiltros"
        >
          Mostrar todos
        </button>
      </div>

    </section>

    <!-- ======================================== -->
    <!-- NOTA METODOLÓGICA -->
    <!-- ======================================== -->

    <footer class="nota-metodologica">
      <strong>
        Información metodológica
      </strong>

      <p>
        Las fichas técnicas muestran la información
        descriptiva de los indicadores contenida
        en el catálogo SIIP.

        Valor, color y versiones se leen de la publicación conservada; cambiar reglas no recalcula el historial.
        Los registros locales antiguos sin publicación versionada se muestran sin color publicado.
        El gris significa incumplimiento confirmado al cierre; no equivale a rojo ni a cero.
        Un envío completo puede continuar en revisión después del cierre sin volverse gris.
        La justificación documental no elimina el gris y no se muestra como evidencia pública.
        El índice informativo es (verdes + 0.5 × amarillos) / evaluables. Umbrales: verde ≥ 0.80,
        amarillo ≥ 0.50 y rojo &lt; 0.50. Sin evaluables no hay índice.
        El total del catálogo es una referencia; el universo aplicable, la cobertura mínima y el tratamiento
        de grupos pequeños siguen pendientes. No se asigna un color temático oficial.
      </p>
    </footer>

  </div>

  <!-- ======================================== -->
  <!-- FICHA TÉCNICA DE TRES APARTADOS -->
  <!-- ======================================== -->

  <FichaTecnicaModal
    v-if="fichaSeleccionada"
    :key="fichaSeleccionada.clave"
    :indicador="fichaSeleccionada"
    :semaforo="fichaSeleccionada.semaforo"
    :periodo-validado="
      fichaSeleccionada.periodoValidado
    "
    :periodo-esperado="fichaSeleccionada.periodoEsperado"
    :valor-validado="fichaSeleccionada.valorValidado"
    :mensaje-estado="fichaSeleccionada.mensaje"
    :version-publicacion="fichaSeleccionada.versionPublicacion"
    :version-regla="fichaSeleccionada.versionRegla"
    @cerrar="cerrarFicha"
  />

</template>

<style scoped>
.consulta {
  --wine: #70273b;
  --deep: #431c2a;
  --gold: #c69a4b;
  --line: #e8e4dd;
  --muted: #777d85;

  max-width: 1540px;
  margin: 0 auto;
  padding-bottom: 35px;
  color: #282c33;
}

/* ====================================== */
/* ENCABEZADO */
/* ====================================== */

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 22px;
}

.eyebrow {
  display: block;
  color: #a17738;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .12em;
}

.page-header h1 {
  margin: 9px 0;
  color: var(--deep);
  font: 500 clamp(28px, 3vw, 38px) Georgia, serif;
}

.page-header p {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.7;
}

.total-general {
  display: grid;
  justify-items: center;
  min-width: 135px;
  padding: 15px 20px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: white;
}

.total-general strong {
  color: var(--wine);
  font-size: 32px;
}

.total-general span {
  color: var(--muted);
  font-size: 11px;
}

/* ====================================== */
/* RESUMEN GENERAL */
/* ====================================== */

.resumen-general {
  display: grid;
  grid-template-columns:
    repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.resumen-item {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;

  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: white;
}

.resumen-item strong {
  font-size: 23px;
}

.resumen-item > span:last-child {
  color: #62636a;
  font-size: 11px;
}

.dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  flex: 0 0 12px;
  border-radius: 50%;
  background: #a5adb5;
}

.verde .dot {
  background: #2ca25f;
}

.amarillo .dot {
  background: #efb72e;
}

.rojo .dot {
  background: #db4a4a;
}

.gris .dot {
  background: #a5adb5;
}

.sin-color .dot {
  background: transparent;
  border: 2px dashed #245a81;
}

.grupo-semaforo.sin-color,
.grupo-alerta.sin-color,
.indicador-semaforo.sin-color {
  background: #eaf3f9;
  color: #245a81;
}

/* ====================================== */
/* FILTROS */
/* ====================================== */

.filters-panel {
  padding: 18px;
  margin-bottom: 15px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: white;
}

.filters {
  display: grid;
  grid-template-columns:
    repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.filters label {
  display: grid;
  gap: 7px;
  min-width: 0;
  color: #48444a;
  font-size: 11px;
  font-weight: 750;
}

.filters input,
.filters select {
  width: 100%;
  min-width: 0;
  height: 42px;
  padding: 9px 11px;

  border: 1px solid #dddcd7;
  border-radius: 8px;

  background: white;
  color: #282c33;

  font-size: 12px;
  outline: none;
}

.filters input:focus,
.filters select:focus {
  border-color: var(--gold);
  box-shadow: 0 0 0 3px #c69a4b22;
}

.filters select:disabled {
  color: #9a9ba0;
  background: #f5f5f5;
}

.clear-button,
.actualizar-button {
  padding: 11px 15px;
  border: 1px solid var(--wine);
  border-radius: 8px;

  background: white;
  color: var(--wine);

  font-size: 11px;
  font-weight: 800;
  cursor: pointer;

  transition:
    background .2s,
    transform .2s;
}

.clear-button:hover,
.actualizar-button:hover {
  background: #faf1f4;
  transform: translateY(-1px);
}

/* ====================================== */
/* INFORMACIÓN DE RESULTADOS */
/* ====================================== */

.resultados-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;

  margin-bottom: 15px;

  color: var(--muted);
  font-size: 12px;
}

.resultados-info strong {
  color: var(--wine);
}

.periodo-etiqueta {
  display: inline-block;
  margin-left: 10px;
  padding: 6px 10px;

  border-radius: 7px;
  background: #f4ecee;

  color: var(--wine);
  font-size: 11px;
  font-weight: 750;
}

/* ====================================== */
/* AGRUPACIONES */
/* ====================================== */

.grupos {
  display: grid;
  gap: 12px;
}

.grupo {
  overflow: hidden;
  background: white;
  border: 1px solid var(--line);
  border-radius: 13px;

  box-shadow: 0 8px 22px #382c2608;
}

.grupo-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  width: 100%;
  gap: 15px;
  padding: 18px 20px;

  border: 0;
  background: white;
  color: var(--deep);

  text-align: left;
  cursor: pointer;

  transition:
    background .2s,
    box-shadow .2s;
}

.grupo-header:hover {
  background: #faf7f6;
}

.grupo-header.abierto {
  background: linear-gradient(
    110deg,
    #70273b,
    #8b3650
  );
  color: white;

  box-shadow:
    inset 0 1px #ffffff20;
}

.grupo-titulo {
  display: flex;
  align-items: center;
  gap: 13px;
  min-width: 0;
}

.grupo-titulo h2 {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.5;
}

.grupo-titulo small {
  display: block;
  margin-top: 5px;

  font-size: 11px;
  opacity: .8;
}

.chevron {
  flex-shrink: 0;
  font-size: 24px;
  line-height: 1;
}

.grupo-derecha {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 12px;
}

.grupo-conteo {
  font-size: 10px;
  white-space: nowrap;
  opacity: .8;
}

/* ====================================== */
/* SEMÁFORO TEMÁTICO */
/* ====================================== */

.grupo-semaforo {
  display: inline-flex;
  align-items: center;
  gap: 8px;

  padding: 7px 11px;
  border-radius: 20px;

  background: #f0f1f3;
  color: #606b78;

  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}

.grupo-semaforo.verde {
  background: #e8f5ed;
  color: #217447;
}

.grupo-semaforo.amarillo {
  background: #fff4d5;
  color: #906821;
}

.grupo-semaforo.rojo {
  background: #fde6e6;
  color: #a62b2b;
}

.grupo-semaforo.gris {
  background: #edf0f3;
  color: #626e7a;
}

/* ====================================== */
/* AVISO DE ATENCIÓN */
/* ====================================== */

.grupo-alerta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 9px;

  padding: 11px 20px;

  border-bottom: 1px solid var(--line);

  font-size: 11px;
  font-weight: 800;
}

.grupo-alerta small {
  font-size: 10px;
  font-weight: 600;
}

.alerta-icono {
  display: grid;
  place-items: center;

  width: 19px;
  height: 19px;

  border-radius: 50%;
  border: 1px solid currentColor;

  font-size: 11px;
  font-weight: 900;
}

.grupo-alerta.verde {
  color: #217447;
  background: #edf8f1;
}

.grupo-alerta.amarillo {
  color: #89651a;
  background: #fff7e3;
}

.grupo-alerta.rojo {
  color: #a62b2b;
  background: #fff0f0;
}

.grupo-alerta.gris {
  color: #5d6874;
  background: #f3f5f7;
}

/* ====================================== */
/* TABLA DE INDICADORES */
/* ====================================== */

.tabla-contenedor {
  overflow-x: auto;
}

table {
  width: 100%;
  min-width: 1070px;

  border-collapse: collapse;
  text-align: left;
}

th,
td {
  padding: 14px 12px;
  border-bottom: 1px solid #eeeae6;

  font-size: 11px;
  vertical-align: middle;
}

th {
  background: #faf9f7;
  color: #67707a;

  font-size: 10px;
  font-weight: 800;

  text-transform: uppercase;
  letter-spacing: .03em;
}

tbody tr:hover {
  background: #fcfaf8;
}

tbody tr:last-child td {
  border-bottom: 0;
}

td.clave {
  color: var(--wine);
  font-weight: 800;
  white-space: nowrap;
}

td.nombre {
  min-width: 250px;
  line-height: 1.6;
}

td.periodo {
  white-space: nowrap;
}

/* ====================================== */
/* ENLACE A FICHA TÉCNICA */
/* ====================================== */

.indicador-enlace {
  padding: 0;
  border: 0;
  background: transparent;

  color: var(--wine);
  font: inherit;
  font-weight: 800;
  line-height: 1.6;

  text-align: left;
  cursor: pointer;

  transition: color .2s;
}

.indicador-enlace:hover {
  color: #a17738;
  text-decoration: underline;
}

.indicador-ayuda {
  display: block;
  margin-top: 5px;

  color: #929098;
  font-size: 10px;
}

.ficha-button {
  padding: 9px 13px;

  border: 1px solid #dfcbd1;
  border-radius: 8px;

  background: #fbf3f5;
  color: var(--wine);

  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;

  cursor: pointer;

  transition:
    background .2s,
    transform .2s;
}

.ficha-button:hover {
  background: #f4e2e8;
  transform: translateY(-1px);
}

/* ====================================== */
/* SEMÁFORO INDIVIDUAL */
/* ====================================== */

.indicador-semaforo {
  display: inline-flex;
  align-items: center;
  gap: 7px;

  padding: 7px 10px;
  border-radius: 20px;

  font-size: 10px;
  font-weight: 800;
  white-space: nowrap;
}

.indicador-semaforo.verde {
  background: #e8f5ed;
  color: #217447;
}

.indicador-semaforo.amarillo {
  background: #fff4d5;
  color: #906821;
}

.indicador-semaforo.rojo {
  background: #fde6e6;
  color: #a62b2b;
}

.indicador-semaforo.gris {
  background: #edf0f3;
  color: #626e7a;
}

.indicador-semaforo .dot {
  width: 10px;
  height: 10px;
  flex-basis: 10px;
}

/* ====================================== */
/* SIN RESULTADOS */
/* ====================================== */

.sin-resultados {
  display: grid;
  justify-items: center;
  gap: 10px;

  padding: 38px;

  border: 1px solid var(--line);
  border-radius: 12px;

  background: white;
  color: var(--muted);

  text-align: center;
  font-size: 12px;
}

.sin-resultados strong {
  color: var(--deep);
  font-size: 15px;
}

.sin-resultados p {
  margin: 0;
  line-height: 1.7;
}

/* ====================================== */
/* NOTA METODOLÓGICA */
/* ====================================== */

.nota-metodologica {
  margin-top: 24px;
  padding: 17px 20px;

  border-left: 4px solid var(--wine);
  border-radius: 0 10px 10px 0;

  background: #faf8f5;
}

.nota-metodologica strong {
  color: var(--wine);
  font-size: 12px;
}

.nota-metodologica p {
  margin: 8px 0 0;

  color: #6c6a70;
  font-size: 11px;
  line-height: 1.8;
}

/* ====================================== */
/* RESPONSIVE */
/* ====================================== */

@media (max-width: 1150px) {
  .filters {
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 800px) {
  .resumen-general {
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
  }

  .grupo-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .grupo-derecha {
    width: 100%;
    justify-content: space-between;
  }
}

@media (max-width: 550px) {
  .filters {
    grid-template-columns: 1fr;
  }

  .resumen-general {
    gap: 8px;
  }

  .resumen-item {
    padding: 12px;
  }

  .grupo-header {
    padding: 13px;
  }

  .grupo-alerta {
    padding: 10px 13px;
  }

  .periodo-etiqueta {
    margin: 8px 0 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .grupo-header,
  .indicador-enlace,
  .ficha-button,
  .clear-button,
  .actualizar-button {
    transition: none;
  }
}
</style>
