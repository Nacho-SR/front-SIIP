
<script setup lang="ts">
import {
  computed,
  onMounted,
  ref,
  watch
} from 'vue';

import axios from 'axios';
import { useRoute } from 'vue-router';

import api from '../../core/api';

import {
  obtenerIndicadorAdmin,
  type IndicadorAdmin
} from './data/admin.store';

// ============================================
// TIPOS
// ============================================

interface Variable {
  id: string;
  codigo: string;
  descripcion: string;
  unidadMedida: string;
  tipoDato: string;
  dependenciaId: string | null;
  dependenciaNombre: string | null;
  dependenciaActiva: boolean | null;
}

interface Regla {
  tipo: 'porcentaje_parte_total';
  numeradorId: string;
  denominadorId: string;
  amarilloDesde: number;
  verdeDesde: number;
}

interface Metodologia {
  id: string;
  version: number;
  regla: Regla;

  contexto: {
    versionVariables: number;
    frecuencia: string;
    variables: Variable[];

    ficha?: {
      clave: string;
      algoritmo: string;
      semaforizacion: string;
    };
  };

  creadoEn: string;
  creadoPor: string;
}

interface Configuracion {
  indicadorId: string;
  version: number;
  metodologias: Metodologia[];
}

interface Simulacion {
  valor: string | null;
  semaforo: 'verde' | 'amarillo' | 'rojo' | null;
  motivo: string | null;
}

interface PropuestaFormula {
  numeradorId: string;
  denominadorId: string;
  numeradorCodigo: string;
  denominadorCodigo: string;
}

interface PropuestaSemaforo {
  amarilloDesde: number | null;
  verdeDesde: number | null;
}

// ============================================
// RUTA
// ============================================

const route = useRoute();
const id = String(route.params.id);

const endpoint =
  '/administracion/indicadores/' +
  encodeURIComponent(id) +
  '/metodologia';

// ============================================
// ESTADO
// ============================================

const indicador = ref<IndicadorAdmin | null>(null);
const variables = ref<Variable[]>([]);

const versionVariables = ref(0);

const configuracion = ref<Configuracion>({
  indicadorId: id,
  version: 0,
  metodologias: []
});

// Regla.
const numeradorId = ref('');
const denominadorId = ref('');

const amarilloDesde = ref<number | ''>('');
const verdeDesde = ref<number | ''>('');

// Simulación.
const numerador = ref<number | ''>('');
const denominador = ref<number | ''>('');

const resultado = ref<Simulacion | null>(null);

// Estados.
const cargando = ref(true);
const guardando = ref(false);
const simulando = ref(false);
const cargaCompleta = ref(false);

// Mensajes.
const error = ref('');
const mensaje = ref('');
const errorSimulacion = ref('');
const mensajePropuesta = ref('');

// ============================================
// FICHA DOCUMENTAL
// ============================================

const formulaDocumental = computed(
  () => indicador.value?.campos.algoritmo?.trim() ?? ''
);

const semaforoDocumental = computed(
  () => indicador.value?.campos.semaforizacion?.trim() ?? ''
);

const variablesDocumentales = computed(
  () => indicador.value?.campos.variables?.trim() ?? ''
);

const frecuenciaDocumental = computed(
  () => indicador.value?.campos.frecuencia ?? ''
);

const unidadDocumental = computed(
  () => indicador.value?.campos.unidad ?? ''
);

// ============================================
// ÚLTIMA METODOLOGÍA
// ============================================

const ultima = computed(
  () => configuracion.value.metodologias[0]
);

// ============================================
// REGLA ACTUAL
// ============================================

const regla = computed(() => ({
  tipo: 'porcentaje_parte_total' as const,
  numeradorId: numeradorId.value,
  denominadorId: denominadorId.value,
  amarilloDesde: amarilloDesde.value,
  verdeDesde: verdeDesde.value
}));

// ============================================
// DETECTAR CAMBIOS
// ============================================

const hayCambios = computed(() => {
  if (!ultima.value) return true;

  const cambiosRegla = Object.entries(
    regla.value
  ).some(([key, value]) =>
    value !== ultima.value?.regla[
      key as keyof Regla
    ]
  );

  const cambiosFicha = (
    ['clave', 'algoritmo', 'semaforizacion'] as const
  ).some(key =>
    ultima.value?.contexto.ficha?.[key] !==
    indicador.value?.campos[key]
  );

  return (
    cambiosRegla ||
    cambiosFicha ||
    versionVariables.value !==
      ultima.value.contexto.versionVariables
  );
});

// ============================================
// COMPATIBILIDAD
// ============================================

