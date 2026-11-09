
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../../store/auth.store';
import { MOTIVO_OPERACION_PENDIENTE, estadoPeriodo } from '../../core/operacion-pendiente';

import catalogo from '../consulta/data/indicadores-siip.json';
import configuraciones from '../capture/data/campos-captura-siip.json';

import { buscarExpediente } from './data/seguimiento.store';

import type {
  AccionSeguimiento,
  ExpedienteSeguimiento
} from './data/seguimiento.store';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

interface Indicador {
  clave: string;
  nombre: string;
  algoritmo: string;
  unidad: string;
  frecuencia: string;
  sentido: string;
  fuente: string;
  agrupacion: string;
  familia: string;
}

interface Campo {
  clave: string;
  descripcion: string;
}

interface Configuracion {
  tipo: string;
  campos: Campo[];
  advertencia?: string;
}

type ColorSemaforo =
  | 'verde'
  | 'amarillo'
  | 'rojo'
  | 'sin-color';

interface ReglaNumerica {
  tipo: 'ascendente' | 'descendente';
  verde: number;
  amarillo: number;
  verdeInclusivo?: boolean;
  amarilloInclusivo?: boolean;
}

const indicadores = catalogo as Indicador[];

const reglasCaptura = configuraciones as Record<
  string,
  Configuracion
>;

// =====================================================
// REGLAS NUMÉRICAS DEL SEMÁFORO
// =====================================================
// Umbrales basados en la demo metodológica.
// No se aplican reglas genéricas por sentido.
//
// Los indicadores que necesitan una serie histórica,
// una meta indefinida o una interpretación adicional
// se dejan "Por determinar".

