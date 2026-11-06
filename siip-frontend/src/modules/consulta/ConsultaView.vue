
<script setup lang="ts">
import {
  computed,
  onActivated,
  onMounted,
  onUnmounted,
  ref
} from 'vue';

import catalogo from './data/indicadores-siip.json';

import FichaTecnicaModal from './components/FichaTecnicaModal.vue';

import {
  obtenerBandeja,
  type ExpedienteSeguimiento
} from '../review/data/seguimiento.store';

// =====================================================
// TIPOS
// =====================================================

type ColorSemaforo =
  | 'verde'
  | 'amarillo'
  | 'rojo'
  | 'gris';

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
  semaforo: ColorSemaforo;
  valorValidado: number | null;
  periodoValidado: string | null;
}

interface ConteoSemaforo {
  verde: number;
  amarillo: number;
  rojo: number;
  gris: number;
}

interface GrupoConsulta {
  clave: string;
  nombre: string;
  nombreOriginal: string;
  indicadores: IndicadorConsulta[];
  total: number;
  conteo: ConteoSemaforo;
  semaforo: ColorSemaforo;
  expandido: boolean;
}

interface ReglaSemaforo {
  direccion: 'sube' | 'baja';
  verde: number;
  amarillo: number;
  verdeInclusivo?: boolean;
  amarilloInclusivo?: boolean;
}

// =====================================================
// CATÁLOGO OFICIAL
// =====================================================

const indicadoresCatalogo = catalogo as Indicador[];

// =====================================================
// REGLAS DEL SEMÁFORO INDIVIDUAL
// =====================================================
//
// Estas reglas continúan siendo provisionales,
// igual que en la versión anterior.
//
// Antes de su publicación oficial se deben
// contrastar con los criterios del Excel.
//
// Los indicadores sin regla configurada
// permanecerán en gris.
//
// NO se utilizan datos sin validar.

