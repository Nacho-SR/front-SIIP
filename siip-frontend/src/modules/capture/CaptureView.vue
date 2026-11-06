
<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  ref,
  watch
} from 'vue';

import catalogo from '../consulta/data/indicadores-siip.json';
import configuraciones from './data/campos-captura-siip.json';

import {
  obtenerExpedientes,
  reenviarCorreccion
} from '../review/data/seguimiento.store';

import type {
  IndicadorCaptura,
  RegistroCaptura
} from './data/captura.types';

interface Campo {
  clave: string;
  descripcion: string;
}

interface Configuracion {
  tipo: string;
  campos: Campo[];
  actual?: string;
  anterior?: string;
  advertencia?: string;
}

type Vista = 'captura' | 'revision';

const STORAGE_KEY = 'siip-capturas-prototipo-v1';

const errorCaptura = ref('');

const indicadores: IndicadorCaptura[] = catalogo;

const reglas = configuraciones as Record<
  string,
  Configuracion
>;

// Navegación
const vista = ref<Vista>('captura');

// Selección de indicador
const agrupacionSeleccionada = ref('');
const familiaSeleccionada = ref('');
const indicadorSeleccionado = ref('');

// Periodo
const anio = ref(2026);
const periodoSeleccionado = ref('');

// Captura
const variables = ref<Record<string, string>>({});
const descripcion = ref('');
const archivoEvidencia = ref<File | null>(null);
const archivoInput = ref<HTMLInputElement | null>(null);

// Corrección
const correccionId = ref<string | null>(null);
const observacionPendiente = ref('');

// Mensajes
const mensaje = ref('');
const tipoMensaje = ref<'exito' | 'error'>('exito');

// ==================================================
// REGISTROS LOCALES
// ==================================================

function cargarRegistros(): RegistroCaptura[] {
  try {
    const guardado = sessionStorage.getItem(STORAGE_KEY);

    const datos: unknown = guardado
      ? JSON.parse(guardado)
      : [];

    return Array.isArray(datos)
      ? datos as RegistroCaptura[]
      : [];
  } catch {
    return [];
  }
}

const registros = ref<RegistroCaptura[]>(
  cargarRegistros()
);

function actualizarRegistros() {
  registros.value = cargarRegistros();
}

onMounted(actualizarRegistros);

// ==================================================
// CATÁLOGO DE INDICADORES
// ==================================================

const agrupaciones = computed(() =>
  [...new Set(
    indicadores.map(i => i.agrupacion)
  )].sort()
);

const familias = computed(() =>
  [...new Set(
    indicadores
      .filter(i =>
        i.agrupacion === agrupacionSeleccionada.value
      )
      .map(i => i.familia)
  )].sort()
);

const indicadoresDisponibles = computed(() =>
  indicadores.filter(i =>
    i.agrupacion === agrupacionSeleccionada.value &&
    i.familia === familiaSeleccionada.value
  )
);

const indicadorActivo = computed(() =>
  indicadores.find(i =>
    i.clave === indicadorSeleccionado.value
  ) ?? null
);

const configuracion = computed(() =>
  indicadorActivo.value
    ? reglas[indicadorActivo.value.clave]
    : undefined
);

const campos = computed(() =>
  configuracion.value?.campos ?? []
);

// ==================================================
// PERIODOS
// ==================================================

const periodosDisponibles = computed(() => {
  const frecuencia = indicadorActivo.value?.frecuencia
    .trim()
    .toLowerCase();

  if (frecuencia === 'mensual') {
    const meses = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre'
    ];

    return meses.map((mes, index) => ({
      valor:
        `${anio.value}-${String(index + 1).padStart(2, '0')}`,
      etiqueta: `${mes} ${anio.value}`
    }));
  }

  if (frecuencia === 'trimestral') {
    return [1, 2, 3, 4].map(numero => ({
      valor: `${anio.value}-T${numero}`,
      etiqueta: `Trimestre ${numero} · ${anio.value}`
    }));
  }

  if (frecuencia === 'semestral') {
    return [1, 2].map(numero => ({
      valor: `${anio.value}-S${numero}`,
      etiqueta: `Semestre ${numero} · ${anio.value}`
    }));
  }

  if (frecuencia === 'anual') {
    return [
      {
        valor: String(anio.value),
        etiqueta: `Ejercicio ${anio.value}`
      }
    ];
  }

  return [];
});

// ==================================================
// SELECTORES DEPENDIENTES
// ==================================================

watch(agrupacionSeleccionada, () => {
  familiaSeleccionada.value = '';
  indicadorSeleccionado.value = '';
});

watch(familiaSeleccionada, () => {
  indicadorSeleccionado.value = '';
});

watch([indicadorSeleccionado, anio], () => {
  periodoSeleccionado.value = '';
});

watch(indicadorSeleccionado, () => {
  variables.value = Object.fromEntries(
    campos.value.map(campo => [
      campo.clave,
      ''
    ])
  );
});

// ==================================================
// MENSAJES
// ==================================================

function avisar(
  texto: string,
  tipo: 'exito' | 'error' = 'exito'
) {
  mensaje.value = texto;
  tipoMensaje.value = tipo;
}

