
<script setup lang="ts">
import {
  computed,
  onMounted,
  ref
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

interface Dependency {
  id: string;
  clave: string;
  nombre: string;
  activo: boolean;
}

interface Variable {
  id?: string;
  codigo: string;
  descripcion: string;
  unidadMedida: string;
  tipoDato: 'entero' | 'decimal';
  dependenciaId: string | null;
  dependenciaNombre?: string | null;
  dependenciaActiva?: boolean | null;
}

interface Configuration {
  indicadorId: string;
  version: number;
  variables: Variable[];
}

interface PropuestaVariable {
  codigo: string;
  descripcion: string;
  seleccionada: boolean;
  unidadMedida: string;
  tipoDato: '' | 'entero' | 'decimal';
}

// ============================================
// RUTA Y ENDPOINT
// ============================================

const route = useRoute();

const id = String(route.params.id);

const endpoint =
  '/administracion/indicadores/' +
  encodeURIComponent(id) +
  '/variables';

// ============================================
// ESTADO
// ============================================

const indicador = ref<IndicadorAdmin | null>(null);

const variables = ref<Variable[]>([]);
const dependencias = ref<Dependency[]>([]);
const propuestas = ref<PropuestaVariable[]>([]);

const version = ref(0);

const cargando = ref(true);
const cargaCompleta = ref(false);
const guardando = ref(false);

const error = ref('');
const mensaje = ref('');
const errorPropuestas = ref('');

const original = ref('');

// ============================================
// DATOS DE LA FICHA TÉCNICA
// ============================================

const variablesDocumentales = computed(() =>
  indicador.value?.campos.variables?.trim() ?? ''
);

const responsableDocumental = computed(() =>
  indicador.value?.campos.unidadResponsable?.trim() ?? ''
);

const formulaDocumental = computed(() =>
  indicador.value?.campos.algoritmo?.trim() ?? ''
);

const unidadDocumental = computed(() =>
  indicador.value?.campos.unidad?.trim() ?? ''
);

// ============================================
// ESTADO DE LA CONFIGURACIÓN
// ============================================

const puedeEditar = computed(() =>
  cargaCompleta.value &&
  !cargando.value &&
  !guardando.value &&
  !!indicador.value &&
  !indicador.value.activo
);

const totalAsignadas = computed(() =>
  variables.value.filter(
    variable => variable.dependenciaId !== null
  ).length
);

const totalSinAsignar = computed(() =>
  variables.value.filter(
    variable => variable.dependenciaId === null
  ).length
);

// ============================================
// NORMALIZACIÓN PARA GUARDAR
// ============================================

function entradas() {
  return variables.value.map(variable => ({
    ...(variable.id
      ? { id: variable.id }
      : {}),

    codigo: variable.codigo.trim().toUpperCase(),
    descripcion: variable.descripcion.trim(),
    unidadMedida: variable.unidadMedida.trim(),
    tipoDato: variable.tipoDato,
    dependenciaId: variable.dependenciaId
  }));
}

const hayCambios = computed(() =>
  JSON.stringify(entradas()) !== original.value
);

// ============================================
// MOSTRAR ERRORES
// ============================================

function errorMessage(cause: unknown): string {
  if (axios.isAxiosError(cause)) {
    return (
      cause.response?.data?.detail ||
      cause.response?.data?.message ||
      'No se pudo conectar con el servidor. ' +
      'Reintenta sin perder tus cambios.'
    );
  }

  return cause instanceof Error
    ? cause.message
    : 'No se pudo completar la operación.';
}

// ============================================
// INTERPRETACIÓN DOCUMENTAL
// ============================================

// Solo identifica líneas que comienzan
// con un código y dos puntos.
//
// No interpreta fórmulas matemáticas.
// No decide qué variable es resultado.
// No asigna dependencias automáticamente.

function extraerPropuestas(
  contenido: string
): PropuestaVariable[] {
  const encontrados: PropuestaVariable[] = [];

  const codigos = new Set<string>();

  const lineas = contenido
    .split(/\r?\n/)
    .map(linea => linea.trim())
    .filter(Boolean);

  for (const linea of lineas) {
    const coincidencia = linea.match(
      /^([A-Za-z][A-Za-z0-9_]{0,39})\s*:\s*(.+)$/
    );

    if (!coincidencia) {
      continue;
    }

    const codigo = coincidencia[1]
      .trim()
      .toUpperCase();

    const descripcion = coincidencia[2].trim();

    if (
      !descripcion ||
      descripcion.length > 2000 ||
      codigos.has(codigo)
    ) {
      continue;
    }

    codigos.add(codigo);

    encontrados.push({
      codigo,
      descripcion,
      seleccionada: false,
      unidadMedida: '',
      tipoDato: ''
    });
  }

  return encontrados;
}

// ============================================
// PROPUESTAS DISPONIBLES
// ============================================

const propuestasDisponibles = computed(() => {
  const existentes = new Set(
    variables.value.map(variable =>
      variable.codigo.trim().toUpperCase()
    )
  );

  return propuestas.value.filter(
    propuesta => !existentes.has(propuesta.codigo)
  );
});

const propuestasSeleccionadas = computed(() =>
  propuestasDisponibles.value.filter(
    propuesta => propuesta.seleccionada
  )
);

const puedeAgregarPropuestas = computed(() =>
  puedeEditar.value &&
  propuestasSeleccionadas.value.length > 0 &&
  variables.value.length +
    propuestasSeleccionadas.value.length <= 50 &&
  propuestasSeleccionadas.value.every(propuesta =>
    propuesta.unidadMedida.trim().length > 0 &&
    propuesta.unidadMedida.trim().length <= 200 &&
    propuesta.tipoDato !== ''
  )
);

// ============================================
// APLICAR RESPUESTA DEL BACKEND
// ============================================

function aplicar(data: Configuration) {
  variables.value = data.variables.map(
    variable => ({ ...variable })
  );

  version.value = data.version;

  original.value = JSON.stringify(entradas());
}

// ============================================
// CARGAR CONFIGURACIÓN
// ============================================

async function cargar() {
  if (guardando.value) return;

  cargando.value = true;
  cargaCompleta.value = false;

  error.value = '';
  mensaje.value = '';
  errorPropuestas.value = '';

  try {
    const [
      ficha,
      configuration,
      dependencies
    ] = await Promise.all([
      obtenerIndicadorAdmin(id),

      api.get<Configuration>(endpoint),

      api.get<Dependency[]>(
        '/administracion/dependencias'
      )
    ]);

    indicador.value = ficha;

    dependencias.value = dependencies.data.filter(
      dependencia => dependencia.activo
    );

    aplicar(configuration.data);

    // Preparar únicamente propuestas locales.
    // Esta operación no escribe en PostgreSQL.
    propuestas.value = extraerPropuestas(
      ficha.campos.variables ?? ''
    );

    cargaCompleta.value = true;

  } catch (cause) {
    error.value = errorMessage(cause);

  } finally {
    cargando.value = false;
  }
}

// ============================================
// AGREGAR VARIABLE MANUAL
// ============================================

function agregar() {
  if (!puedeEditar.value) return;
  if (variables.value.length >= 50) return;

  variables.value.push({
    codigo: '',
    descripcion: '',
    unidadMedida: '',
    tipoDato: 'entero',
    dependenciaId: null
  });

  mensaje.value = '';
  error.value = '';
}

// ============================================
// AGREGAR PROPUESTAS A FORMULARIO
// ============================================

function agregarPropuestas() {
  if (!puedeEditar.value) return;

  errorPropuestas.value = '';

  if (!puedeAgregarPropuestas.value) {
    errorPropuestas.value =
      'Selecciona las variables de entrada, ' +
      'indica su unidad de medida y elige ' +
      'el tipo de dato de cada una.';

    return;
  }

  const seleccionadas = [
    ...propuestasSeleccionadas.value
  ];

  for (const propuesta of seleccionadas) {
    if (!propuesta.tipoDato) continue;

    variables.value.push({
      codigo: propuesta.codigo,
      descripcion: propuesta.descripcion,
      unidadMedida: propuesta.unidadMedida.trim(),
      tipoDato: propuesta.tipoDato,
      dependenciaId: null
    });

    propuesta.seleccionada = false;
  }

  mensaje.value =
    'Se agregaron ' +
    seleccionadas.length +
    ' variables al formulario. ' +
    'Revisa sus datos, asigna responsables ' +
    'y guarda la configuración.';

  // No hay escritura en PostgreSQL aquí.
}

// ============================================
// GUARDAR VARIABLES
// ============================================

async function guardar() {
  if (
    !puedeEditar.value ||
    !indicador.value ||
    !hayCambios.value ||
    !variables.value.length
  ) {
    return;
  }

  error.value = '';
  mensaje.value = '';

  const datos = entradas();

  const codigos = datos.map(
    variable => variable.codigo
  );

  if (
    new Set(codigos).size !== codigos.length
  ) {
    error.value =
      'Cada variable debe tener un código distinto.';

    return;
  }

  if (
    datos.some(variable =>
      !/^[A-Z][A-Z0-9_]{0,39}$/.test(
        variable.codigo
      )
    )
  ) {
    error.value =
      'Revisa los códigos de las variables.';

    return;
  }

  if (
    datos.some(variable =>
      !variable.descripcion ||
      !variable.unidadMedida
    )
  ) {
    error.value =
      'Completa la descripción y unidad ' +
      'de medida de todas las variables.';

    return;
  }

  guardando.value = true;

  try {
    const { data } = await api.put<Configuration>(
      endpoint,
      {
        version: version.value,
        variables: datos
      }
    );

    aplicar(data);

    mensaje.value =
      'Variables y dependencias guardadas ' +
      'correctamente. El indicador ' +
      'continúa inactivo.';

  } catch (cause) {
    error.value = errorMessage(cause);

  } finally {
    guardando.value = false;
  }
}

// ============================================
// INICIALIZACIÓN
// ============================================

onMounted(() => {
  void cargar();
});
</script>

<template>
  <section class="panel variables-indicador">

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

        <h2>Variables y dependencias</h2>

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
          name: 'AdministradorMetodologiaIndicador',
          params: { id }
        }"
      >
        Cálculo y semáforo
      </router-link>
    </div>

    <!-- ESTADOS DE CARGA -->

    <p
      v-if="cargando"
      class="nota"
      role="status"
    >
      Cargando variables y dependencias...
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
        :disabled="guardando || cargando"
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

    <template v-if="indicador && cargaCompleta">

      <!-- ===================================
           REFERENCIA DOCUMENTAL
      ==================================== -->

      <section
        class="referencia-documental"
        aria-labelledby="titulo-referencia"
      >
        <div class="seccion-titulo">
          <div>
            <span class="etiqueta">
              FICHA TÉCNICA ORIGINAL
            </span>

            <h3 id="titulo-referencia">
              Información documental
            </h3>

            <p>
              Estos datos fueron importados del
              catálogo original y se presentan
              como referencia. No constituyen
              todavía una configuración operativa.
            </p>
          </div>
        </div>

        <div class="referencia-grid">
          <div class="referencia-bloque">
            <span class="referencia-label">
              Variables documentales
            </span>

            <pre
              v-if="variablesDocumentales"
              class="referencia-texto"
            >{{ variablesDocumentales }}</pre>

            <p v-else class="nota">
              La ficha no describe variables.
            </p>
          </div>

          <div class="referencia-lateral">

            <div class="referencia-bloque">
              <span class="referencia-label">
                Unidad responsable documental
              </span>

              <p>
                {{
                  responsableDocumental ||
                  'No especificada'
                }}
              </p>

              <span class="advertencia">
                No se asigna automáticamente.
              </span>
            </div>

            <div class="referencia-bloque">
              <span class="referencia-label">
                Fórmula original
              </span>

              <p class="texto-formula">
                {{
                  formulaDocumental ||
                  'No especificada'
                }}
              </p>
            </div>

            <div class="referencia-bloque">
              <span class="referencia-label">
                Unidad del resultado
              </span>

              <p>
                {{
                  unidadDocumental ||
                  'No especificada'
                }}
              </p>
            </div>

          </div>
        </div>
      </section>

      <!-- ===================================
           PREPARACIÓN ASISTIDA
      ==================================== -->

      <section
        v-if="propuestas.length"
        class="preparacion-asistida"
        aria-labelledby="titulo-preparacion"
      >
        <div class="seccion-titulo">
          <div>
            <span class="etiqueta">
              CONFIGURACIÓN ASISTIDA
            </span>

            <h3 id="titulo-preparacion">
              Preparar variables desde la ficha
            </h3>

            <p>
              Selecciona únicamente las
              <strong>variables de entrada</strong>
              que debe aportar una dependencia.
              No selecciones el resultado calculado
              del indicador.
            </p>
          </div>

          <span class="contador-pequeno">
            {{ propuestasDisponibles.length }}
            disponibles
          </span>
        </div>

        <div
          v-if="indicador.activo"
          class="nota"
        >
          El indicador está activo. Puedes consultar
          las propuestas, pero no modificar sus
          variables mediante este formulario.
        </div>

        <div
          v-else-if="!propuestasDisponibles.length"
          class="nota"
        >
          Las variables identificadas en la ficha
          ya están agregadas al formulario.
        </div>

        <div v-else class="propuestas-grid">

          <div
            v-for="propuesta in propuestasDisponibles"
            :key="propuesta.codigo"
            class="propuesta-card"
            :class="{
              'propuesta-seleccionada':
                propuesta.seleccionada
            }"
          >
            <label class="propuesta-opcion">
              <input
                v-model="propuesta.seleccionada"
                type="checkbox"
                :disabled="!puedeEditar"
              />

              <span class="propuesta-codigo">
                {{ propuesta.codigo }}
              </span>

              <span class="propuesta-descripcion">
                {{ propuesta.descripcion }}
              </span>
            </label>

            <div
              v-if="propuesta.seleccionada"
              class="propuesta-configuracion"
            >
              <label>
                Unidad de medida de la entrada

                <input
                  v-model="propuesta.unidadMedida"
                  type="text"
                  maxlength="200"
                  :disabled="!puedeEditar"
                  placeholder="Ej. elementos, reportes..."
                />
              </label>

              <label>
                Tipo de dato

                <select
                  v-model="propuesta.tipoDato"
                  :disabled="!puedeEditar"
                >
                  <option value="">
                    Seleccionar tipo
                  </option>

                  <option value="entero">
                    Entero
                  </option>

                  <option value="decimal">
                    Decimal
                  </option>
                </select>
              </label>
            </div>
          </div>

        </div>

        <p
          v-if="errorPropuestas"
          class="error"
          role="alert"
        >
          {{ errorPropuestas }}
        </p>

        <div
          v-if="!indicador.activo"
          class="preparacion-acciones"
        >
          <button
            type="button"
            class="btn-secundario"
            :disabled="
              !puedeAgregarPropuestas
            "
            @click="agregarPropuestas"
          >
            Agregar variables seleccionadas
            al formulario
          </button>

          <span class="nota">
            Esta acción no guarda datos
            en PostgreSQL.
          </span>
        </div>

      </section>

      <!-- ===================================
           RESUMEN OPERATIVO
      ==================================== -->

      <div class="resumen-variables">
        <div class="resumen-item">
          <span>Variables configuradas</span>
          <strong>
            {{ variables.length }}
          </strong>
        </div>

        <div class="resumen-item">
          <span>Con dependencia</span>
          <strong>
            {{ totalAsignadas }}
          </strong>
        </div>

        <div class="resumen-item">
          <span>Sin asignar</span>
          <strong>
            {{ totalSinAsignar }}
          </strong>
        </div>
      </div>

      <!-- ===================================
           CONFIGURACIÓN OPERATIVA
      ==================================== -->

      <section class="configuracion-operativa">
        <div class="seccion-titulo">
          <div>
            <span class="etiqueta">
              DATOS OPERATIVOS
            </span>

            <h3>
              Variables y responsables
            </h3>

            <p>
              Configura las entradas necesarias
              y selecciona una dependencia
              responsable para cada una.
            </p>
          </div>
        </div>

        <p
          v-if="indicador.activo"
          class="error"
        >
          Este indicador está activo. Sus
          definiciones y asignaciones requieren
          el flujo correspondiente de cambio
          de metodología.
        </p>

        <form @submit.prevent="guardar">
          <fieldset
            class="campos-form"
            :disabled="
              guardando ||
              indicador.activo ||
              !cargaCompleta
            "
          >
            <p
              v-if="!variables.length"
              class="nota"
            >
              Este indicador todavía no tiene
              variables operativas.
              Puedes prepararlas desde la ficha
              o agregarlas manualmente.
            </p>

            <fieldset
              v-for="(variable, index) in variables"
              :key="
                variable.id ??
                'nueva-' + index
              "
              class="variable-fila"
            >
              <legend>
                Variable
                {{ variable.codigo || index + 1 }}
              </legend>

              <div class="variable-campos">

                <label>
                  Código

                  <input
                    v-model="variable.codigo"
                    required
                    maxlength="40"
                    pattern="[A-Za-z][A-Za-z0-9_]{0,39}"
                    :readonly="!!variable.id"
                    placeholder="Ej. N"
                  />
                </label>

                <label>
                  Descripción

                  <textarea
                    v-model="variable.descripcion"
                    required
                    maxlength="2000"
                    rows="3"
                    :readonly="!!variable.id"
                  ></textarea>
                </label>

                <label>
                  Unidad de medida

                  <input
                    v-model="variable.unidadMedida"
                    required
                    maxlength="200"
                    :readonly="!!variable.id"
                    placeholder="Ej. reportes"
                  />
                </label>

                <label
                  :class="{
                    'campo-bloqueado': !!variable.id
                  }"
                >
                  Tipo de dato

                  <select
                    v-model="variable.tipoDato"
                    :disabled="!!variable.id"
                  >
                    <option value="entero">
                      Entero (conteos)
                    </option>

                    <option value="decimal">
                      Decimal
                    </option>
                  </select>
                </label>

                <label>
                  Dependencia responsable

                  <select
                    v-model="variable.dependenciaId"
                  >
                    <option :value="null">
                      Sin asignar
                    </option>

                    <option
                      v-if="
                        variable.dependenciaId &&
                        !dependencias.some(
                          dependency =>
                            dependency.id ===
                            variable.dependenciaId
                        )
                      "
                      :value="variable.dependenciaId"
                      disabled
                    >
                      {{
                        variable.dependenciaNombre ||
                        'Dependencia anterior'
                      }}
                      (no disponible)
                    </option>

                    <option
                      v-for="dependency in dependencias"
                      :key="dependency.id"
                      :value="dependency.id"
                    >
                      {{ dependency.clave }}
                      —
                      {{ dependency.nombre }}
                    </option>
                  </select>
                </label>

              </div>

              <button
                v-if="!variable.id"
                type="button"
                class="btn-secundario"
                @click="
                  variables.splice(index, 1)
                "
              >
                Quitar variable nueva
              </button>

              <p
                v-else
                class="nota"
              >
                Definición registrada.
                Puedes cambiar únicamente
                la dependencia responsable.
              </p>

            </fieldset>

            <button
              type="button"
              class="btn-secundario"
              :disabled="variables.length >= 50"
              @click="agregar"
            >
              + Agregar variable manualmente
            </button>

            <p
              v-if="!dependencias.length"
              class="nota"
            >
              No hay dependencias activas.
              Puedes definir variables sin
              asignación y

              <router-link
                :to="{
                  name: 'AdministradorDependencias'
                }"
              >
                registrar una dependencia
              </router-link>

              posteriormente.
            </p>

            <div class="guardar-acciones">
              <button
                type="submit"
                class="btn-principal"
                :disabled="
                  !hayCambios ||
                  !variables.length
                "
              >
                {{
                  guardando
                    ? 'Guardando...'
                    : 'Guardar variables y dependencias'
                }}
              </button>

              <span class="nota">
                Los cambios se registran
                al guardar.
              </span>
            </div>

          </fieldset>
        </form>

        <p class="nota">
          Guardar esta configuración no
          activa el indicador, no genera
          periodos de captura ni publica
          resultados.
        </p>
      </section>

    </template>
  </section>