const reglas: Record<string, ReglaSemaforo> = {

  // SEGURIDAD

  'SIIP.01.F01.002': {
    direccion: 'baja',
    verde: -3,
    amarillo: 3
  },

  'SIIP.01.F01.003': {
    direccion: 'sube',
    verde: 90,
    amarillo: 75
  },

  'SIIP.01.F02.002': {
    direccion: 'sube',
    verde: 90,
    amarillo: 75,
    amarilloInclusivo: false
  },

  'SIIP.01.F02.003': {
    direccion: 'sube',
    verde: 90,
    amarillo: 75,
    amarilloInclusivo: false
  },

  'SIIP.01.F03.003': {
    direccion: 'sube',
    verde: 90,
    amarillo: 75,
    amarilloInclusivo: false
  },

  'SIIP.01.F05.003': {
    direccion: 'sube',
    verde: 80,
    amarillo: 70,
    amarilloInclusivo: false
  },

  'SIIP.01.F06.002': {
    direccion: 'sube',
    verde: 90,
    amarillo: 75,
    amarilloInclusivo: false
  },

  'SIIP.01.F06.003': {
    direccion: 'baja',
    verde: 14,
    amarillo: 20
  },

  'SIIP.01.F08.002': {
    direccion: 'sube',
    verde: 90,
    amarillo: 75,
    amarilloInclusivo: false
  },

  'SIIP.01.F09.003': {
    direccion: 'sube',
    verde: 90,
    amarillo: 75,
    amarilloInclusivo: false
  },

  'SIIP.01.F11.003': {
    direccion: 'sube',
    verde: 90,
    amarillo: 75,
    amarilloInclusivo: false
  },

  // BIENESTAR

  'SIIP.02.F16.002': {
    direccion: 'sube',
    verde: 90,
    amarillo: 75,
    amarilloInclusivo: false
  },

  'SIIP.02.F17.002': {
    direccion: 'sube',
    verde: 3,
    amarillo: 0,
    verdeInclusivo: false
  },

  'SIIP.02.F17.003': {
    direccion: 'sube',
    verde: 40,
    amarillo: 30,
    verdeInclusivo: false
  },

  // DESARROLLO ECONÓMICO

  'SIIP.03.F18.002': {
    direccion: 'sube',
    verde: 8,
    amarillo: 7
  },

  'SIIP.03.F19.002': {
    direccion: 'sube',
    verde: 4,
    amarillo: 3
  },

  'SIIP.03.F20.002': {
    direccion: 'sube',
    verde: 90,
    amarillo: 75,
    amarilloInclusivo: false
  },

  'SIIP.03.F21.002': {
    direccion: 'sube',
    verde: 270,
    amarillo: 225,
    amarilloInclusivo: false
  },

  // TERRITORIO

  'SIIP.04.F25.002': {
    direccion: 'sube',
    verde: 90,
    amarillo: 75,
    amarilloInclusivo: false
  },

  'SIIP.04.F26.002': {
    direccion: 'baja',
    verde: 5,
    amarillo: 10,
    amarilloInclusivo: false
  },

  'SIIP.04.F27.002': {
    direccion: 'baja',
    verde: 1,
    amarillo: 2
  },

  'SIIP.04.F28.002': {
    direccion: 'sube',
    verde: 90,
    amarillo: 75,
    amarilloInclusivo: false
  },

  'SIIP.04.F31.002': {
    direccion: 'sube',
    verde: 60,
    amarillo: 45,
    amarilloInclusivo: false
  },

  'SIIP.04.F32.002': {
    direccion: 'sube',
    verde: 90,
    amarillo: 75,
    amarilloInclusivo: false
  },

  'SIIP.04.F33.002': {
    direccion: 'sube',
    verde: 50,
    amarillo: 45,
    amarilloInclusivo: false
  },

  // SERVICIOS PÚBLICOS

  'SIIP.05.F34.003': {
    direccion: 'baja',
    verde: 50,
    amarillo: 60,
    amarilloInclusivo: false
  },

  'SIIP.05.F34.004': {
    direccion: 'sube',
    verde: 75,
    amarillo: 70,
    amarilloInclusivo: false
  },

  'SIIP.05.F35.002': {
    direccion: 'sube',
    verde: 90,
    amarillo: 75,
    amarilloInclusivo: false
  },

  'SIIP.05.F36.002': {
    direccion: 'sube',
    verde: 5,
    amarillo: 3,
    amarilloInclusivo: false
  },

  'SIIP.05.F38.002': {
    direccion: 'baja',
    verde: 5,
    amarillo: 10
  },

  // MOVILIDAD

  'SIIP.06.F42.002': {
    direccion: 'sube',
    verde: 90,
    amarillo: 75,
    amarilloInclusivo: false
  },

  // GOBIERNO

  'SIIP.07.F46.002': {
    direccion: 'sube',
    verde: 90,
    amarillo: 75,
    amarilloInclusivo: false
  },

  'SIIP.07.F48.003': {
    direccion: 'sube',
    verde: 90,
    amarillo: 75,
    amarilloInclusivo: false
  },

  'SIIP.07.F49.002': {
    direccion: 'sube',
    verde: 95,
    amarillo: 85,
    amarilloInclusivo: false
  },

  'SIIP.07.F50.001': {
    direccion: 'sube',
    verde: 4,
    amarillo: 3.5
  },

  'SIIP.07.F51.002': {
    direccion: 'sube',
    verde: 90,
    amarillo: 75,
    amarilloInclusivo: false
  }

  // Las reglas pendientes no se calculan
  // arbitrariamente.
};

// Indicadores con advertencia metodológica.
// No se les asigna color hasta confirmar la fórmula.
const indicadoresPendientes = new Set([
  'SIIP.02.F15.002',
  'SIIP.04.F25.002',
  'SIIP.05.F36.003',
  'SIIP.06.F40.001',
  'SIIP.08.F52.002'
]);

// =====================================================
// ESTADO DE CONSULTA
// =====================================================

const filtros = ref({
  busqueda: '',
  tipologia: 'Todas',
  ambito: 'Todos',
  desagregacion: 'Todas',
  semaforo: 'Todos'
});

const periodoElegido = ref('');

const gruposAbiertos = ref<string[]>([]);

const expedientes = ref<ExpedienteSeguimiento[]>([]);

// =====================================================
// FICHA TÉCNICA DE TRES APARTADOS
// =====================================================
//
// Conservamos la clave para recuperar siempre
// la información completa del indicador.

const claveFichaSeleccionada = ref<string | null>(null);

const fichaSeleccionada = computed(() => {
  if (!claveFichaSeleccionada.value) {
    return null;
  }

  return indicadores.value.find(
    indicador =>
      indicador.clave === claveFichaSeleccionada.value
  ) ?? null;
});

function abrirFicha(indicador: IndicadorConsulta) {
  claveFichaSeleccionada.value = indicador.clave;
}

function cerrarFicha() {
  claveFichaSeleccionada.value = null;
}