// ==================================================
// EVIDENCIA DOCUMENTAL
// ==================================================

function seleccionarArchivo(evento: Event) {
  const input = evento.target as HTMLInputElement;
  const archivo = input.files?.[0] ?? null;

  const pdf =
    archivo &&
    archivo.name.toLowerCase().endsWith('.pdf') &&
    (
      !archivo.type ||
      archivo.type === 'application/pdf'
    ) &&
    archivo.size <= 10 * 1024 * 1024;

  if (archivo && !pdf) {
    archivoEvidencia.value = null;
    input.value = '';

    avisar(
      'Selecciona un archivo PDF válido de máximo 10 MB.',
      'error'
    );
    return;
  }

  archivoEvidencia.value = archivo;
}

// ==================================================
// VALIDACIÓN DE VARIABLES
// ==================================================


const entradaValida = computed(() =>
  campos.value.length > 0 &&
  campos.value.every(campo => {
    const valor = variables.value[campo.clave];

    const texto = String(valor ?? '').trim();

    return (
      texto !== '' &&
      Number.isFinite(Number(texto))
    );
  })
);


// ==================================================
// CÁLCULO AUTOMÁTICO DEL INDICADOR
// ==================================================

const resultado = computed<{
  valor: number | null;
  error: string;
}>(() => {
  const conf = configuracion.value;

  if (!conf || !entradaValida.value) {
    return {
      valor: null,
      error:
        'Completa las variables para calcular el resultado.'
    };
  }

  const v = Object.fromEntries(
    campos.value.map(campo => [
      campo.clave,
      Number(variables.value[campo.clave])
    ])
  ) as Record<string, number>;

  const valores = campos.value.map(campo =>
    v[campo.clave]
  );

  let calculado: number | null = null;

  // Valor directo
  if (conf.tipo === 'direct') {
    calculado = valores[0] ?? null;
  }

  // Suma
  else if (conf.tipo === 'sum') {
    calculado = valores.reduce(
      (total, actual) => total + actual,
      0
    );
  }

  // Cocientes, porcentajes, tasas y promedios
  else if (
    [
      'ratio',
      'ratio100',
      'ratio1000',
      'ratio100000',
      'average'
    ].includes(conf.tipo)
  ) {
    const numerador = valores[0];
    const denominador = valores[1];

    if (!denominador) {
      return {
        valor: null,
        error:
          'El denominador debe ser distinto de cero.'
      };
    }

    const factores: Record<string, number> = {
      ratio: 1,
      average: 1,
      ratio100: 100,
      ratio1000: 1000,
      ratio100000: 100000
    };

    calculado =
      (numerador / denominador) *
      factores[conf.tipo];
  }

  // Porcentaje de pérdidas
  else if (conf.tipo === 'loss_pct') {
    const producido = valores[0];
    const facturado = valores[1];

    if (!producido) {
      return {
        valor: null,
        error:
          'El volumen producido debe ser distinto de cero.'
      };
    }

    calculado =
      ((producido - facturado) / producido) * 100;
  }

  // Variación porcentual
  else if (conf.tipo === 'variation') {
    const actual = conf.actual
      ? v[conf.actual]
      : valores[0];

    const anterior = conf.anterior
      ? v[conf.anterior]
      : valores[1];

    if (!anterior) {
      return {
        valor: null,
        error:
          'El valor del periodo anterior debe ser distinto de cero.'
      };
    }

    calculado =
      ((actual - anterior) / anterior) * 100;
  }

  if (
    calculado !== null &&
    Number.isFinite(calculado)
  ) {
    return {
      valor: calculado,
      error: ''
    };
  }

  return {
    valor: null,
    error:
      'No se pudo calcular. Revisa la metodología.'
  };
});

const resultadoFormateado = computed(() => {
  if (resultado.value.valor === null) {
    return '—';
  }

  const valor = new Intl.NumberFormat('es-MX', {
    maximumFractionDigits: 4
  }).format(resultado.value.valor);

  return `${valor} ${indicadorActivo.value?.unidad ?? ''}`;
});

// ==================================================
// BANDEJA DE REVISIÓN
// ==================================================

const registrosVisibles = computed(() =>
  registros.value
    .filter(registro =>
      registro.estado !== 'Borrador'
    )
    .sort((a, b) =>
      b.actualizadoEn.localeCompare(a.actualizadoEn)
    )
);

const observados = computed(() =>
  registrosVisibles.value.filter(
    registro => registro.estado === 'Observada'
  ).length
);

const pendientes = computed(() =>
  registrosVisibles.value.filter(
    registro => registro.estado === 'En revisión'
  ).length
);

// ==================================================
// LIMPIAR FORMULARIO
// ==================================================

function limpiarFormulario() {
  agrupacionSeleccionada.value = '';
  familiaSeleccionada.value = '';
  indicadorSeleccionado.value = '';

  anio.value = 2026;
  periodoSeleccionado.value = '';

  variables.value = {};
  descripcion.value = '';

  archivoEvidencia.value = null;

  correccionId.value = null;
  observacionPendiente.value = '';

  if (archivoInput.value) {
    archivoInput.value.value = '';
  }
}