const reglas: Record<string, ReglaNumerica> = {
  // SEGURIDAD
  'SIIP.01.F01.002': {
    tipo: 'descendente',
    verde: -3,
    amarillo: 3
  },
  'SIIP.01.F01.003': {
    tipo: 'ascendente',
    verde: 90,
    amarillo: 75
  },
  'SIIP.01.F02.002': {
    tipo: 'ascendente',
    verde: 90,
    amarillo: 75,
    amarilloInclusivo: false
  },
  'SIIP.01.F02.003': {
    tipo: 'ascendente',
    verde: 90,
    amarillo: 75,
    amarilloInclusivo: false
  },
  'SIIP.01.F03.003': {
    tipo: 'ascendente',
    verde: 90,
    amarillo: 75,
    amarilloInclusivo: false
  },
  'SIIP.01.F05.003': {
    tipo: 'ascendente',
    verde: 80,
    amarillo: 70,
    amarilloInclusivo: false
  },
  'SIIP.01.F06.002': {
    tipo: 'ascendente',
    verde: 90,
    amarillo: 75,
    amarilloInclusivo: false
  },
  'SIIP.01.F06.003': {
    tipo: 'descendente',
    verde: 14,
    amarillo: 20
  },
  'SIIP.01.F08.002': {
    tipo: 'ascendente',
    verde: 90,
    amarillo: 75,
    amarilloInclusivo: false
  },
  'SIIP.01.F09.003': {
    tipo: 'ascendente',
    verde: 90,
    amarillo: 75,
    amarilloInclusivo: false
  },
  'SIIP.01.F11.003': {
    tipo: 'ascendente',
    verde: 90,
    amarillo: 75,
    amarilloInclusivo: false
  },

  // BIENESTAR
  'SIIP.02.F16.002': {
    tipo: 'ascendente',
    verde: 90,
    amarillo: 75,
    amarilloInclusivo: false
  },
  'SIIP.02.F17.002': {
    tipo: 'ascendente',
    verde: 3,
    amarillo: 0,
    verdeInclusivo: false
  },
  'SIIP.02.F17.003': {
    tipo: 'ascendente',
    verde: 40,
    amarillo: 30,
    verdeInclusivo: false
  },

  // DESARROLLO ECONÓMICO
  'SIIP.03.F18.002': {
    tipo: 'ascendente',
    verde: 8,
    amarillo: 7
  },
  'SIIP.03.F19.002': {
    tipo: 'ascendente',
    verde: 4,
    amarillo: 3
  },
  'SIIP.03.F20.002': {
    tipo: 'ascendente',
    verde: 90,
    amarillo: 75,
    amarilloInclusivo: false
  },
  'SIIP.03.F21.002': {
    tipo: 'ascendente',
    verde: 270,
    amarillo: 225,
    amarilloInclusivo: false
  },

  // TERRITORIO Y MEDIO AMBIENTE
  'SIIP.04.F25.002': {
    tipo: 'ascendente',
    verde: 90,
    amarillo: 75,
    amarilloInclusivo: false
  },
  'SIIP.04.F26.002': {
    tipo: 'descendente',
    verde: 5,
    amarillo: 10,
    amarilloInclusivo: false
  },
  'SIIP.04.F27.002': {
    tipo: 'descendente',
    verde: 1,
    amarillo: 2
  },
  'SIIP.04.F28.002': {
    tipo: 'ascendente',
    verde: 90,
    amarillo: 75,
    amarilloInclusivo: false
  },
  'SIIP.04.F31.002': {
    tipo: 'ascendente',
    verde: 60,
    amarillo: 45,
    amarilloInclusivo: false
  },
  'SIIP.04.F32.002': {
    tipo: 'ascendente',
    verde: 90,
    amarillo: 75,
    amarilloInclusivo: false
  },
  'SIIP.04.F33.002': {
    tipo: 'ascendente',
    verde: 50,
    amarillo: 45,
    amarilloInclusivo: false
  },

  // SERVICIOS PÚBLICOS
  'SIIP.05.F34.003': {
    tipo: 'descendente',
    verde: 50,
    amarillo: 60,
    amarilloInclusivo: false
  },
  'SIIP.05.F34.004': {
    tipo: 'ascendente',
    verde: 75,
    amarillo: 70,
    amarilloInclusivo: false
  },
  'SIIP.05.F35.002': {
    tipo: 'ascendente',
    verde: 90,
    amarillo: 75,
    amarilloInclusivo: false
  },
  'SIIP.05.F36.002': {
    tipo: 'ascendente',
    verde: 5,
    amarillo: 3,
    amarilloInclusivo: false
  },
  'SIIP.05.F38.002': {
    tipo: 'descendente',
    verde: 5,
    amarillo: 10
  },

  // MOVILIDAD
  'SIIP.06.F42.002': {
    tipo: 'ascendente',
    verde: 90,
    amarillo: 75,
    amarilloInclusivo: false
  },

  // GOBIERNO
  'SIIP.07.F46.002': {
    tipo: 'ascendente',
    verde: 90,
    amarillo: 75,
    amarilloInclusivo: false
  },
  'SIIP.07.F48.003': {
    tipo: 'ascendente',
    verde: 90,
    amarillo: 75,
    amarilloInclusivo: false
  },
  'SIIP.07.F49.002': {
    tipo: 'ascendente',
    verde: 95,
    amarillo: 85,
    amarilloInclusivo: false
  },
  'SIIP.07.F50.001': {
    tipo: 'ascendente',
    verde: 4,
    amarillo: 3.5
  },
  'SIIP.07.F51.002': {
    tipo: 'ascendente',
    verde: 90,
    amarillo: 75,
    amarilloInclusivo: false
  },

  // FINANZAS
  'SIIP.08.F52.002': {
    tipo: 'ascendente',
    verde: 3,
    amarillo: 1.5,
    amarilloInclusivo: false
  }
};

// =====================================================
// ESTADO DEL COMPONENTE
// =====================================================

const expediente = ref<ExpedienteSeguimiento | null>(
  null
);

const comentario = ref('');
const error = ref('');
const exito = ref('');

const indicadorId = computed(() =>
  String(route.params.id ?? '')
);

const puedeOperar = computed(() => auth.isRevisor);

// =====================================================
// CARGAR EXPEDIENTE
// =====================================================

function cargarExpediente() {
  expediente.value = buscarExpediente(
    indicadorId.value
  ) ?? null;
}

onMounted(cargarExpediente);

watch(indicadorId, cargarExpediente);

// =====================================================
// FICHA DEL INDICADOR
// =====================================================

const indicador = computed(() =>
  indicadores.find(item =>
    item.clave === expediente.value?.indicadorClave
  ) ?? null
);

const configuracion = computed(() =>
  expediente.value
    ? reglasCaptura[
        expediente.value.indicadorClave
      ]
    : undefined
);

const variables = computed(() => {
  const guardadas =
    expediente.value?.variablesCaptura ?? {};

  return (configuracion.value?.campos ?? []).map(
    campo => ({
      clave: campo.clave,
      descripcion: campo.descripcion,
      valor: guardadas[campo.clave]
    })
  );
});