const compatible = computed(() => {
  if (!indicador.value) return false;

  if (
    indicador.value.campos.unidad !== '%' ||
    indicador.value.campos.sentido !== 'Ascendente' ||
    indicador.value.campos.condicionAcumulacion !==
      'No acumulable'
  ) {
    return false;
  }

  if (variables.value.length !== 2) {
    return false;
  }

  const [parte, total] = variables.value;

  return (
    parte.tipoDato === 'entero' &&
    total.tipoDato === 'entero' &&
    parte.unidadMedida.trim().toLowerCase() ===
      total.unidadMedida.trim().toLowerCase()
  );
});

const bloqueado = computed(() =>
  !cargaCompleta.value ||
  cargando.value ||
  guardando.value ||
  simulando.value ||
  !indicador.value ||
  indicador.value.activo ||
  !compatible.value
);

// ============================================
// VALIDAR REGLA
// ============================================

const reglaValida = computed(() => {
  if (
    !numeradorId.value ||
    !denominadorId.value ||
    numeradorId.value === denominadorId.value
  ) {
    return false;
  }

  const ids = new Set(
    variables.value.map(variable => variable.id)
  );

  if (
    !ids.has(numeradorId.value) ||
    !ids.has(denominadorId.value)
  ) {
    return false;
  }

  const amarillo = amarilloDesde.value;
  const verde = verdeDesde.value;

  return (
    typeof amarillo === 'number' &&
    typeof verde === 'number' &&
    Number.isFinite(amarillo) &&
    Number.isFinite(verde) &&
    amarillo >= 0 &&
    verde <= 100 &&
    amarillo < verde
  );
});

const responsablesPendientes = computed(() =>
  variables.value.filter(variable =>
    !variable.dependenciaId ||
    variable.dependenciaActiva === false
  )
);

// ============================================
// ERRORES
// ============================================

function detalle(cause: unknown): string {
  if (axios.isAxiosError(cause)) {
    const data = cause.response?.data as {
      detail?: string;
      message?: string;
    } | undefined;

    return (
      data?.detail ||
      data?.message ||
      'No se pudo conectar con el servidor. Tus cambios se conservan.'
    );
  }

  return cause instanceof Error
    ? cause.message
    : 'No se pudo completar la operación.';
}

// ============================================
// IDENTIFICAR OPERANDOS DOCUMENTALES
// ============================================

// No ejecuta fórmulas del Excel.
// Solo identifica una división explícita
// de dos códigos ya registrados.

const propuestaFormula = computed<
  PropuestaFormula | null
>(() => {
  if (!compatible.value) return null;

  const texto = formulaDocumental.value;
  if (!texto) return null;

  const coincidencias = [
    ...texto.matchAll(
      /\b([A-Za-z][A-Za-z0-9_]*)\s*\/\s*([A-Za-z][A-Za-z0-9_]*)\b/g
    )
  ];

  if (coincidencias.length !== 1) {
    return null;
  }

  const [, parteCodigo, totalCodigo] =
    coincidencias[0];

  if (
    !parteCodigo ||
    !totalCodigo ||
    parteCodigo.toUpperCase() ===
      totalCodigo.toUpperCase()
  ) {
    return null;
  }

  const buscar = (codigo: string) =>
    variables.value.find(variable =>
      variable.codigo.toUpperCase() ===
      codigo.toUpperCase()
    );

  const parte = buscar(parteCodigo);
  const total = buscar(totalCodigo);

  if (!parte || !total) {
    return null;
  }

  return {
    numeradorId: parte.id,
    denominadorId: total.id,
    numeradorCodigo: parte.codigo,
    denominadorCodigo: total.codigo
  };
});

// ============================================
// IDENTIFICAR UMBRALES DOCUMENTALES
// ============================================

function leerUmbral(
  texto: string,
  color: 'amarillo' | 'verde'
): number | null {
  const patrones = [
    new RegExp(
      `\\b${color}\\b[^.;\\n]{0,100}?` +
      `(?:desde|a partir de|mayor o igual a|≥)` +
      `\\s*(\\d+(?:[.,]\\d+)?)\\s*%`,
      'i'
    ),

    new RegExp(
      `(?:desde|a partir de|mayor o igual a|≥)` +
      `\\s*(\\d+(?:[.,]\\d+)?)\\s*%` +
      `[^.;\\n]{0,55}?\\b${color}\\b`,
      'i'
    )
  ];

  for (const patron of patrones) {
    const coincidencia = texto.match(patron);

    if (!coincidencia?.[1]) {
      continue;
    }

    const valor = Number(
      coincidencia[1].replace(',', '.')
    );

    if (
      Number.isFinite(valor) &&
      valor >= 0 &&
      valor <= 100
    ) {
      return valor;
    }
  }

  return null;
}