// ==================================================
// CORREGIR EXPEDIENTE OBSERVADO
// ==================================================

async function corregirObservado(
  registro: RegistroCaptura
) {
  const expediente = obtenerExpedientes().find(
    item => item.id === registro.id
  );

  if (
    !expediente ||
    expediente.estado !== 'Observada'
  ) {
    actualizarRegistros();

    avisar(
      'Este expediente ya no está observado.',
      'error'
    );

    return;
  }

  const indicador = indicadores.find(
    item =>
      item.clave === expediente.indicadorClave
  );

  if (!indicador) {
    avisar(
      'Indicador no encontrado en el catálogo.',
      'error'
    );
    return;
  }

  vista.value = 'captura';

  agrupacionSeleccionada.value =
    indicador.agrupacion;

  await nextTick();

  familiaSeleccionada.value =
    indicador.familia;

  await nextTick();

  indicadorSeleccionado.value =
    indicador.clave;

  await nextTick();

  anio.value = Number(
    expediente.periodo.slice(0, 4)
  );

  await nextTick();

  periodoSeleccionado.value =
    expediente.periodo;

  const valores =
    expediente.variablesCaptura ?? {};

  variables.value = Object.fromEntries(
    campos.value.map(campo => [
      campo.clave,
      valores[campo.clave] === undefined
        ? ''
        : String(valores[campo.clave])
    ])
  );

  descripcion.value =
    expediente.descripcion;

  correccionId.value =
    expediente.id;

  observacionPendiente.value =
    [...(expediente.historial ?? [])]
      .reverse()
      .find(
        evento => evento.accion === 'observar'
      )?.comentario ??
    'Sin detalle de observación.';

  archivoEvidencia.value = null;

  if (archivoInput.value) {
    archivoInput.value.value = '';
  }

  avisar(
    'Expediente recuperado. Verifica las variables y selecciona nuevamente el PDF.'
  );

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

// ==================================================
// GUARDAR / REENVIAR
// ==================================================


function guardarCaptura() {
  mensaje.value = '';
  errorCaptura.value = '';

  const fallar = (texto: string) => {
    errorCaptura.value = texto;
    avisar(texto, 'error');
  };

  const indicador = indicadorActivo.value;

  // 1. INDICADOR
  if (!indicador) {
    return fallar('Debes seleccionar un indicador.');
  }

  // 2. EJERCICIO
  if (
    !Number.isInteger(anio.value) ||
    anio.value < 2000 ||
    anio.value > 2100
  ) {
    return fallar('Selecciona un ejercicio válido.');
  }

  // 3. PERIODO
  if (
    !periodosDisponibles.value.some(
      p => p.valor === periodoSeleccionado.value
    )
  ) {
    return fallar(
      'Debes seleccionar un periodo de captura.'
    );
  }

  // 4. CONFIGURACIÓN DEL ALGORITMO
  if (!configuracion.value || campos.value.length === 0) {
    return fallar(
      'Este indicador todavía no tiene configurados sus campos de captura.'
    );
  }

  // 5. VARIABLES OBLIGATORIAS
  for (const campo of campos.value) {
    const valorOriginal = variables.value[campo.clave];

  // Convertir de forma segura a texto.
  const texto = String(valorOriginal ?? '').trim();

  if (texto === '') {
    return fallar(
      `Debes ingresar el dato correspondiente a ${campo.clave}.`
    );
  }

  const numero = Number(texto);

  if (!Number.isFinite(numero)) {
    return fallar(
      `El campo ${campo.clave} debe contener un número válido.`
    );
  }
}

  // 6. CÁLCULO INTERNO
  // No se muestra al capturista.
  if (resultado.value.valor === null) {
    return fallar(
      resultado.value.error ||
      'No fue posible procesar las variables. Revisa los datos ingresados.'
    );
  }

  // 7. EVIDENCIA PDF
  if (!archivoEvidencia.value) {
    return fallar(
      'Debes adjuntar una evidencia documental en PDF.'
    );
  }

  const variablesNumericas = Object.fromEntries(
    campos.value.map(campo => [
      campo.clave,
      Number(variables.value[campo.clave])
    ])
  ) as Record<string, number>;

  // 8. CORRECCIÓN DE EXPEDIENTE OBSERVADO
  if (correccionId.value) {
    try {
      const actual = obtenerExpedientes().find(
        item => item.id === correccionId.value
      );

      if (
        !actual ||
        actual.estado !== 'Observada'
      ) {
        throw new Error(
          'El expediente ya no está disponible para corrección.'
        );
      }

      if (
        actual.indicadorClave !== indicador.clave ||
        actual.periodo !== periodoSeleccionado.value
      ) {
        throw new Error(
          'No se permite modificar el indicador ni el periodo original.'
        );
      }

      reenviarCorreccion(correccionId.value, {
        valor: resultado.value.valor,
        variablesCaptura: variablesNumericas,
        descripcion: descripcion.value,
        evidenciaNombre: archivoEvidencia.value.name
      });

      actualizarRegistros();
      limpiarFormulario();

      vista.value = 'revision';

      avisar(
        'Corrección reenviada correctamente a Seguimiento.'
      );
    } catch (error) {
      fallar(
        error instanceof Error
          ? error.message
          : 'No se pudo reenviar la corrección.'
      );
    }

    return;
  }

  // 9. COMPROBAR DUPLICADOS
  const existentes = cargarRegistros();

  const duplicado = existentes.some(
    item =>
      item.indicadorClave === indicador.clave &&
      item.periodo === periodoSeleccionado.value &&
      item.estado !== 'Borrador'
  );

  if (duplicado) {
    return fallar(
      'Ya existe un reporte de este indicador y periodo. Revisa su estado en la pestaña Revisión.'
    );
  }

  // 10. CREAR EXPEDIENTE
  const nuevo: RegistroCaptura = {
    id: crypto.randomUUID(),

    indicadorClave: indicador.clave,
    indicadorNombre: indicador.nombre,
    agrupacion: indicador.agrupacion,

    periodo: periodoSeleccionado.value,
    frecuencia: indicador.frecuencia,

    valor: resultado.value.valor,
    unidad: indicador.unidad,

    variablesCaptura: variablesNumericas,

    descripcion: descripcion.value.trim(),
    evidenciaNombre: archivoEvidencia.value.name,

    estado: 'En revisión',
    actualizadoEn: new Date().toISOString()
  };

  // 11. GUARDAR EN SESSIONSTORAGE
  try {
    const actualizados = [
      nuevo,
      ...existentes
    ];

    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(actualizados)
    );

    // Comprobar que realmente se guardó.
    const verificado = cargarRegistros().some(
      item => item.id === nuevo.id
    );

    if (!verificado) {
      throw new Error(
        'El navegador no confirmó el almacenamiento del expediente.'
      );
    }

    actualizarRegistros();
    limpiarFormulario();

    // Abrir automáticamente la bandeja.
    vista.value = 'revision';

    avisar(
      'Reporte guardado correctamente y enviado a revisión.'
    );

  } catch (error) {
    fallar(
      error instanceof Error
        ? error.message
        : 'No se pudo guardar el reporte.'
    );
  }
}