// =====================================================
// CARGAR RESULTADOS DE SEGUIMIENTO
// =====================================================

function cargarResultados() {
  try {
    expedientes.value = obtenerBandeja();
  } catch (error) {
    console.error(
      'No se pudieron cargar los resultados:',
      error
    );

    expedientes.value = [];
  }
}

function actualizarAlVolver() {
  if (document.visibilityState === 'visible') {
    cargarResultados();
  }
}

function actualizarAlEnfocar() {
  cargarResultados();
}

onMounted(() => {
  cargarResultados();

  window.addEventListener(
    'focus',
    actualizarAlEnfocar
  );

  document.addEventListener(
    'visibilitychange',
    actualizarAlVolver
  );
});

onActivated(cargarResultados);

onUnmounted(() => {
  window.removeEventListener(
    'focus',
    actualizarAlEnfocar
  );

  document.removeEventListener(
    'visibilitychange',
    actualizarAlVolver
  );
});

// =====================================================
// PERIODOS CON RESULTADOS VALIDADOS
// =====================================================
//
// Cada semáforo temático debe utilizar resultados
// de un MISMO periodo.
//
// Nunca se combinan resultados de meses o
// ejercicios diferentes en una agrupación.

const periodosDisponibles = computed(() =>
  [...new Set(
    expedientes.value
      .filter(
        exp => exp.estado === 'Validada'
      )
      .map(exp => exp.periodo)
      .filter(Boolean)
  )].sort((a, b) => b.localeCompare(a))
);

const periodoActivo = computed(() => {
  if (
    periodoElegido.value &&
    periodosDisponibles.value.includes(
      periodoElegido.value
    )
  ) {
    return periodoElegido.value;
  }

  return periodosDisponibles.value[0] ?? '';
});

// =====================================================
// RESULTADOS VALIDADOS DEL PERIODO
// =====================================================

const resultadosPorIndicador = computed(() => {
  const mapa = new Map<
    string,
    ExpedienteSeguimiento
  >();

  if (!periodoActivo.value) {
    return mapa;
  }

  const validados = expedientes.value
    .filter(exp =>
      exp.estado === 'Validada' &&
      exp.periodo === periodoActivo.value &&
      typeof exp.valor === 'number' &&
      Number.isFinite(exp.valor)
    )
    .sort((a, b) =>
      b.actualizadoEn.localeCompare(
        a.actualizadoEn
      )
    );

  for (const expediente of validados) {
    if (!mapa.has(expediente.indicadorClave)) {
      mapa.set(
        expediente.indicadorClave,
        expediente
      );
    }
  }

  return mapa;
});

// =====================================================
// EVALUACIÓN DEL SEMÁFORO
// =====================================================

function evaluarSemaforo(
  clave: string,
  valor: number | null
): ColorSemaforo {
  if (
    valor === null ||
    !Number.isFinite(valor)
  ) {
    return 'gris';
  }

  if (indicadoresPendientes.has(clave)) {
    return 'gris';
  }

  const regla = reglas[clave];

  if (!regla) {
    return 'gris';
  }

  let verde = false;
  let amarillo = false;

  if (regla.direccion === 'sube') {
    verde = regla.verdeInclusivo === false
      ? valor > regla.verde
      : valor >= regla.verde;

    amarillo = regla.amarilloInclusivo === false
      ? valor > regla.amarillo
      : valor >= regla.amarillo;
  } else {
    verde = regla.verdeInclusivo === false
      ? valor < regla.verde
      : valor <= regla.verde;

    amarillo = regla.amarilloInclusivo === false
      ? valor < regla.amarillo
      : valor <= regla.amarillo;
  }

  if (verde) return 'verde';
  if (amarillo) return 'amarillo';

  return 'rojo';
}

// =====================================================
// CATÁLOGO CON SEMÁFOROS
// =====================================================

const indicadores = computed<IndicadorConsulta[]>(() =>
  indicadoresCatalogo.map(indicador => {
    const expediente =
      resultadosPorIndicador.value.get(
        indicador.clave
      );

    const valor = expediente?.valor ?? null;

    return {
      ...indicador,

      valorValidado: valor,

      periodoValidado:
        expediente?.periodo ?? null,

      semaforo: evaluarSemaforo(
        indicador.clave,
        valor
      )
    };
  })
);

// =====================================================
// OPCIONES DE FILTROS
// =====================================================