const propuestaSemaforo = computed<
  PropuestaSemaforo
>(() => {
  const texto = semaforoDocumental.value;

  const amarillo = leerUmbral(
    texto,
    'amarillo'
  );

  const verde = leerUmbral(
    texto,
    'verde'
  );

  if (
    amarillo !== null &&
    verde !== null &&
    amarillo >= verde
  ) {
    return {
      amarilloDesde: null,
      verdeDesde: null
    };
  }

  return {
    amarilloDesde: amarillo,
    verdeDesde: verde
  };
});

const hayPropuesta = computed(() =>
  propuestaFormula.value !== null ||
  propuestaSemaforo.value.amarilloDesde !== null ||
  propuestaSemaforo.value.verdeDesde !== null
);

// ============================================
// APLICAR PROPUESTA DOCUMENTAL
// ============================================

function aplicarPropuesta() {
  if (
    bloqueado.value ||
    !hayPropuesta.value
  ) {
    return;
  }

  const formula = propuestaFormula.value;
  const semaforo = propuestaSemaforo.value;

  if (formula) {
    numeradorId.value = formula.numeradorId;
    denominadorId.value = formula.denominadorId;
  }

  if (semaforo.amarilloDesde !== null) {
    amarilloDesde.value =
      semaforo.amarilloDesde;
  }

  if (semaforo.verdeDesde !== null) {
    verdeDesde.value =
      semaforo.verdeDesde;
  }

  resultado.value = null;
  errorSimulacion.value = '';

  mensajePropuesta.value =
    'La propuesta se aplicó al formulario. ' +
    'Revisa sus parámetros antes de guardarlos. ' +
    'No se modificó PostgreSQL.';
}

// ============================================
// APLICAR CONFIGURACIÓN GUARDADA
// ============================================

function aplicar(data: Configuracion) {
  configuracion.value = data;

  const saved = data.metodologias[0];

  numeradorId.value =
    saved?.regla.numeradorId ?? '';

  denominadorId.value =
    saved?.regla.denominadorId ?? '';

  amarilloDesde.value =
    saved?.regla.amarilloDesde ?? '';

  verdeDesde.value =
    saved?.regla.verdeDesde ?? '';
}

// ============================================
// DESCARTAR CAMBIOS LOCALES
// ============================================

function restablecerFormulario() {
  if (
    guardando.value ||
    simulando.value ||
    cargando.value
  ) {
    return;
  }

  aplicar(configuracion.value);

  resultado.value = null;
  errorSimulacion.value = '';
  mensaje.value = '';

  mensajePropuesta.value =
    'Se recuperaron los parámetros de la ' +
    'última versión guardada. ' +
    'No se modificó PostgreSQL.';
}

// ============================================
// RESTABLECER DESDE LA FICHA
// ============================================

function restablecerDesdeFicha() {
  if (
    bloqueado.value ||
    !hayPropuesta.value
  ) {
    return;
  }

  // 1. Recuperar la última configuración.
  aplicar(configuracion.value);

  // 2. Recuperar los campos identificables
  // de la ficha técnica original.
  aplicarPropuesta();

  resultado.value = null;
  errorSimulacion.value = '';
  mensaje.value = '';

  mensajePropuesta.value =
    'Se recuperaron los valores identificables ' +
    'de la ficha técnica original. ' +
    'Revisa numerador, denominador y umbrales ' +
    'antes de guardar una nueva versión. ' +
    'No se modificó PostgreSQL.';
}

// ============================================
// CARGAR CONFIGURACIÓN
// ============================================

async function cargar() {
  if (
    guardando.value ||
    simulando.value
  ) {
    return;
  }

  cargando.value = true;
  cargaCompleta.value = false;

  error.value = '';
  mensaje.value = '';
  mensajePropuesta.value = '';

  resultado.value = null;
  errorSimulacion.value = '';

  try {
    const [
      ficha,
      entradas,
      config
    ] = await Promise.all([
      obtenerIndicadorAdmin(id),

      api.get<{
        version: number;
        variables: Variable[];
      }>(
        endpoint.replace(
          '/metodologia',
          '/variables'
        )
      ),

      api.get<Configuracion>(endpoint)
    ]);

    indicador.value = ficha;
    variables.value = entradas.data.variables;
    versionVariables.value = entradas.data.version;

    aplicar(config.data);
    cargaCompleta.value = true;

  } catch (cause) {
    error.value = detalle(cause);

  } finally {
    cargando.value = false;
  }
}

// ============================================
// GUARDAR VERSIÓN METODOLÓGICA
// ============================================