// =====================================================
// RESULTADO PRELIMINAR
// =====================================================

const resultado = computed(() => {
  const valor = expediente.value?.valor;

  return typeof valor === 'number' &&
    Number.isFinite(valor)
      ? valor
      : null;
});

function formatoNumero(valor: number) {
  return new Intl.NumberFormat('es-MX', {
    maximumFractionDigits: 4
  }).format(valor);
}

const resultadoFormateado = computed(() => {
  if (resultado.value === null) {
    return 'Sin resultado';
  }

  return [
    formatoNumero(resultado.value),
    indicador.value?.unidad ??
      expediente.value?.unidad ??
      ''
  ].filter(Boolean).join(' ');
});

// =====================================================
// EVALUACIÓN DEL SEMÁFORO
// =====================================================

const evaluacion = computed<{
  color: ColorSemaforo;
  titulo: string;
  descripcion: string;
}>(() => {
  if (!expediente.value || resultado.value === null) {
    return {
      color: 'sin-color',
      titulo: 'Sin resultado',
      descripcion:
        'Todavía no existe un resultado numérico para evaluar.'
    };
  }

  const clave = expediente.value.indicadorClave;
  const valor = resultado.value;

  // No atribuir certeza a cálculos metodológicamente
  // pendientes de confirmar.
  if (configuracion.value?.advertencia) {
    return {
      color: 'sin-color',
      titulo: 'Por determinar',
      descripcion:
        'La fórmula presenta una advertencia metodológica. Debe revisarse antes de asignar un semáforo.'
    };
  }

  const regla = reglas[clave];

  if (!regla) {
    return {
      color: 'sin-color',
      titulo: 'Por determinar',
      descripcion:
        'La valoración de este indicador requiere datos históricos, metas adicionales o revisión de su criterio específico.'
    };
  }

  let verde = false;
  let amarillo = false;

  if (regla.tipo === 'ascendente') {
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

  // No confundir el color con la validación oficial.
  if (verde) {
    return {
      color: 'verde',
      titulo: 'Verde preliminar',
      descripcion:
        'El resultado se encuentra dentro del rango favorable de la regla numérica configurada.'
    };
  }

  if (amarillo) {
    return {
      color: 'amarillo',
      titulo: 'Amarillo preliminar',
      descripcion:
        'El resultado se encuentra en un rango que requiere atención o seguimiento.'
    };
  }

  return {
    color: 'rojo',
    titulo: 'Rojo preliminar',
    descripcion:
      'El resultado se encuentra en un rango desfavorable según la regla numérica configurada.'
  };
});

// =====================================================
// PERMISOS DE OPERACIÓN
// =====================================================

const puedeRevisar = computed(() =>
  puedeOperar.value &&
  expediente.value?.estado === 'En revisión'
);

const puedeObservar = computed(() =>
  puedeOperar.value &&
  (
    expediente.value?.estado === 'En revisión' ||
    expediente.value?.estado === 'Revisada'
  )
);

const puedeValidar = computed(() =>
  puedeOperar.value &&
  expediente.value?.estado === 'Revisada'
);

// =====================================================
// ACCIONES DE SEGUIMIENTO
// =====================================================

function ejecutarAccion(_accion: AccionSeguimiento) {
  error.value = MOTIVO_OPERACION_PENDIENTE;
  exito.value = '';
}

const avisoValidacion = computed(() => {
  if (!expediente.value) return MOTIVO_OPERACION_PENDIENTE;
  const estadoCalendario = estadoPeriodo(expediente.value.frecuencia, expediente.value.periodo);
  if (estadoCalendario === 'invalido') return 'Falta confirmar el periodo y la frecuencia del expediente.';
  if (estadoCalendario !== 'cerrado') {
    return 'No se puede validar antes de que termine el periodo natural en America/Mexico_City.';
  }
  if (configuracion.value?.advertencia) return 'La metodología presenta advertencias pendientes de conciliación.';
  return MOTIVO_OPERACION_PENDIENTE;
});

// =====================================================
// NAVEGACIÓN
// =====================================================

function volver() {
  router.push({ name: 'Seguimiento' });
}

function formatearFecha(fecha: string) {
  const d = new Date(fecha);

  return Number.isNaN(d.getTime())
    ? '—'
    : new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(d);
}
</script>

<template>
  <div class="revision-detalle">

    <button
      type="button"
      class="volver"
      @click="volver"
    >
      ← Volver a Seguimiento
    </button>

    <!-- EXPEDIENTE NO ENCONTRADO -->
    <section
      v-if="!expediente"
      class="panel vacio"
    >
      <h2>Expediente no encontrado</h2>

      <p>
        El expediente solicitado no está disponible
        en la sesión actual.
      </p>

      <button
        class="btn-principal"
        @click="volver"
      >
        Regresar
      </button>
    </section>

    <template v-else>

      <!-- ENCABEZADO -->
      <header class="encabezado">
        <div>
          <span class="eyebrow">
            SEGUIMIENTO / REVISIÓN TÉCNICA
          </span>

          <h1>
            {{ expediente.indicadorNombre }}
          </h1>

          <p>
            {{ expediente.indicadorClave }}
            · {{ expediente.periodo }}
          </p>
        </div>

        <span class="estado-expediente">
          {{ expediente.estado }}
        </span>
      </header>

      <section class="panel" role="status">
        <strong>{{ MOTIVO_OPERACION_PENDIENTE }}</strong>
        <p>Los datos y cálculos son ejemplos locales, sin conciliación metodológica ni validación oficial.</p>
        <p>Las correcciones deberán conservar el envío anterior, sus variables, evidencia y configuración; la justificación al cierre será un flujo distinto.</p>
      </section>

      <!-- MENSAJES -->
      <div
        v-if="error"
        class="mensaje error"
        role="alert"
      >
        {{ error }}
      </div>

      <div
        v-if="exito"
        class="mensaje exito"
        role="status"
      >
        {{ exito }}
      </div>

      <!-- RESUMEN DEL EXPEDIENTE -->
      <section class="panel">
        <div class="titulo-seccion">
          <span class="eyebrow">EXPEDIENTE</span>
          <h2>Información del indicador</h2>
        </div>

        <div class="datos-grid">
          <div>
            <span>Clave</span>
            <strong>
              {{ expediente.indicadorClave }}
            </strong>
          </div>

          <div>
            <span>Periodo</span>
            <strong>{{ expediente.periodo }}</strong>
          </div>

          <div>
            <span>Frecuencia</span>
            <strong>
              {{ expediente.frecuencia }}
            </strong>
          </div>

          <div>
            <span>Última actualización</span>
            <strong>
              {{
                formatearFecha(
                  expediente.actualizadoEn
                )
              }}
            </strong>
          </div>
        </div>
      </section>

      <!-- FÓRMULA DE REFERENCIA -->
      <section class="panel">
        <div class="titulo-seccion">
          <span class="eyebrow">
            METODOLOGÍA DE CÁLCULO
          </span>

          <h2>Fórmula de referencia</h2>

          <p>
            Algoritmo establecido en el catálogo
            de indicadores del SIIP Salamanca.
          </p>
        </div>

        <div class="formula">
          {{
            indicador?.algoritmo ??
            'Algoritmo no disponible.'
          }}
        </div>

        <div
          v-if="configuracion?.advertencia"
          class="alerta-metodologica"
        >
          <strong>
            Revisión metodológica pendiente
          </strong>

          <p>
            {{ configuracion.advertencia }}
          </p>
        </div>

        <!-- VARIABLES UTILIZADAS -->
        <h3 class="subtitulo">
          Variables registradas
        </h3>

        <div
          v-if="variables.length"
          class="variables-grid"
        >
          <div
            v-for="variable in variables"
            :key="variable.clave"
            class="variable"
          >
            <div>
              <strong>
                {{ variable.clave }}
              </strong>

              <p>
                {{ variable.descripcion }}
              </p>
            </div>

            <span>
              {{
                typeof variable.valor === 'number'
                  ? formatoNumero(variable.valor)
                  : 'Sin registro'
              }}
            </span>
          </div>
        </div>

        <p v-else class="nota">
          Este expediente no contiene variables
          individuales registradas. Puede provenir
          de una captura anterior.
        </p>
      </section>

      <!-- RESULTADO Y SEMÁFORO -->
      <section
        class="panel resultado-panel"
        :class="evaluacion.color"
      >
        <div class="titulo-seccion">
          <span class="eyebrow">
            ANÁLISIS PRELIMINAR
          </span>

          <h2>
            Resultado preliminar calculado
          </h2>

          <p>
            Evaluación orientativa para uso
            del personal de Seguimiento.
          </p>
        </div>

        <div class="resultado-grid">
          <div class="resultado-valor">
            <span>VALOR DEL INDICADOR</span>

            <strong>
              {{ resultadoFormateado }}
            </strong>

            <small>
              Resultado registrado en el expediente.
            </small>
          </div>

          <div class="semaforo">
            <span>POSIBLE SEMÁFORO</span>

            <div class="semaforo-estado">
              <span class="semaforo-circulo"></span>

              <strong>
                {{ evaluacion.titulo }}
              </strong>
            </div>

            <p>
              {{ evaluacion.descripcion }}
            </p>
          </div>
        </div>

        <div class="aviso-preliminar">
          El semáforo mostrado es una propuesta
          automática. No constituye validación
          oficial ni modifica el estado del expediente.
        </div>
      </section>

      <!-- EVIDENCIA Y OBSERVACIONES -->
      <section class="panel">
        <div class="titulo-seccion">
          <span class="eyebrow">
            RESPALDO DOCUMENTAL
          </span>

          <h2>
            Evidencia y observaciones
          </h2>
        </div>

        <div class="datos-grid">
          <div>
            <span>Evidencia PDF declarada</span>

            <strong>
              {{
                expediente.evidenciaNombre ||
                'Sin evidencia'
              }}
            </strong>

            <small>
              En este prototipo únicamente
              se conserva el nombre del archivo.
            </small>
          </div>

          <div>
            <span>Estado administrativo</span>

            <strong>
              {{ expediente.estado }}
            </strong>
          </div>
        </div>

        <div class="descripcion">
          <strong>
            Observaciones de Captura
          </strong>

          <p>
            {{
              expediente.descripcion ||
              'Sin observaciones.'
            }}
          </p>
        </div>
      </section>

      <!-- HISTORIAL -->
      <section class="panel">
        <div class="titulo-seccion">
          <span class="eyebrow">
            TRAZABILIDAD
          </span>

          <h2>
            Historial del expediente
          </h2>
        </div>

        <div
          v-if="expediente.historial?.length"
          class="historial"
        >
          <div
            v-for="(evento, indice) in expediente.historial"
            :key="indice"
            class="evento"
          >
            <div class="evento-punto"></div>

            <div>
              <strong>
                {{ evento.estadoNuevo }}
              </strong>

              <span>
                {{ formatearFecha(evento.fecha) }}
              </span>

              <p>
                {{
                  evento.comentario ||
                  'Sin comentario.'
                }}
              </p>
            </div>
          </div>
        </div>

        <p v-else class="nota">
          Aún no hay operaciones de Seguimiento
          registradas para este expediente.
        </p>
      </section>

      <!-- OPERACIONES DE SEGUIMIENTO -->
      <section
        v-if="puedeOperar"
        class="panel acciones-panel"
      >
        <div class="titulo-seccion">
          <span class="eyebrow">
            OPERACIONES DE SEGUIMIENTO
          </span>

          <h2>
            Revisión del expediente
          </h2>

          <p>
            Acciones del diseño pendientes de habilitación operativa.
          </p>
        </div>

        <label class="campo-observacion">
          Comentarios de Seguimiento

          <textarea
            v-model="comentario"
            rows="4"
            placeholder="Escribe tus observaciones, aclaraciones o comentarios..."
            disabled
          ></textarea>
        </label>

        <div class="acciones">
          <button
            v-if="puedeRevisar"
            type="button"
            class="btn-secundario"
            disabled
            :title="MOTIVO_OPERACION_PENDIENTE"
            @click="ejecutarAccion('revisar')"
          >
            Marcar como revisada
          </button>

          <button
            v-if="puedeObservar"
            type="button"
            class="btn-observar"
            disabled
            :title="MOTIVO_OPERACION_PENDIENTE"
            @click="ejecutarAccion('observar')"
          >
            Emitir observación
          </button>

          <button
            v-if="puedeValidar"
            type="button"
            class="btn-principal"
            disabled
            :title="avisoValidacion"
            @click="ejecutarAccion('validar')"
          >
            Validar expediente
          </button>
        </div>

        <p class="nota">{{ avisoValidacion }}</p>

        <p
          v-if="
            !puedeRevisar &&
            !puedeObservar &&
            !puedeValidar
          "
          class="nota"
        >
          No hay operaciones disponibles
          para el estado actual.
        </p>
      </section>

    </template>
  </div>
</template>

<style scoped>
.resultado-panel.sin-color {
  background: #eaf3f9;
  color: #245a81;
}

.revision-detalle {
  --wine: #70273b;
  --deep: #431c2a;
  --gold: #c69a4b;
  --muted: #777d85;
  --line: #e8e4dd;

  max-width: 1250px;
  margin: 0 auto;
  padding-bottom: 35px;
  color: #282c33;
}

/* NAVEGACIÓN */

.volver {
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

/* ENCABEZADO */

.encabezado {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 18px;
  margin-bottom: 24px;
}

.eyebrow {
  display: block;
  color: #a17738;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .12em;
}

.encabezado h1 {
  margin: 10px 0;
  color: var(--deep);
  font-family: Georgia, serif;
  font-size: clamp(26px, 3vw, 36px);
  font-weight: 500;
}

.encabezado p {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}

.estado-expediente {
  padding: 9px 13px;
  border-radius: 20px;
  background: #f3edf0;
  color: var(--wine);
  font-size: 11px;
  font-weight: 800;
}

/* PANELES */

.panel {
  min-width: 0;
  padding: 25px;
  margin-bottom: 19px;
  border: 1px solid var(--line);
  border-radius: 15px;
  background: #fff;
  box-shadow: 0 12px 35px #382c2609;
}

.titulo-seccion {
  margin-bottom: 20px;
}

.titulo-seccion h2 {
  margin: 8px 0;
  color: var(--deep);
  font-family: Georgia, serif;
  font-size: 24px;
  font-weight: 500;
}

.titulo-seccion p {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.7;
}

/* DATOS */

.datos-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.datos-grid > div {
  min-width: 0;
  display: grid;
  gap: 6px;
  padding: 15px;
  background: #faf9f7;
  border-radius: 9px;
}

.datos-grid span,
.datos-grid small {
  color: var(--muted);
  font-size: 11px;
}

.datos-grid strong {
  color: var(--deep);
  font-size: 13px;
  overflow-wrap: anywhere;
}

/* FÓRMULA */

.formula {
  padding: 22px;
  border-left: 4px solid var(--wine);
  border-radius: 0 10px 10px 0;
  background: #f6edf0;
  color: var(--deep);
  font-size: 17px;
  font-weight: 800;
  line-height: 1.8;
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.subtitulo {
  margin: 25px 0 13px;
  color: var(--deep);
  font-size: 14px;
}

.alerta-metodologica {
  margin-top: 13px;
  padding: 15px;
  border-left: 3px solid var(--gold);
  background: #fff7e9;
  border-radius: 0 9px 9px 0;
  color: #765a2c;
  font-size: 12px;
  line-height: 1.7;
}

.alerta-metodologica p {
  margin: 6px 0 0;
}

/* VARIABLES */

.variables-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.variable {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: #faf9f7;
  border: 1px solid var(--line);
  border-radius: 10px;
}

.variable strong {
  color: var(--wine);
  font-size: 13px;
}

.variable p {
  margin: 5px 0 0;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.6;
}

.variable > span {
  flex-shrink: 0;
  color: var(--deep);
  font-size: 17px;
  font-weight: 800;
}

/* RESULTADO PRELIMINAR */

.resultado-panel {
  position: relative;
  overflow: hidden;
  transition: border-color .2s;
}

.resultado-panel::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 5px;
  background: #a5adb5;
}

.resultado-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.resultado-valor,
.semaforo {
  padding: 22px;
  border-radius: 12px;
  background: #faf9f7;
}

.resultado-valor > span,
.semaforo > span {
  color: #737680;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .08em;
}

.resultado-valor > strong {
  display: block;
  margin: 14px 0;
  color: var(--deep);
  font-size: clamp(28px, 3vw, 39px);
}

.resultado-valor small {
  color: var(--muted);
  font-size: 11px;
}

.semaforo-estado {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 18px;
}

.semaforo-estado strong {
  font-size: 20px;
}

.semaforo-circulo {
  display: inline-block;
  width: 29px;
  height: 29px;
  border-radius: 50%;
  background: #a5adb5;
  box-shadow: 0 0 0 6px #a5adb522;
}

.semaforo p {
  margin: 13px 0 0;
  font-size: 12px;
  line-height: 1.7;
}

.aviso-preliminar {
  margin-top: 17px;
  padding: 13px;
  background: #faf8f4;
  border-radius: 9px;
  color: #6e6970;
  font-size: 11px;
  line-height: 1.7;
}

/* COLORES DEL SEMÁFORO */

.resultado-panel.verde::before {
  background: #2ca25f;
}

.resultado-panel.verde .semaforo {
  background: #e8f5ed;
}

.resultado-panel.verde .semaforo-circulo {
  background: #2ca25f;
  box-shadow: 0 0 0 6px #2ca25f22;
}

.resultado-panel.verde .semaforo-estado {
  color: #217447;
}

.resultado-panel.amarillo::before {
  background: #efb72e;
}

.resultado-panel.amarillo .semaforo {
  background: #fff8df;
}

.resultado-panel.amarillo .semaforo-circulo {
  background: #efb72e;
  box-shadow: 0 0 0 6px #efb72e22;
}

.resultado-panel.amarillo .semaforo-estado {
  color: #99700b;
}

.resultado-panel.rojo::before {
  background: #db4a4a;
}

.resultado-panel.rojo .semaforo {
  background: #fdecec;
}

.resultado-panel.rojo .semaforo-circulo {
  background: #db4a4a;
  box-shadow: 0 0 0 6px #db4a4a22;
}

.resultado-panel.rojo .semaforo-estado {
  color: #a62b2b;
}

.resultado-panel.gris .semaforo {
  background: #f1f2f4;
}

.resultado-panel.gris .semaforo-estado {
  color: #68717c;
}

/* OBSERVACIONES */

.descripcion {
  margin-top: 18px;
  padding: 15px;
  border-left: 3px solid var(--gold);
  background: #faf8f4;
  border-radius: 0 9px 9px 0;
}

.descripcion strong {
  color: var(--wine);
  font-size: 12px;
}

.descripcion p {
  margin: 8px 0 0;
  color: #5c5c62;
  font-size: 12px;
  line-height: 1.8;
  white-space: pre-line;
}

/* HISTORIAL */

.historial {
  display: grid;
  gap: 17px;
}

.evento {
  display: flex;
  gap: 13px;
}

.evento-punto {
  flex-shrink: 0;
  width: 12px;
  height: 12px;
  margin-top: 5px;
  border-radius: 50%;
  background: var(--wine);
  box-shadow: 0 0 0 5px #70273b14;
}

.evento strong {
  color: var(--deep);
  font-size: 13px;
}

.evento span {
  display: block;
  margin-top: 5px;
  color: var(--muted);
  font-size: 10px;
}

.evento p {
  margin: 7px 0 0;
  color: #5e6269;
  font-size: 12px;
  line-height: 1.7;
}

.nota {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.7;
}

/* ACCIONES */

.campo-observacion {
  display: grid;
  gap: 9px;
  color: #48444a;
  font-size: 12px;
  font-weight: 750;
}

.campo-observacion textarea {
  width: 100%;
  padding: 13px;
  border: 1px solid #dddcd7;
  border-radius: 10px;
  outline: none;
  resize: vertical;
  color: #272b32;
  font: inherit;
  font-size: 13px;
}

.campo-observacion textarea:focus {
  border-color: var(--gold);
  box-shadow: 0 0 0 3px #c69a4b22;
}

.acciones {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 19px;
}

.acciones button,
.btn-principal {
  padding: 12px 17px;
  border: 0;
  border-radius: 9px;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.acciones button:disabled {
  opacity: .5;
  cursor: not-allowed;
}

.btn-principal {
  background: var(--wine);
  color: white;
}

.btn-secundario {
  background: #f2eee9;
  color: var(--wine);
}

.btn-observar {
  background: #fff1dc;
  color: #9b651b;
}

.mensaje {
  padding: 14px;
  margin-bottom: 17px;
  border-radius: 9px;
  font-size: 12px;
  font-weight: 700;
}

.mensaje.error {
  color: #a62b2b;
  background: #fdecec;
}

.mensaje.exito {
  color: #217447;
  background: #e8f5ed;
}

.vacio {
  text-align: center;
}

.vacio h2 {
  color: var(--deep);
}

/* RESPONSIVE */

@media (max-width: 750px) {
  .datos-grid,
  .variables-grid,
  .resultado-grid {
    grid-template-columns: 1fr;
  }

  .panel {
    padding: 18px;
  }

  .variable {
    align-items: flex-start;
    flex-direction: column;
  }

  .acciones button {
    flex: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .resultado-panel {
    transition: none;
  }
}
</style>