// ==================================================
// FECHAS
// ==================================================

function formatearFecha(fecha: string) {
  const fechaReal = new Date(fecha);

  if (Number.isNaN(fechaReal.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(fechaReal);
}
</script>

<template>
  <div class="captura">

    <!-- ENCABEZADO -->
    <header class="page-header">
      <div>
        <span class="eyebrow">
          OPERACIÓN MUNICIPAL
        </span>

        <h1>Captura de información</h1>

        <p>
          Registro de variables del algoritmo,
          cálculo preliminar y seguimiento de expedientes.
        </p>
      </div>

      <!-- PERIODO EN LA PARTE SUPERIOR -->
      <div class="periodo-superior">
        <span class="eyebrow">
          PERIODO DE CAPTURA
        </span>

        <div class="periodo-controles">
          <label>
            Ejercicio

            <input
              v-model.number="anio"
              type="number"
              min="2000"
              max="2100"
              :disabled="!!correccionId"
            />
          </label>

          <label>
            Periodo

            <select
              v-model="periodoSeleccionado"
              :disabled="
                !indicadorActivo || !!correccionId
              "
            >
              <option value="">
                {{
                  indicadorActivo
                    ? 'Selecciona un periodo'
                    : 'Primero elige un indicador'
                }}
              </option>

              <option
                v-for="periodo in periodosDisponibles"
                :key="periodo.valor"
                :value="periodo.valor"
              >
                {{ periodo.etiqueta }}
              </option>
            </select>
          </label>
        </div>

        <small>
          La disponibilidad depende de la frecuencia
          del indicador.
        </small>
      </div>
    </header>

    <!-- NAVEGACIÓN CAPTURA / REVISIÓN -->
    <nav
      class="pasos"
      aria-label="Vistas de Captura"
    >
      <button
        type="button"
        class="paso"
        :class="{ activo: vista === 'captura' }"
        :aria-current="
          vista === 'captura' ? 'page' : undefined
        "
        @click="vista = 'captura'"
      >
        <span>01</span>
        Captura
      </button>

      <button
        type="button"
        class="paso"
        :class="{ activo: vista === 'revision' }"
        :aria-current="
          vista === 'revision' ? 'page' : undefined
        "
        @click="
          vista = 'revision';
          actualizarRegistros()
        "
      >
        <span>02</span>
        Revisión

        <small v-if="observados">
          {{ observados }} observada(s)
        </small>
      </button>
    </nav>

    <!-- MENSAJES -->
    <div
      v-if="mensaje"
      class="mensaje"
      :class="tipoMensaje"
      role="status"
    >
      {{ mensaje }}

      <button
        type="button"
        aria-label="Cerrar aviso"
        @click="mensaje = ''"
      >
        ×
      </button>
    </div>

    <!-- ========================================== -->
    <!-- PESTAÑA CAPTURA -->
    <!-- ========================================== -->

    <template v-if="vista === 'captura'">
      <div class="capture-grid">

        <!-- COLUMNA DE SELECCIÓN -->
        <aside class="capture-sidebar">
          <section class="panel">
            <div class="panel-heading">
              <span class="eyebrow">
                PASO 01
              </span>

              <h2>Seleccionar indicador</h2>

              <p>
                Elige agrupación, familia e indicador
                del catálogo oficial.
              </p>
            </div>

            <div class="fields">

              <!-- AGRUPACIÓN -->
              <label>
                Agrupación temática

                <select
                  v-model="agrupacionSeleccionada"
                  :disabled="!!correccionId"
                >
                  <option value="">
                    Selecciona una agrupación
                  </option>

                  <option
                    v-for="item in agrupaciones"
                    :key="item"
                    :value="item"
                  >
                    {{ item }}
                  </option>
                </select>
              </label>

              <!-- FAMILIA -->
              <label>
                Familia de indicadores

                <select
                  v-model="familiaSeleccionada"
                  :disabled="
                    !agrupacionSeleccionada ||
                    !!correccionId
                  "
                >
                  <option value="">
                    Selecciona una familia
                  </option>

                  <option
                    v-for="item in familias"
                    :key="item"
                    :value="item"
                  >
                    {{ item }}
                  </option>
                </select>
              </label>

              <!-- INDICADOR -->
              <label>
                Indicador específico

                <select
                  v-model="indicadorSeleccionado"
                  :disabled="
                    !familiaSeleccionada ||
                    !!correccionId
                  "
                >
                  <option value="">
                    Selecciona un indicador
                  </option>

                  <option
                    v-for="item in indicadoresDisponibles"
                    :key="item.clave"
                    :value="item.clave"
                  >
                    {{ item.clave }} · {{ item.nombre }}
                  </option>
                </select>
              </label>

            </div>
          </section>

          <!-- FICHA METODOLÓGICA -->
          <section
            v-if="indicadorActivo"
            class="panel ficha"
          >
            <span class="eyebrow">
              FICHA METODOLÓGICA
            </span>

            <h2>{{ indicadorActivo.nombre }}</h2>

            <dl>
              <dt>Clave</dt>
              <dd>{{ indicadorActivo.clave }}</dd>

              <dt>Frecuencia</dt>
              <dd>{{ indicadorActivo.frecuencia }}</dd>

              <dt>Unidad</dt>
              <dd>{{ indicadorActivo.unidad }}</dd>

              <dt>Sentido</dt>
              <dd>{{ indicadorActivo.sentido }}</dd>

              <dt>Ámbito territorial</dt>
              <dd>{{ indicadorActivo.desagregacion }}</dd>

              <dt>Fuente</dt>
              <dd>{{ indicadorActivo.fuente }}</dd>
            </dl>

          </section>
        </aside>

        <!-- COLUMNA DE CAPTURA -->
        <main class="capture-main">
          <section class="panel">
            <div class="panel-heading">
              <span class="eyebrow">
                PASO 02
              </span>

              <h2>
                {{
                  correccionId
                    ? 'Corrección de expediente observado'
                    : 'Variables y resultado del indicador'
                }}
              </h2>

              <p>
                Completa las variables que correspondan
                al algoritmo. El resultado se calcula
                automáticamente.
              </p>
            </div>

            <!-- SIN INDICADOR -->
            <div
              v-if="!indicadorActivo"
              class="empty"
            >
              <div class="empty-icon">
                ∑
              </div>

              <strong>
                Selecciona un indicador para comenzar
              </strong>

              <p>
                Los campos cambiarán de acuerdo
                con la fórmula del Excel.
              </p>
            </div>

            <!-- FORMULARIO -->
            <form
              v-else
              class="formulario"
              novalidate
              @submit.prevent="guardarCaptura"
            >

              <!-- OBSERVACIÓN PENDIENTE -->
              <div
                v-if="correccionId"
                class="observacion"
              >
                <strong>
                  Observación de Seguimiento
                </strong>

                <p>
                  {{ observacionPendiente }}
                </p>

                <small>
                  El indicador y el periodo original
                  quedan bloqueados.
                </small>
              </div>

              <!-- ADVERTENCIA METODOLÓGICA -->
              <div
                v-if="configuracion?.advertencia"
                class="alerta-metodo"
              >
                <strong>
                  Revisión metodológica:
                </strong>

                {{ configuracion.advertencia }}
              </div>

              <!-- VARIABLES DEL ALGORITMO -->
              <div class="variables-grid">
                <label
                  v-for="campo in campos"
                  :key="campo.clave"
                >
                  <strong>{{ campo.clave }}</strong>

                  <span>
                    {{ campo.descripcion }}
                  </span>

                  <input
                    v-model="variables[campo.clave]"
                    type="number"
                    step="any"
                    inputmode="decimal"
                    required
                    placeholder="Ingresa el dato"
                  />
                </label>
              </div>


              <!-- AVISO PARA EL CAPTURISTA -->
              <div class="aviso-captura">
                <strong>
                  Registro de variables
                </strong>

                <p>
                  Ingresa los datos correspondientes al indicador
                  y adjunta la evidencia documental.

                  El sistema procesará la información y
                  la enviará al área de Seguimiento para
                  su revisión.
                </p>
              </div>

              <!-- OBSERVACIONES -->
              <label class="full-field">
                Observaciones de captura

                <textarea
                  v-model="descripcion"
                  rows="4"
                  placeholder="Explica el origen de las variables y el contexto del resultado..."
                ></textarea>
              </label>

              <!-- EVIDENCIA -->
              <label class="full-field">
                Evidencia documental (PDF)

                <input
                  ref="archivoInput"
                  type="file"
                  accept=".pdf,application/pdf"
                  @change="seleccionarArchivo"
                />
              </label>

              <div class="nota-evidencia">
                {{
                  archivoEvidencia?.name ??
                  'No has seleccionado un PDF'
                }}

                · Máximo 10 MB. El PDF no se guarda
                en esta demo.
              </div>

              
              <div
                v-if="errorCaptura"
                class="error-formulario"
                role="alert"
              >
                <strong>No se pudo enviar el reporte</strong>
                <p>{{ errorCaptura }}</p>
              </div>

              <!-- ACCIONES -->
              <div class="acciones">
                <button
                  v-if="correccionId"
                  type="button"
                  class="btn-secundario"
                  @click="limpiarFormulario"
                >
                  Cancelar corrección
                </button>

                <button
                  type="submit"
                  class="btn-principal"
                >
                  {{
                    correccionId
                      ? 'Reenviar corrección →'
                      : 'Enviar a revisión →'
                  }}
                </button>
              </div>

            </form>
          </section>
        </main>

      </div>
    </template>

    <!-- ========================================== -->
    <!-- PESTAÑA REVISIÓN -->
    <!-- ========================================== -->

    <section
      v-else
      class="panel revision-panel"
    >
      <div class="revision-encabezado">
        <div>
          <span class="eyebrow">
            CONSULTA DEL CAPTURISTA
          </span>

          <h2>
            Revisión de mis envíos (demo)
          </h2>

          <p>
            Consulta el estado de los expedientes.
            Las decisiones de revisión y validación
            pertenecen al rol Seguimiento.
          </p>
        </div>

        <button
          type="button"
          class="btn-secundario"
          @click="actualizarRegistros"
        >
          Actualizar
        </button>
      </div>

      <!-- RESUMEN -->
      <div class="resumen-revision">
        <span>
          <strong>
            {{ registrosVisibles.length }}
          </strong>
          enviados
        </span>

        <span>
          <strong>{{ pendientes }}</strong>
          en revisión
        </span>

        <span>
          <strong>{{ observados }}</strong>
          observados
        </span>
      </div>

      <!-- TABLA -->
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Indicador</th>
              <th>Periodo</th>
              <th>Registro</th>
              <th>Estado</th>
              <th>Actualización</th>
              <th>Acción</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="registro in registrosVisibles"
              :key="registro.id"
            >
              <td>
                <strong>
                  {{ registro.indicadorClave }}
                </strong>

                <small>
                  {{ registro.indicadorNombre }}
                </small>
              </td>

              <td>
                {{ registro.periodo }}
              </td>

              <td>
                <span class="registro-recibido">
                  Datos registrados
                </span>
              </td>

              <td>
                <span
                  class="status-badge"
                  :class="{
                    review:
                      registro.estado === 'En revisión',
                    reviewed:
                      registro.estado === 'Revisada',
                    observed:
                      registro.estado === 'Observada',
                    validated:
                      registro.estado === 'Validada'
                  }"
                >
                  {{ registro.estado }}
                </span>
              </td>

              <td>
                {{
                  formatearFecha(
                    registro.actualizadoEn
                  )
                }}
              </td>

              <td>
                <button
                  v-if="registro.estado === 'Observada'"
                  type="button"
                  class="link-corregir"
                  @click="corregirObservado(registro)"
                >
                  Corregir
                </button>

                <span v-else>—</span>
              </td>
            </tr>

            <tr v-if="registrosVisibles.length === 0">
              <td
                colspan="6"
                class="vacio-tabla"
              >
                No hay envíos en esta sesión.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="nota-pie">
        En la versión actual no se almacenan usuarios
        responsables ni archivos reales.
        La gestión de periodos completos (exportar
        o eliminar) queda reservada para Administración
        en una fase posterior.
      </p>
    </section>

  </div>
</template>

<style scoped>
.captura {
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

/* ENCABEZADO */

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 22px;
  margin-bottom: 20px;
}

.eyebrow {
  display: block;
  color: #a17738;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .12em;
}

.page-header h1 {
  margin: 8px 0;
  color: var(--deep);
  font: 500 clamp(30px, 3.5vw, 42px) Georgia, serif;
}

.page-header p,
.panel-heading p,
.revision-encabezado p {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.7;
}

/* PERIODO SUPERIOR */

.periodo-superior {
  margin-left: auto;
  min-width: min(410px, 100%);
  padding: 14px 18px;
  background: white;
  border: 1px solid var(--line);
  border-radius: 13px;
  box-shadow: 0 10px 25px #382c2609;
}

.periodo-controles {
  display: grid;
  grid-template-columns: 110px minmax(160px, 1fr);
  gap: 11px;
  margin: 10px 0 6px;
}

.periodo-superior small {
  color: var(--muted);
  font-size: 10px;
}

.periodo-superior label,
.fields label,
.formulario label {
  display: grid;
  gap: 7px;
  min-width: 0;
  color: #48444a;
  font-size: 12px;
  font-weight: 750;
}

.periodo-superior input,
.periodo-superior select,
.fields select,
.formulario input,
.formulario textarea {
  width: 100%;
  min-width: 0;
  padding: 11px 12px;
  border: 1px solid #dddcd7;
  border-radius: 9px;
  background: white;
  color: #272b32;
  font-size: 13px;
  outline: none;
}

.periodo-superior input:focus,
.periodo-superior select:focus,
.fields select:focus,
.formulario input:focus,
.formulario textarea:focus {
  border-color: var(--gold);
  box-shadow: 0 0 0 3px #c69a4b22;
}

select:disabled,
input:disabled {
  background: #f4f3f1 !important;
  color: #888 !important;
  cursor: not-allowed;
}

/* PESTAÑAS CAPTURA Y REVISIÓN */

.pasos {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 22px;
}

.paso {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: white;
  color: #7b7378;
  font-weight: 800;
  cursor: pointer;
  transition:
    background .2s,
    box-shadow .2s,
    transform .2s;
}

.paso span {
  font-size: 11px;
  opacity: .75;
}

.paso small {
  font-size: 10px;
  font-weight: 700;
}

.paso:hover {
  border-color: #d9aebc;
  transform: translateY(-1px);
}

.paso.activo {
  color: var(--wine);
  background:
    linear-gradient(115deg, #fbecf1, #fff9f3);
  border-color: #dcb0be;
  box-shadow:
    0 0 0 2px #70273b13,
    0 9px 25px #70273b20;
}

/* DISTRIBUCIÓN */

.capture-grid {
  display: grid;
  grid-template-columns:
    minmax(290px, .85fr)
    minmax(0, 1.5fr);
  align-items: start;
  gap: 20px;
}

.capture-sidebar,
.capture-main {
  display: grid;
  gap: 20px;
  min-width: 0;
}

/* PANELES */

.panel {
  padding: 25px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 16px;
  box-shadow: 0 12px 35px #382c260a;
}

.panel-heading {
  margin-bottom: 22px;
}

.panel-heading h2,
.revision-encabezado h2 {
  margin: 8px 0;
  color: var(--deep);
  font: 500 25px Georgia, serif;
}

/* CAMPOS */

.fields,
.formulario {
  display: grid;
  gap: 18px;
}

/* FICHA METODOLÓGICA */

.ficha {
  background: #fdfbf8;
}

.ficha h2 {
  color: var(--deep);
  font: 500 23px Georgia, serif;
  overflow-wrap: anywhere;
}

.ficha dl {
  display: grid;
  gap: 9px;
}

.ficha dt {
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
}

.ficha dd {
  margin: 0 0 4px;
  overflow-wrap: anywhere;
  font-size: 12px;
  line-height: 1.65;
}

/* FÓRMULAS */

.formula {
  padding: 16px;
  border-radius: 10px;
  background: #f5ecee;
  overflow-wrap: anywhere;
}

.formula strong {
  color: var(--wine);
  font-size: 10px;
  letter-spacing: .08em;
}

.formula p {
  margin: 9px 0 0;
  font-size: 13px;
  line-height: 1.75;
  white-space: pre-line;
}

.formula-central {
  border-left: 3px solid var(--wine);
}

/* VARIABLES DINÁMICAS */

.variables-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.variables-grid label {
  padding: 14px;
  background: #faf9f7;
  border: 1px solid var(--line);
  border-radius: 10px;
}

.variables-grid label strong {
  color: var(--wine);
  font-size: 13px;
}

.variables-grid label span {
  min-height: 34px;
  color: #686b73;
  font-size: 11px;
  line-height: 1.5;
  font-weight: 500;
}

/* RESULTADO */

.resultado {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
  padding: 18px;
  background: #faf1f4;
  border: 1px solid #ead7de;
  border-radius: 12px;
}

.resultado div > span {
  color: #785363;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .08em;
}

.resultado div > strong {
  display: block;
  margin: 6px 0;
  color: var(--wine);
  font-size: 29px;
}

.resultado small {
  display: block;
  color: #82656a;
  font-size: 11px;
}

.resultado-etiqueta {
  padding: 7px 10px;
  border-radius: 30px;
  background: #f0e3e8;
  color: var(--wine);
  font-size: 11px;
  font-weight: 750;
}

/* EVIDENCIA Y OBSERVACIONES */

.full-field {
  width: 100%;
}

.formulario textarea {
  resize: vertical;
  line-height: 1.7;
}

.nota-evidencia {
  padding: 12px 14px;
  border-radius: 9px;
  background: #faf8f4;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.6;
}

.observacion,
.alerta-metodo {
  padding: 14px 17px;
  border-radius: 0 9px 9px 0;
  font-size: 12px;
  line-height: 1.75;
}

.observacion {
  border-left: 3px solid var(--gold);
  background: #fff7e9;
}

.alerta-metodo {
  border-left: 3px solid #b47b44;
  background: #fdf6ea;
  color: #75512e;
}

.observacion strong {
  color: var(--wine);
}

.observacion p {
  margin: 5px 0;
  white-space: pre-line;
}

.observacion small {
  color: var(--muted);
}

/* BOTONES */

.acciones {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 18px;
  border-top: 1px solid var(--line);
}

.btn-principal,
.btn-secundario {
  padding: 12px 18px;
  border-radius: 9px;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition:
    transform .2s,
    background .2s;
}

.btn-principal {
  color: white;
  background: var(--wine);
  border: 1px solid var(--wine);
}

.btn-principal:hover {
  background: var(--deep);
  transform: translateY(-1px);
}

.btn-secundario {
  color: var(--wine);
  background: #f3eee6;
  border: 1px solid #eae0d9;
}

.btn-secundario:hover {
  background: #ebe1d6;
}

/* ESTADO VACÍO */

.empty {
  padding: 65px 20px;
  text-align: center;
}

.empty-icon {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  margin: 0 auto 15px;
  border-radius: 14px;
  background: #f4ecee;
  color: var(--wine);
  font-size: 27px;
}

.empty strong {
  color: var(--deep);
}

.empty p {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.7;
}

/* MENSAJES */

.mensaje {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 13px 16px;
  margin-bottom: 18px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 750;
}

.mensaje.exito {
  background: #e6f2eb;
  color: #28654d;
}

.mensaje.error {
  background: #fae5e7;
  color: #a63f4b;
}

.mensaje button {
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 21px;
  cursor: pointer;
}

/* REVISIÓN */

.revision-panel {
  min-height: 300px;
}

.revision-encabezado {
  display: flex;
  justify-content: space-between;
  align-items: start;
  flex-wrap: wrap;
  gap: 16px;
}

.resumen-revision {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 18px 0;
}

.resumen-revision span {
  padding: 11px 15px;
  border: 1px solid var(--line);
  border-radius: 9px;
  color: #5b5960;
  font-size: 12px;
}

.resumen-revision strong {
  margin-right: 5px;
  color: var(--wine);
  font-size: 20px;
}

/* TABLA */

.table-wrapper {
  overflow-x: auto;
}

table {
  width: 100%;
  min-width: 790px;
  border-collapse: collapse;
  text-align: left;
}

th,
td {
  padding: 13px 12px;
  border-bottom: 1px solid var(--line);
}

th {
  background: #faf9f6;
  color: var(--muted);
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: .05em;
}

td {
  font-size: 12px;
}

td strong,
td small {
  display: block;
}

td strong {
  color: var(--wine);
}

td small {
  margin-top: 5px;
  color: var(--muted);
  line-height: 1.5;
}

.status-badge {
  display: inline-block;
  padding: 6px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}

.status-badge.review {
  color: #906821;
  background: #fbf1d9;
}

.status-badge.reviewed,
.status-badge.validated {
  color: #28654d;
  background: #e6f2eb;
}

.status-badge.observed {
  color: #a63f4b;
  background: #fae5e7;
}

.link-corregir {
  border: 0;
  background: transparent;
  color: var(--wine);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.link-corregir:hover {
  text-decoration: underline;
}

.vacio-tabla {
  padding: 35px;
  color: var(--muted);
  text-align: center;
}

.nota-pie {
  margin-top: 20px;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.7;
}

/* RESPONSIVE */

@media (max-width: 1050px) {
  .capture-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 650px) {
  .panel {
    padding: 17px;
  }

  .periodo-superior {
    width: 100%;
    min-width: 0;
  }

  .periodo-controles {
    grid-template-columns: 100px minmax(0, 1fr);
  }

  .variables-grid {
    grid-template-columns: 1fr;
  }

  .pasos {
    gap: 8px;
  }

  .paso {
    padding: 12px 8px;
  }

  .acciones {
    flex-wrap: wrap;
  }

  .acciones button {
    flex: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .btn-principal,
  .paso {
    transition: none;
  }
}


/* Aviso informativo para el rol Captura */

.aviso-captura {
  padding: 16px 18px;
  border-left: 3px solid #c69a4b;
  border-radius: 0 10px 10px 0;
  background: #faf7f0;
}

.aviso-captura strong {
  display: block;
  margin-bottom: 7px;
  color: #70273b;
  font-size: 13px;
  font-weight: 800;
}

.aviso-captura p {
  margin: 0;
  color: #65616a;
  font-size: 12px;
  line-height: 1.8;
}


.error-formulario {
  padding: 15px 18px;
  border: 1px solid #eab4bb;
  border-left: 4px solid #bd4556;
  border-radius: 10px;
  background: #fff0f2;
}

.error-formulario strong {
  color: #972c41;
  font-size: 13px;
}

.error-formulario p {
  margin: 6px 0 0;
  color: #8e3444;
  font-size: 12px;
  line-height: 1.7;
}

</style>