async function guardar() {
  if (
    bloqueado.value ||
    !reglaValida.value ||
    !hayCambios.value
  ) {
    return;
  }

  guardando.value = true;

  error.value = '';
  mensaje.value = '';
  mensajePropuesta.value = '';

  try {
    const { data } = await api.put<Configuracion>(
      endpoint,
      {
        version: configuracion.value.version,
        versionVariables: versionVariables.value,
        regla: regla.value
      }
    );

    aplicar(data);

    mensaje.value =
      `Versión ${data.version} guardada. ` +
      'El indicador sigue inactivo y sin ' +
      'periodo de inicio.';

  } catch (cause) {
    error.value = detalle(cause);

  } finally {
    guardando.value = false;
  }
}

// ============================================
// SIMULAR CÁLCULO
// ============================================

async function simular() {
  if (
    bloqueado.value ||
    !reglaValida.value ||
    numerador.value === '' ||
    denominador.value === ''
  ) {
    return;
  }

  simulando.value = true;
  resultado.value = null;
  errorSimulacion.value = '';

  try {
    const { data } = await api.post<Simulacion>(
      endpoint + '/simular',
      {
        versionVariables: versionVariables.value,
        regla: regla.value,
        numerador: numerador.value,
        denominador: denominador.value
      }
    );

    resultado.value = data;

  } catch (cause) {
    errorSimulacion.value = detalle(cause);

  } finally {
    simulando.value = false;
  }
}

// ============================================
// LIMPIAR SIMULACIÓN AL CAMBIAR PARÁMETROS
// ============================================

watch(
  [
    regla,
    numerador,
    denominador
  ],
  () => {
    resultado.value = null;
    errorSimulacion.value = '';
    mensaje.value = '';
  },
  { flush: 'sync' }
);

// ============================================
// INICIALIZACIÓN
// ============================================

onMounted(() => {
  void cargar();
});
</script>