function opciones(
  campo: 'tipologia' | 'ambito' | 'desagregacion'
): string[] {
  return [...new Set(
    indicadoresCatalogo
      .map(indicador =>
        indicador[campo]?.trim()
      )
      .filter(
        (valor): valor is string =>
          Boolean(valor)
      )
  )].sort((a, b) =>
    a.localeCompare(b, 'es')
  );
}

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// =====================================================
// FILTRAR INDICADORES
// =====================================================

const indicadoresFiltrados = computed(() => {
  const busqueda = normalizar(
    filtros.value.busqueda
  );

  return indicadores.value.filter(indicador => {
    const texto = normalizar([
      indicador.clave,
      indicador.nombre,
      indicador.agrupacion,
      indicador.familia
    ].join(' '));

    const coincideBusqueda =
      texto.includes(busqueda);

    const coincideTipologia =
      filtros.value.tipologia === 'Todas' ||
      indicador.tipologia ===
        filtros.value.tipologia;

    const coincideAmbito =
      filtros.value.ambito === 'Todos' ||
      indicador.ambito ===
        filtros.value.ambito;

    const coincideDesagregacion =
      filtros.value.desagregacion === 'Todas' ||
      indicador.desagregacion ===
        filtros.value.desagregacion;

    const coincideSemaforo =
      filtros.value.semaforo === 'Todos' ||
      indicador.semaforo ===
        filtros.value.semaforo;

    return (
      coincideBusqueda &&
      coincideTipologia &&
      coincideAmbito &&
      coincideDesagregacion &&
      coincideSemaforo
    );
  });
});

function limpiarFiltros() {
  filtros.value = {
    busqueda: '',
    tipologia: 'Todas',
    ambito: 'Todos',
    desagregacion: 'Todas',
    semaforo: 'Todos'
  };
}

// =====================================================
// DESPLEGAR AGRUPACIONES
// =====================================================

function estaAbierto(nombre: string): boolean {
  return gruposAbiertos.value.includes(nombre);
}

function toggleAgrupacion(nombre: string) {
  if (estaAbierto(nombre)) {
    gruposAbiertos.value =
      gruposAbiertos.value.filter(
        item => item !== nombre
      );
  } else {
    gruposAbiertos.value = [
      ...gruposAbiertos.value,
      nombre
    ];
  }
}

// =====================================================
// SEMÁFORO DE AGRUPACIÓN TEMÁTICA
// =====================================================

function calcularColorGrupo(
  conteo: ConteoSemaforo
): ColorSemaforo {
  if (
    conteo.amarillo > 3 ||
    conteo.rojo >= 2
  ) {
    return 'rojo';
  }

  if (
    conteo.amarillo === 3 ||
    conteo.rojo === 1
  ) {
    return 'amarillo';
  }

  // No declaramos un grupo favorable cuando
  // todavía tiene indicadores sin evaluar.
  if (conteo.gris > 0) {
    return 'gris';
  }

  return 'verde';
}

function contarColores(
  lista: IndicadorConsulta[]
): ConteoSemaforo {
  return {
    verde: lista.filter(
      ind => ind.semaforo === 'verde'
    ).length,

    amarillo: lista.filter(
      ind => ind.semaforo === 'amarillo'
    ).length,

    rojo: lista.filter(
      ind => ind.semaforo === 'rojo'
    ).length,

    gris: lista.filter(
      ind => ind.semaforo === 'gris'
    ).length
  };
}

// =====================================================
// CONSTRUIR AGRUPACIONES
// =====================================================

const agrupaciones = computed<GrupoConsulta[]>(() => {
  const nombres = [...new Set(
    indicadores.value.map(
      indicador => indicador.agrupacion
    )
  )].sort((a, b) => a.localeCompare(b, 'es'));

  return nombres
    .map(nombreOriginal => {
      // Usamos TODOS los indicadores del periodo
      // para determinar el estado temático.
      const todos = indicadores.value.filter(
        indicador =>
          indicador.agrupacion === nombreOriginal
      );

      // Los filtros solo modifican las filas visibles.
      const visibles = indicadoresFiltrados.value.filter(
        indicador =>
          indicador.agrupacion === nombreOriginal
      );

      const conteo = contarColores(todos);

      const coincidencia = nombreOriginal.match(
        /^(\d+)[.\s-]*/
      );

      const clave =
        coincidencia?.[1] ?? '';

      const nombre = nombreOriginal
        .replace(/^\d+[.\s-]*/, '')
        .trim();

      return {
        clave,
        nombre,
        nombreOriginal,

        indicadores: visibles,
        total: todos.length,

        conteo,
        semaforo: calcularColorGrupo(conteo),

        // Usar siempre el nombre original:
        // así el desplegable abre y cierra bien.
        expandido: estaAbierto(nombreOriginal)
      };
    })
    .filter(grupo =>
      grupo.indicadores.length > 0
    );
});

