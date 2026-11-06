
<script setup lang="ts">
import {
  computed,
  onActivated,
  onMounted,
  onUnmounted,
  ref
} from 'vue';

import { useRouter } from 'vue-router';

import {
  obtenerBandeja,
  type ExpedienteSeguimiento
} from './data/seguimiento.store';

// =====================================================
// CONFIGURACIÓN
// =====================================================

const router = useRouter();

const STORAGE_KEY = 'siip-capturas-prototipo-v1';

// =====================================================
// ESTADO DE LA BANDEJA
// =====================================================

const expedientes = ref<ExpedienteSeguimiento[]>([]);

const busqueda = ref('');
const filtroEstado = ref('Todos');
const filtroIndicador = ref('Todos');

const ultimaActualizacion = ref('');
const errorCarga = ref('');

// =====================================================
// CARGAR EXPEDIENTES
// =====================================================

function cargarExpedientes() {
  try {
    errorCarga.value = '';

    // Recuperar la información desde el mismo
    // almacenamiento utilizado por Captura.
    expedientes.value = obtenerBandeja();

    ultimaActualizacion.value =
      new Date().toISOString();
  } catch {
    errorCarga.value =
      'No se pudo actualizar la bandeja de Seguimiento.';
  }
}

// Cargar al montar por primera vez.
onMounted(() => {
  cargarExpedientes();

  // Actualizar cuando se vuelve a la pestaña.
  window.addEventListener(
    'focus',
    cargarExpedientes
  );

  // Actualizar cuando el documento vuelve a ser visible.
  document.addEventListener(
    'visibilitychange',
    actualizarAlVolver
  );

  // Escuchar actualizaciones desde otras pestañas
  // cuando se utilice un almacenamiento compatible.
  window.addEventListener(
    'storage',
    actualizarPorStorage
  );
});

// Actualizar si Vue mantiene esta vista en KeepAlive.
onActivated(cargarExpedientes);

// Retirar los escuchadores.
onUnmounted(() => {
  window.removeEventListener(
    'focus',
    cargarExpedientes
  );

  document.removeEventListener(
    'visibilitychange',
    actualizarAlVolver
  );

  window.removeEventListener(
    'storage',
    actualizarPorStorage
  );
});

function actualizarAlVolver() {
  if (document.visibilityState === 'visible') {
    cargarExpedientes();
  }
}

function actualizarPorStorage(evento: StorageEvent) {
  if (evento.key === STORAGE_KEY) {
    cargarExpedientes();
  }
}

// =====================================================
// CONTADORES
// =====================================================

const totalExpedientes = computed(() =>
  expedientes.value.length
);

const totalEnRevision = computed(() =>
  expedientes.value.filter(
    expediente =>
      expediente.estado === 'En revisión'
  ).length
);

const totalRevisados = computed(() =>
  expedientes.value.filter(
    expediente =>
      expediente.estado === 'Revisada'
  ).length
);

const totalObservados = computed(() =>
  expedientes.value.filter(
    expediente =>
      expediente.estado === 'Observada'
  ).length
);

const totalValidados = computed(() =>
  expedientes.value.filter(
    expediente =>
      expediente.estado === 'Validada'
  ).length
);

// =====================================================
// FILTRO DE INDICADORES
// =====================================================

const indicadoresDisponibles = computed(() => {
  const mapa = new Map<string, string>();

  expedientes.value.forEach(expediente => {
    mapa.set(
      expediente.indicadorClave,
      expediente.indicadorNombre
    );
  });

  return [...mapa.entries()]
    .map(([clave, nombre]) => ({
      clave,
      nombre
    }))
    .sort((a, b) =>
      a.clave.localeCompare(b.clave, 'es')
    );
});

// =====================================================
// NORMALIZACIÓN PARA BÚSQUEDA
// =====================================================