<template>
  <section class="panel metodologia-indicador">

    <!-- REGRESAR -->

    <router-link
      :to="{ name: 'AdministradorIndicadores' }"
      class="enlace-regresar"
    >
      ← Regresar a Indicadores
    </router-link>

    <!-- ENCABEZADO -->

    <div class="panel-header">
      <div>
        <span class="eyebrow">
          CONFIGURACIÓN DEL INDICADOR
        </span>

        <h2>Cálculo y semáforo</h2>

        <p v-if="indicador">
          <strong>
            {{ indicador.campos.clave }}
          </strong>
          —
          {{ indicador.campos.nombre }}
        </p>
      </div>

      <router-link
        class="btn-secundario"
        :to="{
          name: 'AdministradorVariablesIndicador',
          params: { id }
        }"
      >
        Variables y dependencias
      </router-link>
    </div>

    <!-- MENSAJES -->

    <p
      v-if="cargando"
      class="nota"
      role="status"
    >
      Cargando metodología...
    </p>

    <div
      v-if="error"
      class="error"
      role="alert"
    >
      <p>{{ error }}</p>

      <button
        type="button"
        class="btn-secundario"
        :disabled="
          guardando ||
          simulando ||
          cargando
        "
        @click="cargar"
      >
        Recargar configuración
        (descarta cambios sin guardar)
      </button>
    </div>

    <p
      v-if="mensaje"
      class="mensaje"
      role="status"
    >
      {{ mensaje }}
    </p>

    <template
      v-if="indicador && cargaCompleta"
    >

      <!-- INTRODUCCIÓN -->

      <p class="nota">
        Configura una metodología versionada.
        El periodo de inicio se elegirá
        al activar el indicador.
        Guardar aquí no habilita capturas
        ni publica resultados.
      </p>

      <router-link
        class="btn-secundario"
        :to="{
          name: 'AdministradorActivacionIndicador',
          params: { id }
        }"
      >
        Revisar activación e inicio
      </router-link>

      <p
        v-if="indicador.activo"
        class="error"
        role="alert"
      >
        El indicador está activo.
        Sus reglas no pueden modificarse
        mediante este formulario.
      </p>

      <!-- ===================================
           REFERENCIA DOCUMENTAL
      ==================================== -->

      <section
        class="referencia-documental"
        aria-labelledby="titulo-ficha"
      >
        <div class="seccion-titulo">
          <div>
            <span class="etiqueta">
              FICHA TÉCNICA ORIGINAL
            </span>

            <h3 id="titulo-ficha">
              Información documental
            </h3>

            <p>
              Estos datos provienen del
              catálogo original. No constituyen
              por sí mismos una metodología
              operativa aprobada.
            </p>
          </div>
        </div>

        <div class="referencia-grid">

          <div class="referencia-bloque">
            <span class="referencia-label">
              Fórmula original
            </span>

            <pre class="referencia-texto">{{
              formulaDocumental ||
              'No especificada'
            }}</pre>
          </div>

          <div class="referencia-bloque">
            <span class="referencia-label">
              Semáforo original
            </span>

            <pre class="referencia-texto">{{
              semaforoDocumental ||
              'No especificado'
            }}</pre>
          </div>

          <div class="referencia-bloque">
            <span class="referencia-label">
              Variables documentales
            </span>

            <pre class="referencia-texto">{{
              variablesDocumentales ||
              'No especificadas'
            }}</pre>
          </div>

          <div class="referencia-bloque">
            <span class="referencia-label">
              Frecuencia y unidad
            </span>

            <p>
              {{ frecuenciaDocumental }}
              ·
              {{ unidadDocumental }}
            </p>

            <span class="referencia-aclaracion">
              Zona horaria: America/Mexico_City
            </span>
          </div>

        </div>
      </section>

      <!-- ===================================
           COMPATIBILIDAD
      ==================================== -->

      <section
        class="compatibilidad-metodo"
        aria-labelledby="titulo-compatibilidad"
      >
        <div class="seccion-titulo">
          <div>
            <span class="etiqueta">
              CONFIGURACIÓN OPERATIVA
            </span>

            <h3 id="titulo-compatibilidad">
              Compatibilidad del cálculo
            </h3>
          </div>

          <span
            class="estado-compatibilidad"
            :class="
              compatible
                ? 'es-compatible'
                : 'no-compatible'
            "
          >
            {{
              compatible
                ? 'Compatible'
                : 'Requiere revisión'
            }}
          </span>
        </div>

        <p v-if="compatible" class="nota">
          El indicador cumple las condiciones
          estructurales del motor:
          porcentaje ascendente,
          no acumulable,
          con dos variables enteras
          de la misma unidad.
        </p>

        <p v-else class="nota">
          El motor actual solo admite
          porcentajes ascendentes,
          no acumulables,
          con dos variables enteras de
          la misma unidad.
          Revisa la ficha técnica y las
          variables antes de continuar.
        </p>

        <div class="compatibilidad-resumen">

          <div>
            <span>Variables registradas</span>

            <strong>
              {{ variables.length }}
            </strong>
          </div>

          <div>
            <span>Responsables pendientes</span>

            <strong>
              {{ responsablesPendientes.length }}
            </strong>
          </div>

          <div>
            <span>Versión actual</span>

            <strong>
              {{
                ultima
                  ? `v${ultima.version}`
                  : 'Sin versión'
              }}
            </strong>
          </div>

        </div>
      </section>

      <!-- ===================================
           PROPUESTA DOCUMENTAL
      ==================================== -->

      <section
        class="preparacion-asistida"
        aria-labelledby="titulo-propuesta"
      >
        <div class="seccion-titulo">
          <div>
            <span class="etiqueta">
              ASISTENCIA DESDE LA FICHA
            </span>

            <h3 id="titulo-propuesta">
              Propuesta de configuración
            </h3>

            <p>
              Identificamos únicamente
              referencias explícitas de la ficha.
              Debes revisar y confirmar
              los parámetros antes de guardarlos.
            </p>
          </div>
        </div>

        <div class="propuestas-grid">

          <!-- OPERANDOS -->

          <div class="propuesta-bloque">
            <span class="referencia-label">
              Operandos sugeridos
            </span>

            <template v-if="propuestaFormula">
              <p>
                <strong>Numerador:</strong>
                {{ propuestaFormula.numeradorCodigo }}
              </p>

              <p>
                <strong>Denominador:</strong>
                {{ propuestaFormula.denominadorCodigo }}
              </p>
            </template>

            <p v-else class="nota">
              No se encontró una división
              inequívoca entre las variables
              registradas. Puedes seleccionar
              los operandos manualmente.
            </p>
          </div>

          <!-- UMBRALES -->

          <div class="propuesta-bloque">
            <span class="referencia-label">
              Umbrales sugeridos
            </span>

            <p>
              <strong>
                Amarillo desde:
              </strong>

              {{
                propuestaSemaforo.amarilloDesde
                  === null
                  ? 'Por definir'
                  : propuestaSemaforo.amarilloDesde + ' %'
              }}
            </p>

            <p>
              <strong>
                Verde desde:
              </strong>

              {{
                propuestaSemaforo.verdeDesde
                  === null
                  ? 'Por definir'
                  : propuestaSemaforo.verdeDesde + ' %'
              }}
            </p>
          </div>

        </div>

        <p
          v-if="mensajePropuesta"
          class="mensaje"
          role="status"
        >
          {{ mensajePropuesta }}
        </p>

        <!-- BOTONES DE LA PROPUESTA -->

        <div class="propuesta-acciones">

          <button
            type="button"
            class="btn-secundario"
            :disabled="
              bloqueado ||
              !hayPropuesta
            "
            @click="aplicarPropuesta"
          >
            Aplicar propuesta al formulario
          </button>

          <button
            type="button"
            class="btn-secundario"
            :disabled="
              bloqueado ||
              !hayPropuesta
            "
            @click="restablecerDesdeFicha"
          >
            Restablecer desde la ficha técnica
          </button>

          <span class="nota">
            Ninguna de estas acciones
            modifica PostgreSQL.
          </span>

        </div>
      </section>

      <!-- ===================================
           CAMBIOS DE VARIABLES
      ==================================== -->

      <p
        v-if="
          ultima &&
          ultima.contexto.versionVariables !==
            versionVariables
        "
        class="nota"
        role="status"
      >
        Las variables o sus responsables
        cambiaron después de la última
        versión metodológica.

        Guarda una nueva versión para
        conservar la configuración actual.
      </p>

      <!-- ===================================
           FORMULARIO DE CÁLCULO Y SEMÁFORO
      ==================================== -->

      <form @submit.prevent="guardar">
        <fieldset
          class="regla-form"
          :disabled="bloqueado"
        >
          <legend>
            Regla de porcentaje
            · P = parte / total × 100
          </legend>

          <div class="regla-campos">

            <label>
              Numerador (parte)

              <select
                v-model="numeradorId"
                required
              >
                <option value="" disabled>
                  Selecciona la variable
                </option>

                <option
                  v-for="variable in variables"
                  :key="variable.id"
                  :value="variable.id"
                >
                  {{ variable.codigo }}
                  —
                  {{ variable.descripcion }}
                </option>
              </select>
            </label>

            <label>
              Denominador (total)

              <select
                v-model="denominadorId"
                required
              >
                <option value="" disabled>
                  Selecciona la variable
                </option>

                <option
                  v-for="variable in variables"
                  :key="variable.id"
                  :value="variable.id"
                >
                  {{ variable.codigo }}
                  —
                  {{ variable.descripcion }}
                </option>
              </select>
            </label>

            <label>
              Amarillo desde (%)

              <input
                v-model.number="amarilloDesde"
                type="number"
                min="0"
                max="100"
                step="any"
                required
              />
            </label>

            <label>
              Verde desde (%)

              <input
                v-model.number="verdeDesde"
                type="number"
                min="0"
                max="100"
                step="any"
                required
              />
            </label>

          </div>

          <p class="nota">
            Rojo: menor al umbral amarillo.
            Amarillo: desde ese umbral
            y menor al verde.
            Verde: desde el umbral verde.
          </p>

          <p class="nota">
            Los conteos son enteros
            no negativos y la parte
            no puede superar al total.
            Si ambos son cero, el
            resultado no tiene valor ni color.
          </p>

          <!-- RESPONSABLES -->

          <h4 class="subtitulo-responsables">
            Responsables de las variables
          </h4>

          <ul class="responsables">
            <li
              v-for="variable in variables"
              :key="variable.id"
            >
              <strong>
                {{ variable.codigo }}
              </strong>
              :
              {{
                variable.dependenciaNombre ||
                'Sin dependencia asignada'
              }}

              <span
                v-if="
                  variable.dependenciaActiva === false
                "
              >
                (inactiva)
              </span>
            </li>
          </ul>

          <p
            v-if="responsablesPendientes.length"
            class="nota"
          >
            Puedes preparar la metodología,
            pero debes completar los
            responsables antes de activar.
          </p>

          <!-- GUARDADO -->

          <div class="acciones-formulario">
            <button
              type="submit"
              class="btn-principal"
              :disabled="
                !reglaValida ||
                !hayCambios
              "
            >
              {{
                guardando
                  ? 'Guardando...'
                  : 'Guardar versión de metodología'
              }}
            </button>

            <button
              type="button"
              class="btn-secundario"
              :disabled="
                guardando ||
                simulando ||
                cargando ||
                !hayCambios
              "
              @click="restablecerFormulario"
            >
              Descartar cambios
            </button>
          </div>

        </fieldset>
      </form>

      <!-- ===================================
           SIMULACIÓN
      ==================================== -->

      <form @submit.prevent="simular">
        <fieldset
          class="regla-form"
          :disabled="bloqueado"
        >
          <legend>
            Probar cálculo
          </legend>

          <p class="nota">
            Utiliza los parámetros visibles
            sin crear capturas ni resultados
            publicados.
          </p>

          <div class="regla-campos">

            <label>
              Valor de la parte

              <input
                v-model.number="numerador"
                type="number"
                min="0"
                max="9007199254740991"
                step="1"
                required
              />
            </label>

            <label>
              Valor del total

              <input
                v-model.number="denominador"
                type="number"
                min="0"
                max="9007199254740991"
                step="1"
                required
              />
            </label>

          </div>

          <button
            type="submit"
            class="btn-secundario"
            :disabled="
              !reglaValida ||
              numerador === '' ||
              denominador === ''
            "
          >
            {{
              simulando
                ? 'Calculando...'
                : 'Probar cálculo'
            }}
          </button>

        </fieldset>

        <p
          v-if="errorSimulacion"
          class="error"
          role="alert"
        >
          {{ errorSimulacion }}
        </p>

        <div
          v-if="resultado"
          class="resultado-prueba"
          role="status"
        >
          <template
            v-if="
              resultado.motivo ===
              'DENOMINADOR_CERO'
            "
          >
            Sin dato: el total es cero.
            No se asigna valor ni color.
          </template>

          <template v-else>
            <strong>
              Resultado de prueba:
              {{ resultado.valor }} %
            </strong>

            <span>
              Semáforo:
              {{ resultado.semaforo }}
            </span>
          </template>
        </div>
      </form>

      <!-- ===================================
           HISTORIAL
      ==================================== -->

      <details
        v-if="configuracion.metodologias.length"
        class="historial"
      >
        <summary>
          Versiones guardadas
          ({{ configuracion.metodologias.length }})
        </summary>

        <article
          v-for="metodologia in configuracion.metodologias"
          :key="metodologia.id"
        >
          <h3>
            Versión {{ metodologia.version }}
          </h3>

          <p>
            {{
              new Date(
                metodologia.creadoEn
              ).toLocaleString('es-MX', {
                timeZone: 'America/Mexico_City'
              })
            }}

            · Administrador ID
            {{ metodologia.creadoPor }}
          </p>

          <p>
            P =
            {{
              metodologia.contexto.variables.find(
                variable =>
                  variable.id ===
                  metodologia.regla.numeradorId
              )?.codigo || '?'
            }}
            /
            {{
              metodologia.contexto.variables.find(
                variable =>
                  variable.id ===
                  metodologia.regla.denominadorId
              )?.codigo || '?'
            }}
            × 100

            · {{ metodologia.contexto.frecuencia }}
          </p>

          <p>
            Amarillo desde
            {{ metodologia.regla.amarilloDesde }} %
            · Verde desde
            {{ metodologia.regla.verdeDesde }} %
          </p>

          <ul>
            <li
              v-for="variable in metodologia.contexto.variables"
              :key="variable.id"
            >
              {{ variable.codigo }}:
              {{
                variable.dependenciaNombre ||
                'Sin asignar'
              }}
            </li>
          </ul>
        </article>
      </details>

    </template>
  </section>