</template>

<style scoped>
/* ============================================
   ESTRUCTURA GENERAL
============================================ */

.variables-indicador > .panel-header {
  margin-top: 24px;
}

.variables-indicador .nota {
  margin: 16px 0;
  line-height: 1.6;
}

.variables-indicador .error p {
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
.configuracion-operativa {
  margin: 22px 0;
  padding: 22px;
  border: 1px solid var(--line, #e3e6eb);
  border-radius: 13px;
  background: #fff;
}

.seccion-titulo {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
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

.contador-pequeno {
  flex-shrink: 0;
  padding: 8px 12px;
  border: 1px solid #dce5ec;
  border-radius: 20px;
  background: #f3f7fa;
  color: #245a81;
  font-size: 11px;
  font-weight: 800;
}

/* ============================================
   REFERENCIA DOCUMENTAL
============================================ */

.referencia-documental {
  background: #fbfaf9;
}

.referencia-grid {
  display: grid;
  grid-template-columns:
    minmax(0, 1.45fr)
    minmax(0, 1fr);
  gap: 16px;
}

.referencia-lateral {
  display: grid;
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

.referencia-bloque p {
  margin: 0;
  color: #3b424c;
  font-size: 13px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.referencia-texto {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font: inherit;
  font-size: 13px;
  line-height: 1.85;
  color: #343b45;
}

.texto-formula {
  white-space: pre-wrap;
}

.advertencia {
  display: inline-block;
  margin-top: 9px;
  color: #8d6332;
  font-size: 11px;
}

/* ============================================
   PROPUESTAS DE VARIABLES
============================================ */

.preparacion-asistida {
  border-color: #dce6ef;
}

.propuestas-grid {
  display: grid;
  grid-template-columns:
    repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.propuesta-card {
  min-width: 0;
  padding: 17px;
  border: 1px solid #e0e5eb;
  border-radius: 10px;
  background: #fafbfc;

  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.propuesta-seleccionada {
  border-color: #9eb8ce;
  background: #f3f7fb;
  box-shadow: 0 3px 12px rgb(36 90 129 / 7%);
}

.propuesta-opcion {
  display: grid;
  grid-template-columns: 18px 1fr;
  gap: 9px 12px;
  align-items: start;
  cursor: pointer;
}

.propuesta-opcion input {
  width: 17px;
  height: 17px;
  margin: 2px 0 0;
  accent-color: #245a81;
}

.propuesta-codigo {
  color: #70273b;
  font-size: 13px;
  font-weight: 800;
}

.propuesta-descripcion {
  grid-column: 2;
  color: #586471;
  font-size: 12px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.propuesta-configuracion {
  display: grid;
  gap: 12px;
  margin-top: 17px;
  padding-top: 15px;
  border-top: 1px solid #dce5ec;
}

.propuesta-configuracion label {
  display: grid;
  gap: 7px;
  color: #343b45;
  font-size: 12px;
  font-weight: 700;
}

.propuesta-configuracion input,
.propuesta-configuracion select {
  width: 100%;
  min-width: 0;
  padding: 11px 12px;
  border: 1px solid #ccd7e1;
  border-radius: 8px;
  background: #fff;
  color: #343b45;
  font: inherit;
  font-weight: 400;
}

.preparacion-acciones {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
}

.preparacion-acciones .nota {
  margin: 0;
  font-size: 11px;
}

/* ============================================
   CONTADORES
============================================ */

.resumen-variables {
  display: grid;
  grid-template-columns:
    repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 20px 0;
}

.resumen-item {
  display: grid;
  gap: 7px;
  min-width: 0;
  padding: 15px;
  border: 1px solid #e6ebef;
  border-radius: 10px;
  background: #f5f7fa;
}

.resumen-item span {
  color: #757b85;
  font-size: 11px;
}

.resumen-item strong {
  color: #245a81;
  font-size: 21px;
  font-weight: 800;
}

/* ============================================
   FORMULARIO
============================================ */

.variable-fila {
  margin: 0;
  padding: 20px;
  min-width: 0;
  border: 1px solid var(--line, #e3e6eb);
  border-radius: 9px;
}

.variable-fila legend {
  padding: 0 6px;
  color: var(--deep, #70273b);
  font-weight: 750;
}

.variable-campos {
  display: grid;
  grid-template-columns:
    repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.variable-campos label {
  display: grid;
  gap: 8px;
  align-content: start;
  font-size: 13px;
  font-weight: 700;
}

.variable-campos input,
.variable-campos select,
.variable-campos textarea {
  width: 100%;
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--line, #e3e6eb);
  border-radius: 8px;
  background: #fff;
  color: #282c33;
  font: inherit;
  font-weight: 400;
}

.variable-campos input:focus-visible,
.variable-campos select:focus-visible,
.variable-campos textarea:focus-visible,
.propuesta-configuracion input:focus-visible,
.propuesta-configuracion select:focus-visible {
  outline: 3px solid var(--gold, #c69a4b);
  outline-offset: 2px;
}

.variable-campos input[readonly],
.variable-campos textarea[readonly] {
  background: #faf9f7;
}

.variable-campos .campo-bloqueado {
  color: #6b7280;
}

.variable-campos select:disabled {
  background: #f0f1f3;
  border-color: #d5d8dd;
  color: #6b7280;
  opacity: 1;
  cursor: not-allowed;
}

.variable-fila > button {
  margin-top: 16px;
}

.guardar-acciones {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
}

.guardar-acciones .nota {
  margin: 0;
  font-size: 11px;
}

/* ============================================
   RESPONSIVO
============================================ */

@media (max-width: 800px) {
  .referencia-grid {
    grid-template-columns: 1fr;
  }

  .propuestas-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 650px) {
  .referencia-documental,
  .preparacion-asistida,
  .configuracion-operativa {
    padding: 15px;
  }

  .variable-campos {
    grid-template-columns: 1fr;
  }

  .variable-fila {
    padding: 14px;
  }

  .resumen-variables {
    gap: 8px;
  }

  .resumen-item {
    padding: 12px 9px;
  }

  .resumen-item span {
    font-size: 10px;
  }

  .resumen-item strong {
    font-size: 18px;
  }

  .seccion-titulo {
    flex-direction: column;
  }
}
</style>