function normalizar(texto: string): string {
  return texto
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

// =====================================================
// FILTROS DE LA BANDEJA
// =====================================================

const expedientesFiltrados = computed(() => {
  const termino = normalizar(busqueda.value);

  return expedientes.value
    .filter(expediente => {
      const texto = normalizar([
        expediente.id,
        expediente.indicadorClave,
        expediente.indicadorNombre,
        expediente.agrupacion,
        expediente.periodo,
        expediente.estado
      ].join(' '));

      const coincideTexto =
        texto.includes(termino);

      const coincideEstado =
        filtroEstado.value === 'Todos' ||
        expediente.estado === filtroEstado.value;

      const coincideIndicador =
        filtroIndicador.value === 'Todos' ||
        expediente.indicadorClave ===
          filtroIndicador.value;

      return (
        coincideTexto &&
        coincideEstado &&
        coincideIndicador
      );
    })
    .sort((a, b) =>
      b.actualizadoEn.localeCompare(
        a.actualizadoEn
      )
    );
});

// =====================================================
// LIMPIAR FILTROS
// =====================================================

function limpiarFiltros() {
  busqueda.value = '';
  filtroEstado.value = 'Todos';
  filtroIndicador.value = 'Todos';
}

// =====================================================
// NAVEGACIÓN A DETALLE
// =====================================================

function abrirExpediente(id: string) {
  router.push({
    name: 'SeguimientoDetalle',
    params: { id }
  });
}

// =====================================================
// FORMATO DE VALORES
// =====================================================

function formatearValor(
  valor: number | null,
  unidad: string
): string {
  if (
    valor === null ||
    !Number.isFinite(valor)
  ) {
    return '—';
  }

  const numero = new Intl.NumberFormat('es-MX', {
    maximumFractionDigits: 4
  }).format(valor);

  return `${numero} ${unidad}`.trim();
}

// =====================================================
// FORMATO DE FECHAS
// =====================================================

function formatearFecha(fecha: string): string {
  const fechaReal = new Date(fecha);

  if (Number.isNaN(fechaReal.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(fechaReal);
}

// =====================================================
// ESTADOS
// =====================================================

function claseEstado(estado: string): string {
  const clases: Record<string, string> = {
    'En revisión': 'pendiente',
    'Revisada': 'revisada',
    'Observada': 'observada',
    'Validada': 'validada'
  };

  return clases[estado] ?? '';
}

function etiquetaAccion(estado: string): string {
  if (estado === 'En revisión') {
    return 'Revisar →';
  }

  if (estado === 'Revisada') {
    return 'Resolver →';
  }

  if (estado === 'Observada') {
    return 'Ver observación →';
  }

  if (estado === 'Validada') {
    return 'Ver expediente →';
  }

  return 'Abrir →';
}
</script>

<template>
  <div class="seguimiento">

    <!-- ====================================== -->
    <!-- ENCABEZADO -->
    <!-- ====================================== -->

    <header class="page-header">
      <div>
        <span class="eyebrow">
          CONTROL Y CALIDAD
        </span>

        <h1>Seguimiento de capturas</h1>

        <p>
          Bandeja de expedientes municipales
          para revisión, observaciones y validación.
        </p>
      </div>

      <span class="demo-tag">
        Entorno demostrativo
      </span>
    </header>

    <!-- ====================================== -->
    <!-- TARJETAS RESUMEN -->
    <!-- ====================================== -->

    <div class="stats-grid">

      <article class="stat-card">
        <span>En revisión</span>

        <strong>
          {{ totalEnRevision }}
        </strong>

        <small>
          Pendientes de revisión
        </small>
      </article>

      <article class="stat-card">
        <span>Revisados</span>

        <strong>
          {{ totalRevisados }}
        </strong>

        <small>
          Pendientes de resolución
        </small>
      </article>

      <article class="stat-card">
        <span>Observados</span>

        <strong>
          {{ totalObservados }}
        </strong>

        <small>
          Requieren corrección
        </small>
      </article>

      <article class="stat-card">
        <span>Validados</span>

        <strong>
          {{ totalValidados }}
        </strong>

        <small>
          Expedientes validados
        </small>
      </article>

    </div>

    <!-- ====================================== -->
    <!-- BANDEJA -->
    <!-- ====================================== -->

    <section class="panel">

      <div class="panel-heading">
        <div>
          <span class="eyebrow">
            EXPEDIENTES
          </span>

          <h2>Bandeja de seguimiento</h2>

          <p>
            Consulta los registros enviados
            desde el módulo de Captura.
          </p>
        </div>

        <div class="panel-actions">
          <span class="total-chip">
            {{ totalExpedientes }} expediente(s)
          </span>

          <button
            type="button"
            class="refresh-button"
            @click="cargarExpedientes"
          >
            <span aria-hidden="true">↻</span>
            Actualizar bandeja
          </button>
        </div>
      </div>

      <!-- MENSAJE DE ERROR -->
      <div
        v-if="errorCarga"
        class="error-message"
        role="alert"
      >
        {{ errorCarga }}
      </div>

      <!-- ==================================== -->
      <!-- FILTROS -->
      <!-- ==================================== -->

      <div class="filters">

        <!-- BÚSQUEDA -->
        <label>
          Buscar expediente

          <input
            v-model="busqueda"
            type="search"
            placeholder="Clave, nombre, folio o periodo..."
          />
        </label>

        <!-- INDICADOR -->
        <label>
          Indicador

          <select v-model="filtroIndicador">
            <option value="Todos">
              Todos los indicadores
            </option>

            <option
              v-for="indicador in indicadoresDisponibles"
              :key="indicador.clave"
              :value="indicador.clave"
            >
              {{ indicador.clave }} ·
              {{ indicador.nombre }}
            </option>
          </select>
        </label>

        <!-- ESTADO -->
        <label>
          Estado del expediente

          <select v-model="filtroEstado">
            <option value="Todos">
              Todos los estados
            </option>

            <option value="En revisión">
              En revisión
            </option>

            <option value="Revisada">
              Revisada
            </option>

            <option value="Observada">
              Observada
            </option>

            <option value="Validada">
              Validada
            </option>
          </select>
        </label>

        <!-- LIMPIAR -->
        <button
          type="button"
          class="clear-button"
          @click="limpiarFiltros"
        >
          Limpiar filtros
        </button>

      </div>

      <div class="results-info">
        <span>
          {{
            expedientesFiltrados.length
          }}
          expediente(s) encontrados
        </span>

        <span v-if="ultimaActualizacion">
          Actualizado:
          {{ formatearFecha(ultimaActualizacion) }}
        </span>
      </div>

      <!-- ==================================== -->
      <!-- TABLA -->
      <!-- ==================================== -->

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Expediente</th>
              <th>Indicador</th>
              <th>Periodo</th>
              <th>Resultado</th>
              <th>Estado</th>
              <th>Actualización</th>
              <th>Acción</th>
            </tr>
          </thead>

          <tbody>

            <tr
              v-for="expediente in expedientesFiltrados"
              :key="expediente.id"
            >

              <!-- FOLIO -->
              <td class="folio">
                {{
                  expediente.id.slice(0, 8).toUpperCase()
                }}
              </td>

              <!-- INDICADOR -->
              <td class="indicador">
                <strong>
                  {{ expediente.indicadorNombre }}
                </strong>

                <small>
                  {{ expediente.indicadorClave }}
                </small>
              </td>

              <!-- PERIODO -->
              <td class="periodo">
                {{ expediente.periodo }}
              </td>

              <!-- VALOR -->
              <td class="valor">
                {{
                  formatearValor(
                    expediente.valor,
                    expediente.unidad
                  )
                }}
              </td>

              <!-- ESTADO -->
              <td>
                <span
                  class="status"
                  :class="
                    claseEstado(expediente.estado)
                  "
                >
                  {{ expediente.estado }}
                </span>
              </td>

              <!-- FECHA -->
              <td class="fecha">
                {{
                  formatearFecha(
                    expediente.actualizadoEn
                  )
                }}
              </td>

              <!-- ACCIÓN -->
              <td>
                <button
                  type="button"
                  class="open-button"
                  @click="
                    abrirExpediente(expediente.id)
                  "
                >
                  {{
                    etiquetaAccion(
                      expediente.estado
                    )
                  }}
                </button>
              </td>

            </tr>

            <!-- SIN EXPEDIENTES -->
            <tr v-if="expedientesFiltrados.length === 0">
              <td
                colspan="7"
                class="empty-state"
              >
                <div class="empty-content">
                  <div class="empty-symbol">
                    ◫
                  </div>

                  <h3>
                    {{
                      totalExpedientes === 0
                        ? 'Todavía no hay expedientes'
                        : 'No se encontraron coincidencias'
                    }}
                  </h3>

                  <p>
                    {{
                      totalExpedientes === 0
                        ? 'Envía una captura para que aparezca en esta bandeja.'
                        : 'Modifica los filtros para consultar otros expedientes.'
                    }}
                  </p>

                  <button
                    v-if="totalExpedientes > 0"
                    type="button"
                    class="clear-button"
                    @click="limpiarFiltros"
                  >
                    Mostrar todos los expedientes
                  </button>
                </div>
              </td>
            </tr>

          </tbody>
        </table>
      </div>
    </section>

    <!-- ====================================== -->
    <!-- NOTA INSTITUCIONAL -->
    <!-- ====================================== -->

    <p class="source-note">
      Los resultados y estados de esta pantalla
      corresponden a operaciones locales
      de demostración. La valoración semafórica
      preliminar se consulta dentro del detalle
      técnico de cada expediente.
    </p>

  </div>
</template>

<style scoped>
.seguimiento {
  --wine: #70273b;
  --deep: #431c2a;
  --gold: #c69a4b;
  --green: #356e58;
  --muted: #777d85;
  --line: #e8e4dd;

  max-width: 1540px;
  margin: 0 auto;
  color: #272b32;
}

/* ========================================= */
/* ENCABEZADO */
/* ========================================= */

.page-header,
.panel-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 16px;
}

.page-header {
  margin-bottom: 25px;
}

.eyebrow {
  color: #a17738;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .12em;
}

h1,
h2 {
  font-family: Georgia, serif;
  color: var(--deep);
  font-weight: 500;
}

h1 {
  font-size: clamp(30px, 3.5vw, 42px);
  margin: 8px 0;
}

h2 {
  font-size: 25px;
  margin: 8px 0;
}

.page-header p,
.panel-heading p {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.7;
  margin: 0;
}

.demo-tag {
  padding: 9px 13px;
  background: #f4eee5;
  color: var(--wine);
  border-radius: 9px;
  font-size: 11px;
  font-weight: 750;
}

/* ========================================= */
/* TARJETAS */
/* ========================================= */

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 17px;
  margin-bottom: 22px;
}

.stat-card,
.panel {
  background: white;
  border: 1px solid var(--line);
  border-radius: 15px;
  box-shadow: 0 12px 35px #382c260a;
}

.stat-card {
  position: relative;
  overflow: hidden;
  padding: 23px;
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
  margin: 12px 0 5px;
  font-size: 36px;
  color: var(--deep);
}

/* ========================================= */
/* PANEL */
/* ========================================= */

.panel {
  padding: 25px;
}

.panel-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.total-chip {
  padding: 9px 12px;
  border-radius: 9px;
  background: #f7f1f3;
  color: var(--wine);
  font-size: 11px;
  font-weight: 800;
}

/* ========================================= */
/* BOTONES */
/* ========================================= */

.refresh-button,
.open-button,
.clear-button {
  border: 0;
  border-radius: 9px;
  background: #f3eee6;
  color: var(--wine);
  font-size: 12px;
  font-weight: 750;
  padding: 11px 14px;
  cursor: pointer;
  transition:
    background .2s,
    transform .2s;
}

.refresh-button:hover,
.open-button:hover,
.clear-button:hover {
  background: #e9ded1;
  transform: translateY(-1px);
}

.open-button {
  white-space: nowrap;
}

/* ========================================= */
/* FILTROS */
/* ========================================= */

.filters {
  display: grid;
  grid-template-columns:
    minmax(200px, 1.3fr)
    minmax(200px, 1.3fr)
    minmax(150px, .8fr)
    auto;
  align-items: end;
  gap: 14px;
  margin-top: 24px;
}

.filters label {
  display: grid;
  gap: 8px;
  min-width: 0;
  color: #48444a;
  font-size: 12px;
  font-weight: 750;
}

.filters input,
.filters select {
  width: 100%;
  min-width: 0;
  height: 43px;
  padding: 11px 12px;
  border: 1px solid #dddcd7;
  border-radius: 9px;
  background: white;
  color: #272b32;
  font-size: 12px;
  outline: none;
}

.filters input:focus,
.filters select:focus {
  border-color: var(--gold);
  box-shadow: 0 0 0 3px #c69a4b22;
}

.filters .clear-button {
  height: 43px;
}

/* ========================================= */
/* INFORMACIÓN DE RESULTADOS */
/* ========================================= */

.results-info {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 18px 0 12px;
  color: var(--muted);
  font-size: 12px;
}

/* ========================================= */
/* TABLA */
/* ========================================= */

.table-wrapper {
  overflow-x: auto;
}

table {
  width: 100%;
  min-width: 950px;
  border-collapse: collapse;
  text-align: left;
}

th,
td {
  padding: 15px 12px;
  border-bottom: 1px solid var(--line);
  font-size: 12px;
  vertical-align: middle;
}

th {
  background: #faf9f6;
  color: var(--muted);
  font-size: 10px;
  letter-spacing: .07em;
  text-transform: uppercase;
}

tbody tr:hover {
  background: #fcfaf8;
}

.folio {
  color: var(--wine);
  font-weight: 800;
  white-space: nowrap;
}

.indicador {
  min-width: 230px;
}

.indicador strong,
.indicador small {
  display: block;
}

.indicador strong {
  color: #30323a;
  line-height: 1.5;
}

.indicador small {
  color: var(--muted);
  margin-top: 6px;
}

.periodo,
.valor,
.fecha {
  white-space: nowrap;
}

.valor {
  font-weight: 750;
  color: var(--deep);
}

/* ========================================= */
/* ESTADOS ADMINISTRATIVOS */
/* ========================================= */

.status {
  display: inline-block;
  padding: 6px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}

.status.pendiente {
  color: #906821;
  background: #fbf1d9;
}

.status.revisada {
  color: #356e58;
  background: #e6f2eb;
}

.status.observada {
  color: #a63f4b;
  background: #fae5e7;
}

.status.validada {
  color: #28654d;
  background: #d9eee2;
}

/* ========================================= */
/* ESTADO VACÍO */
/* ========================================= */

.empty-state {
  padding: 42px;
  text-align: center;
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.empty-symbol {
  display: grid;
  place-items: center;
  width: 58px;
  height: 58px;
  border-radius: 15px;
  background: #f4ecee;
  color: var(--wine);
  font-size: 29px;
}

.empty-content h3 {
  margin: 4px 0;
  color: var(--deep);
  font-size: 16px;
}

.empty-content p {
  max-width: 390px;
  margin: 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.8;
}

/* ========================================= */
/* MENSAJES */
/* ========================================= */

.error-message {
  padding: 13px 16px;
  margin-top: 18px;
  border-radius: 9px;
  background: #fae5e7;
  color: #a63f4b;
  font-size: 12px;
  font-weight: 750;
}

.source-note {
  margin-top: 18px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.7;
}

/* ========================================= */
/* RESPONSIVE */
/* ========================================= */

@media (max-width: 1150px) {
  .filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1050px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 650px) {
  .stats-grid,
  .filters {
    grid-template-columns: 1fr;
  }

  .panel {
    padding: 17px;
  }

  .panel-actions {
    width: 100%;
  }

  .refresh-button {
    flex: 1;
  }

  .empty-state {
    padding: 25px 15px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .refresh-button,
  .open-button,
  .clear-button {
    transition: none;
  }
}
</style>