</template>

<style scoped>
/* ============================================
   ESTRUCTURA GENERAL
============================================ */

.metodologia-indicador > .panel-header {
  margin-top: 24px;
}

.metodologia-indicador .nota {
  margin: 16px 0;
  line-height: 1.6;
}

.metodologia-indicador .error p {
  margin: 0 0 12px;
}

.enlace-regresar {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

/* ============================================
   SECCIONES
============================================ */

.referencia-documental,
.preparacion-asistida,
.compatibilidad-metodo {
  margin: 24px 0;
  padding: 22px;
  border: 1px solid #e2e6eb;
  border-radius: 12px;
  background: #fff;
}

.referencia-documental {
  background: #fbfaf9;
}

.preparacion-asistida {
  border-color: #dce6ef;
}

.seccion-titulo {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 20px;
}

.seccion-titulo h3 {
  margin: 5px 0 8px;
  color: #70273b;
  font-size: 18px;
  font-weight: 800;
}

.seccion-titulo p {
  margin: 0;
  color: #64707d;
  font-size: 13px;
  line-height: 1.7;
}

.etiqueta {
  color: #245a81;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
}

/* ============================================
   REFERENCIA DOCUMENTAL
============================================ */

.referencia-grid {
  display: grid;
  grid-template-columns:
    repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.referencia-bloque {
  min-width: 0;
  padding: 17px;
  border: 1px solid #e8e5e3;
  border-radius: 10px;
  background: #fff;
}

.referencia-label {
  display: block;
  margin-bottom: 11px;
  color: #70273b;
  font-size: 11px;
  font-weight: 800;
}

.referencia-texto {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  color: #343b45;
  font: inherit;
  font-size: 13px;
  line-height: 1.8;
}

.referencia-bloque p {
  margin: 0;
  color: #343b45;
  font-size: 13px;
}

.referencia-aclaracion {
  display: block;
  margin-top: 8px;
  color: #77818b;
  font-size: 11px;
}

/* ============================================
   COMPATIBILIDAD
============================================ */

.estado-compatibilidad {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}

.estado-compatibilidad.es-compatible {
  background: #eaf7f0;
  color: #24624c;
}

.estado-compatibilidad.no-compatible {
  background: #fff4e7;
  color: #946126;
}

.compatibilidad-resumen {
  display: grid;
  grid-template-columns:
    repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.compatibilidad-resumen > div {
  display: grid;
  gap: 8px;
  min-width: 0;
  padding: 14px;
  border: 1px solid #e6ebef;
  border-radius: 10px;
  background: #f5f7fa;
}

.compatibilidad-resumen span {
  color: #757b85;
  font-size: 11px;
}

.compatibilidad-resumen strong {
  color: #245a81;
  font-size: 18px;
  font-weight: 800;
}

/* ============================================
   PROPUESTA DOCUMENTAL
============================================ */

.propuestas-grid {
  display: grid;
  grid-template-columns:
    repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.propuesta-bloque {
  min-width: 0;
  padding: 17px;
  border: 1px solid #e0e5eb;
  border-radius: 10px;
  background: #fafbfc;
}

.propuesta-bloque p {
  margin: 8px 0;
  color: #48525d;
  font-size: 13px;
  line-height: 1.65;
}

.propuesta-acciones {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 18px;
}

.propuesta-acciones .nota {
  margin: 0;
  font-size: 11px;
}

/* ============================================
   FORMULARIOS
============================================ */

.regla-form {
  min-width: 0;
  margin: 24px 0;
  padding: 20px;
  border: 1px solid var(--line, #e3e6eb);
  border-radius: 9px;
}

.regla-form legend {
  padding: 0 6px;
  color: var(--deep, #70273b);
  font-weight: 750;
}

.regla-campos {
  display: grid;
  grid-template-columns:
    repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.regla-campos label {
  display: grid;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
}

.regla-campos input,
.regla-campos select {
  width: 100%;
  min-width: 0;
  min-height: 44px;
  padding: 12px;
  border: 1px solid var(--line, #e3e6eb);
  border-radius: 8px;
  background: #fff;
  color: #282c33;
  font: inherit;
  font-weight: 400;
}

.regla-campos input:focus-visible,
.regla-campos select:focus-visible,
.historial summary:focus-visible {
  outline: 3px solid var(--gold, #c69a4b);
  outline-offset: 2px;
}

.regla-campos input:disabled,
.regla-campos select:disabled {
  background: #f0f1f3;
  color: #6b7280;
}

.subtitulo-responsables {
  margin: 24px 0 8px;
  color: #70273b;
  font-size: 13px;
}

.responsables {
  padding-left: 20px;
  line-height: 1.8;
  font-size: 13px;
}

.acciones-formulario {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 20px;
}

/* ============================================
   RESULTADO DE SIMULACIÓN
============================================ */

.resultado-prueba {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border-left: 4px solid var(--blue, #245a81);
  background: var(--blue-light, #eef5fa);
  color: #245a81;
  font-size: 13px;
}

/* ============================================
   HISTORIAL
============================================ */

.historial {
  margin: 25px 0;
  padding: 15px 20px;
  border: 1px solid #e3e6eb;
  border-radius: 10px;
  background: #fff;
}

.historial summary {
  min-height: 44px;
  padding: 12px 0;
  cursor: pointer;
  color: #70273b;
  font-weight: 800;
}

.historial article {
  padding: 17px 0;
  border-top: 1px solid #e3e6eb;
}

.historial article h3 {
  color: #245a81;
  font-size: 14px;
}

.historial article p {
  margin: 8px 0;
  overflow-wrap: anywhere;
}

.historial article ul {
  padding-left: 20px;
  line-height: 1.8;
}

/* ============================================
   RESPONSIVO
============================================ */

@media (max-width: 800px) {
  .referencia-grid,
  .propuestas-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 650px) {
  .referencia-documental,
  .preparacion-asistida,
  .compatibilidad-metodo {
    padding: 15px;
  }

  .regla-campos {
    grid-template-columns: 1fr;
  }

  .regla-form {
    padding: 14px;
  }

  .compatibilidad-resumen {
    gap: 8px;
  }

  .compatibilidad-resumen > div {
    padding: 12px 9px;
  }

  .compatibilidad-resumen span {
    font-size: 10px;
  }

  .compatibilidad-resumen strong {
    font-size: 16px;
  }

  .seccion-titulo {
    flex-direction: column;
  }
}
</style>