// =====================================================
// AVISOS DE ATENCIÓN
// =====================================================

function mensajeGrupo(grupo: GrupoConsulta): string {
  const {
    rojo,
    amarillo,
    gris
  } = grupo.conteo;

  if (rojo > 0 && amarillo > 0) {
    return `Atención: ${rojo} en rojo y ${amarillo} en amarillo`;
  }

  if (rojo > 0) {
    return `Atención prioritaria: ${rojo} indicador(es) en rojo`;
  }

  if (amarillo > 0) {
    return `Atención: ${amarillo} indicador(es) en amarillo`;
  }

  if (gris > 0) {
    return `${gris} indicador(es) pendientes de evaluación`;
  }

  return 'Sin alertas en los indicadores evaluados';
}

function claseAlerta(
  grupo: GrupoConsulta
): ColorSemaforo {
  if (grupo.conteo.rojo > 0) {
    return 'rojo';
  }

  if (grupo.conteo.amarillo > 0) {
    return 'amarillo';
  }

  if (grupo.conteo.gris > 0) {
    return 'gris';
  }

  return 'verde';
}

// =====================================================
// RESUMEN GENERAL
// =====================================================

const totalIndicadores = computed(() =>
  indicadores.value.length
);

const totalVisibles = computed(() =>
  indicadoresFiltrados.value.length
);

const alertasGenerales = computed(() =>
  contarColores(indicadores.value)
);

// =====================================================
// ETIQUETAS
// =====================================================

function etiquetaSemaforo(
  color: ColorSemaforo
): string {
  const etiquetas: Record<ColorSemaforo, string> = {
    verde: 'Verde',
    amarillo: 'Amarillo',
    rojo: 'Rojo',
    gris: 'Sin evaluar'
  };

  return etiquetas[color];
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
        <span>Sin evaluar</span>
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
            <option value="gris">Sin evaluar</option>
          </select>
        </label>

        <!-- PERIODO COMÚN -->
        <label>
          Periodo evaluado

          <select
            v-model="periodoElegido"
            :disabled="periodosDisponibles.length === 0"
          >
            <option value="">
              {{
                periodosDisponibles.length
                  ? 'Último periodo disponible'
                  : 'Sin periodos validados'
              }}
            </option>

            <option
              v-for="periodo in periodosDisponibles"
              :key="periodo"
              :value="periodo"
            >
              {{ periodo }}
            </option>
          </select>
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
          Periodo evaluado: {{ periodoActivo }}
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
              class="grupo-semaforo"
              :class="grupo.semaforo"
            >
              <span class="dot"></span>
              {{ etiquetaSemaforo(grupo.semaforo) }}
            </span>

            <span class="grupo-conteo">
              {{ grupo.conteo.verde }} V ·
              {{ grupo.conteo.amarillo }} A ·
              {{ grupo.conteo.rojo }} R ·
              {{ grupo.conteo.gris }} S/E
            </span>

          </div>
        </button>

        <!-- AVISO DE ATENCIÓN -->
        <div
          class="grupo-alerta"
          :class="claseAlerta(grupo)"
        >
          <span class="alerta-icono">
            {{
              grupo.conteo.rojo > 0 ||
              grupo.conteo.amarillo > 0
                ? '!'
                : grupo.conteo.gris > 0
                  ? 'i'
                  : '✓'
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
            · {{ grupo.conteo.gris }} sin evaluar
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
                <th>Periodo</th>
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
                    ind.periodoValidado ??
                    'Sin periodo validado'
                  }}
                </td>

                <!-- SEMÁFORO -->
                <td>
                  <span
                    class="indicador-semaforo"
                    :class="ind.semaforo"
                  >
                    <span class="dot"></span>

                    {{
                      etiquetaSemaforo(
                        ind.semaforo
                      )
                    }}
                  </span>
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

        Los semáforos individuales utilizan
        exclusivamente resultados validados
        del periodo seleccionado.

        Los indicadores sin datos o sin una regla
        metodológica confirmada permanecen
        sin evaluar.

        El estado temático combina indicadores
        del mismo periodo y nunca mezcla
        resultados de periodos diferentes.
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
    repeat(4, minmax(0, 1fr));
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
