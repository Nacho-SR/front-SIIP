
<script setup lang="ts">
import axios from 'axios';
import {
  computed,
  onMounted,
  reactive,
  ref,
  watch
} from 'vue';

import {
  useRoute,
  useRouter
} from 'vue-router';

import catalogo from '../consulta/data/indicadores-siip.json';

import {
  guardarIndicador,
  obtenerIndicadorAdmin,
  familiasDeAgrupacion
} from './data/admin.store';

type Seccion =
  | 'identificacion'
  | 'descripcion'
  | 'metodologia'
  | 'medicion'
  | 'evaluacion';

type TipoCampo =
  | 'text'
  | 'textarea'
  | 'select';

interface CampoDefinicion {
  clave: string;
  etiqueta: string;
  columna: number;
  tipo: TipoCampo;
  requerido?: boolean;
  opciones?: string[];
  ayuda?: string;
}

interface GrupoCampos {
  id: Seccion;
  numero: string;
  titulo: string;
  descripcion: string;
  campos: CampoDefinicion[];
}

const router = useRouter();
const route = useRoute();

const seccionActiva = ref<Seccion>('identificacion');
const error = ref('');
const mensaje = ref('');
const guardando = ref(false);
const cargandoFicha = ref(false);

const idEdicion = computed(() =>
  typeof route.query.ver === 'string'
    ? route.query.ver
    : undefined
);

// ======================================================
// OPCIONES DEL CATÁLOGO EXISTENTE
// ======================================================

const catalogoBase = catalogo as Array<{
  clave: string;
  agrupacion: string;
  familia: string;
  tipologia: string;
  ambito: string;
  dimension: string;
  nivelObjetivo: string;
  desagregacion: string;
  frecuencia: string;
  sentido: string;
}>;

function opcionesUnicas(
  campo: keyof typeof catalogoBase[number]
) {
  return [...new Set(
    catalogoBase
      .map(item => item[campo])
      .filter(Boolean)
  )].sort((a, b) =>
    a.localeCompare(b, 'es')
  );
}

// ======================================================
// DEFINICIÓN DE LOS CAMPOS DEL EXCEL
// Hoja: IPSM
// ======================================================
//
// Columnas:
// 1 = Consecutivo
// 2 = IPSM
// 3 = ID_
// 4 a 34 = información metodológica
//
// Cada propiedad se identifica por una clave
// estable, utilizada también en admin.store.ts.

const grupos: GrupoCampos[] = [
  {
    id: 'identificacion',
    numero: '01',
    titulo: 'Identificación y clasificación',
    descripcion:
      'Datos de identificación, naturaleza y clasificación del indicador.',
    campos: [
      {
        clave: 'consecutivo',
        etiqueta: 'Consecutivo',
        columna: 1,
        tipo: 'text',
        ayuda: 'Se asigna en el servidor al guardar. Puede haber saltos de numeración.'
      },
      {
        clave: 'ipsm',
        etiqueta: 'IPSM',
        columna: 2,
        tipo: 'text',
        ayuda: 'Clasificación indicada en la hoja IPSM.'
      },
      {
        clave: 'clave',
        etiqueta: 'ID_ / Clave del indicador',
        columna: 3,
        tipo: 'text',
        requerido: true,
        ayuda: 'Ejemplo: SIIP.01.F01.004'
      },
      {
        clave: 'nombre',
        etiqueta: 'Indicador',
        columna: 4,
        tipo: 'textarea',
        requerido: true
      },
      {
        clave: 'nivelObjetivo',
        etiqueta: 'Nivel de Objetivo',
        columna: 6,
        tipo: 'select',
        requerido: true,
        opciones: opcionesUnicas('nivelObjetivo')
      },
      {
        clave: 'tipologia',
        etiqueta: 'Tipo de Indicador',
        columna: 7,
        tipo: 'select',
        requerido: true,
        opciones: opcionesUnicas('tipologia')
      },
      {
        clave: 'ambito',
        etiqueta: 'Ámbito de Desempeño',
        columna: 8,
        tipo: 'select',
        requerido: true,
        opciones: opcionesUnicas('ambito')
      },
      {
        clave: 'dimension',
        etiqueta: 'Dimensión de desempeño',
        columna: 9,
        tipo: 'select',
        requerido: true,
        opciones: opcionesUnicas('dimension')
      },
      {
        clave: 'transversalidad',
        etiqueta: 'Transversalidad',
        columna: 10,
        tipo: 'textarea'
      },
      {
        clave: 'agrupacion',
        etiqueta: 'Agrupación temática',
        columna: 11,
        tipo: 'select',
        requerido: true,
        opciones: opcionesUnicas('agrupacion')
      },
      {
        clave: 'familia',
        etiqueta: 'Familia',
        columna: 12,
        tipo: 'select',
        requerido: true
      }
    ]
  },
  {
    id: 'descripcion',
    numero: '02',
    titulo: 'Descripción y justificación',
    descripcion:
      'Definición, función, procedencia y propósito del indicador.',
    campos: [
      {
        clave: 'definicion',
        etiqueta: 'Definición del indicador',
        columna: 5,
        tipo: 'textarea',
        requerido: true
      },
      {
        clave: 'funcionIndicador',
        etiqueta: 'Función del indicador',
        columna: 13,
        tipo: 'textarea'
      },
      {
        clave: 'procedencia',
        etiqueta: 'Procedencia',
        columna: 14,
        tipo: 'text'
      },
      {
        clave: 'idsOrigen',
        etiqueta: 'ID(s) de origen',
        columna: 15,
        tipo: 'text'
      },
      {
        clave: 'justificacion',
        etiqueta: 'Justificación',
        columna: 16,
        tipo: 'textarea'
      },
      {
        clave: 'objetivo',
        etiqueta: 'Objetivo del Indicador',
        columna: 17,
        tipo: 'textarea',
        requerido: true
      }
    ]
  },
  {
    id: 'metodologia',
    numero: '03',
    titulo: 'Metodología de cálculo',
    descripcion:
      'Algoritmo, variables y criterios metodológicos para procesar la información.',
    campos: [
      {
        clave: 'algoritmo',
        etiqueta: 'Algoritmo',
        columna: 18,
        tipo: 'textarea',
        requerido: true,
        ayuda:
          'Registra la expresión de cálculo establecida para el indicador.'
      },
      {
        clave: 'variables',
        etiqueta: 'Variables',
        columna: 19,
        tipo: 'textarea',
        requerido: true,
        ayuda:
          'Define cada variable y su significado, tal como se documenta en el Excel.'
      },
      {
        clave: 'unidad',
        etiqueta: 'Unidad de Medida',
        columna: 20,
        tipo: 'text',
        requerido: true
      },
      {
        clave: 'condicionAcumulacion',
        etiqueta: 'Condición de acumulación',
        columna: 21,
        tipo: 'text'
      },
      {
        clave: 'sentido',
        etiqueta: 'Sentido',
        columna: 22,
        tipo: 'select',
        requerido: true,
        opciones: opcionesUnicas('sentido')
      },
      {
        clave: 'desagregacion',
        etiqueta: 'Desagregación territorial',
        columna: 23,
        tipo: 'select',
        requerido: true,
        opciones: opcionesUnicas('desagregacion')
      },
      {
        clave: 'frecuencia',
        etiqueta: 'Frecuencia de medición',
        columna: 24,
        tipo: 'select',
        requerido: true,
        opciones: opcionesUnicas('frecuencia')
      }
    ]
  },
  {
    id: 'medicion',
    numero: '04',
    titulo: 'Medición, responsables y metas',
    descripcion:
      'Línea base, fuentes de información, responsables y compromisos de medición.',
    campos: [
      {
        clave: 'lineaBase',
        etiqueta: 'Línea base',
        columna: 25,
        tipo: 'text'
      },
      {
        clave: 'periodoLineaBase',
        etiqueta: 'Periodo de la línea base',
        columna: 26,
        tipo: 'text'
      },
      {
        clave: 'fuente',
        etiqueta: 'Medio de Verificación',
        columna: 27,
        tipo: 'textarea',
        requerido: true
      },
      {
        clave: 'unidadResponsable',
        etiqueta:
          'Unidad Responsable de Integrar y Validar el Dato',
        columna: 28,
        tipo: 'textarea',
        requerido: true
      },
      {
        clave: 'criterioInterpretacion',
        etiqueta: 'Criterio de interpretación',
        columna: 29,
        tipo: 'textarea',
        requerido: true
      },
      {
        clave: 'meta',
        etiqueta: 'Meta',
        columna: 30,
        tipo: 'text'
      },
      {
        clave: 'periodoCumplimiento',
        etiqueta: 'Periodo de Cumplimiento',
        columna: 31,
        tipo: 'text'
      }
    ]
  },
  {
    id: 'evaluacion',
    numero: '05',
    titulo: 'Semaforización y observaciones',
    descripcion:
      'Reglas de valoración, limitaciones y características territoriales.',
    campos: [
      {
        clave: 'semaforizacion',
        etiqueta: 'Semeforización',
        columna: 32,
        tipo: 'textarea',
        requerido: true,
        ayuda:
          'Transcribe las condiciones verde, amarillo y rojo que correspondan a este indicador.'
      },
      {
        clave: 'observaciones',
        etiqueta: 'Observaciones y limitaciones',
        columna: 33,
        tipo: 'textarea'
      },
      {
        clave: 'territorial',
        etiqueta: 'Territorial',
        columna: 34,
        tipo: 'text'
      }
    ]
  }
];

// ======================================================
// FORMULARIO REACTIVO
// ======================================================

const todosLosCampos = grupos.flatMap(
  grupo => grupo.campos
);

const datosIniciales = Object.fromEntries(
  todosLosCampos.map(campo => [
    campo.clave,
    ''
  ])
) as Record<string, string>;

const formulario = reactive<Record<string, string>>({
  ...datosIniciales
});

const familiasDisponibles = computed(() => familiasDeAgrupacion(formulario.agrupacion ?? ''));
watch(() => formulario.agrupacion, () => {
  if (!familiasDisponibles.value.includes(formulario.familia ?? '')) formulario.familia = '';
}, { flush: 'sync' });

// ======================================================
// INICIALIZAR NUEVO O EDICIÓN
// ======================================================

onMounted(async () => {
  if (idEdicion.value) {
    cargandoFicha.value = true;
    try {
      const existente = await obtenerIndicadorAdmin(idEdicion.value);
      Object.assign(formulario, existente.campos);
    } catch (e) {
      error.value = axios.isAxiosError(e)
        ? e.response?.data?.detail || 'No se pudo cargar la ficha. Recarga para reintentar.'
        : 'No se pudo cargar la ficha.';
    } finally { cargandoFicha.value = false; }
  }
});

// ======================================================
// NAVEGACIÓN ENTRE APARTADOS
// ======================================================

function cambiarSeccion(seccion: Seccion) {
  seccionActiva.value = seccion;
  error.value = '';

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

// ======================================================
// VERIFICAR COMPLETITUD
// ======================================================

const camposRequeridos = todosLosCampos.filter(
  campo => campo.requerido
);

const completados = computed(() =>
  camposRequeridos.filter(campo =>
    String(formulario[campo.clave] ?? '').trim()
      .length > 0
  ).length
);

const progreso = computed(() =>
  camposRequeridos.length
    ? Math.round(
        (completados.value /
          camposRequeridos.length) * 100
      )
    : 100
);

// ======================================================
// VALIDACIONES
// ======================================================

function validarFormulario(): boolean {
  error.value = '';

  for (const grupo of grupos) {
    for (const campo of grupo.campos) {
      const valor = String(
        formulario[campo.clave] ?? ''
      ).trim();

      if (campo.requerido && !valor) {
        seccionActiva.value = grupo.id;

        error.value =
          `El campo "${campo.etiqueta}" es obligatorio.`;

        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });

        return false;
      }
    }
  }

  const duplicadoBase = catalogoBase.some(
    indicador =>
      indicador.clave.toLowerCase() ===
      formulario.clave.trim().toLowerCase()
  );

  if (duplicadoBase) {
    error.value =
      'La clave ya existe en los 63 indicadores originales del SIIP.';
    seccionActiva.value = 'identificacion';
    return false;
  }

  if (!familiasDisponibles.value.includes(formulario.familia ?? '')) {
    seccionActiva.value = 'identificacion';
    error.value = 'Selecciona una familia que pertenezca a la agrupación temática.';
    return false;
  }

  return true;
}

// ======================================================
// GUARDAR INDICADOR
// ======================================================

async function guardar() {
  if (guardando.value || cargandoFicha.value || idEdicion.value) return;
  if (!validarFormulario()) return;

  guardando.value = true;
  error.value = '';

  try {
    const creado = await guardarIndicador({ ...formulario });
    Object.assign(formulario, creado.campos);
    mensaje.value = `Indicador ${creado.campos.clave} guardado en la base. Estado: inactivo.`;
    await router.push({ name: 'AdministradorNuevoIndicador', query: { ver: creado.id } });

  } catch (e) {
    error.value = axios.isAxiosError(e)
      ? e.response?.data?.detail || 'No se pudo conectar con el servidor. Puedes reintentar sin perder la ficha.'
      : e instanceof Error
      ? e.message
      : 'No se pudo guardar el indicador.';
  } finally {
    guardando.value = false;
  }
}

function volver() {
  router.push({
    name: 'AdministradorIndicadores'
  });
}
</script>

<template>
  <div class="nuevo-indicador">

    <!-- ENCABEZADO -->
    <header class="encabezado">
      <button
        type="button"
        class="volver"
        @click="volver"
      >
        ← Regresar a Indicadores
      </button>

      <span class="eyebrow">
        ADMINISTRACIÓN / CATÁLOGO METODOLÓGICO
      </span>

      <h1>
        {{
          idEdicion
            ? 'Consultar ficha del indicador'
            : 'Crear indicador'
        }}
      </h1>

      <p>
        Completa la ficha metodológica conforme
        a las columnas del Anexo 3.4 del SIIP.
      </p>
    </header>

    <p class="nota" role="status">
      La ficha se guarda en la base de datos como indicador inactivo. No activa la captura
      ni publica resultados. La edición y activación se habilitarán al definir sus reglas operativas.
    </p>

    <p v-if="mensaje" class="nota" role="status">{{ mensaje }}</p>
    <p v-if="cargandoFicha" class="nota" role="status">Cargando ficha…</p>

    <!-- PROGRESO -->
    <section class="progreso-panel">
      <div class="progreso-datos">
        <div>
          <strong>
            Avance de la ficha
          </strong>

          <span>
            {{ completados }} de
            {{ camposRequeridos.length }}
            campos obligatorios
          </span>
        </div>

        <strong class="porcentaje">
          {{ progreso }} %
        </strong>
      </div>

      <div class="progreso-barra">
        <div
          :style="{ width: `${progreso}%` }"
        ></div>
      </div>
    </section>

    <!-- PASOS -->
    <nav
      class="secciones"
      aria-label="Apartados de la ficha"
    >
      <button
        v-for="grupo in grupos"
        :key="grupo.id"
        type="button"
        class="paso"
        :class="{
          activo: seccionActiva === grupo.id
        }"
        @click="cambiarSeccion(grupo.id)"
      >
        <span>{{ grupo.numero }}</span>
        {{ grupo.titulo }}
      </button>
    </nav>

    <!-- ERROR -->
    <div
      v-if="error"
      class="error"
      role="alert"
    >
      <strong>No se pudo continuar</strong>
      <p>{{ error }}</p>
    </div>

    <!-- FORMULARIO -->
    <form
      class="panel"
      novalidate
      @submit.prevent="guardar"
    >
      <template
        v-for="grupo in grupos"
        :key="grupo.id"
      >
        <section
          v-if="seccionActiva === grupo.id"
          class="seccion"
        >
          <div class="seccion-titulo">
            <span class="eyebrow">
              APARTADO {{ grupo.numero }}
            </span>

            <h2>{{ grupo.titulo }}</h2>

            <p>
              {{ grupo.descripcion }}
            </p>
          </div>

          <div class="campos-grid">
            <label
              v-for="campo in grupo.campos"
              :key="campo.clave"
              class="campo"
              :class="{
                ancho: campo.tipo === 'textarea'
              }"
            >
              <span class="campo-etiqueta">
                {{ campo.etiqueta }}

                <span
                  v-if="campo.requerido"
                  class="requerido"
                >
                  *
                </span>
              </span>

              <small class="columna">
                Columna {{ campo.columna }} del Excel
              </small>

              <textarea
                v-if="campo.tipo === 'textarea'"
                :name="campo.clave"
                v-model="formulario[campo.clave]"
                rows="4"
                :disabled="guardando || cargandoFicha || !!idEdicion"
                :placeholder="
                  `Captura ${campo.etiqueta.toLowerCase()}`
                "
              ></textarea>

              <select
                v-else-if="campo.tipo === 'select'"
                :name="campo.clave"
                v-model="formulario[campo.clave]"
                :disabled="guardando || cargandoFicha || !!idEdicion || (campo.clave === 'familia' && !formulario.agrupacion)"
              >
                <option value="">
                  Selecciona una opción
                </option>

                <option
                  v-for="opcion in (campo.clave === 'familia' ? familiasDisponibles : campo.opciones)"
                  :key="opcion"
                  :value="opcion"
                >
                  {{ opcion }}
                </option>
              </select>

              <input
                v-else
                :name="campo.clave"
                v-model="formulario[campo.clave]"
                type="text"
                :readonly="campo.clave === 'consecutivo' || !!idEdicion"
                :disabled="guardando || cargandoFicha"
                :placeholder="
                  `Captura ${campo.etiqueta.toLowerCase()}`
                "
              />

              <small
                v-if="campo.ayuda"
                class="campo-ayuda"
              >
                {{ campo.ayuda }}
              </small>
            </label>
          </div>
        </section>
      </template>

      <!-- ACCIONES -->
      <footer class="acciones">
        <button
          type="button"
          class="btn-secundario"
          @click="volver"
        >
          {{ idEdicion ? 'Regresar' : 'Cancelar' }}
        </button>

        <button
          v-if="!idEdicion"
          type="submit"
          class="btn-principal"
          :disabled="guardando"
        >
          {{
            guardando
              ? 'Guardando...'
              : 'Guardar indicador'
          }}
        </button>
      </footer>
    </form>

    <p class="nota">
      Los campos se conservan como texto metodológico
      para respetar el contenido del Excel.
      El registro de un nuevo algoritmo no significa
      que ya esté implementado en el motor de
      cálculo de Captura.
    </p>
  </div>
</template>

<style scoped>
.nuevo-indicador {
  --wine: #70273b;
  --deep: #431c2a;
  --gold: #c69a4b;
  --muted: #777d85;
  --line: #e8e4dd;

  max-width: 1250px;
  margin: 0 auto;
  padding-bottom: 40px;
  color: #282c33;
}

.encabezado {
  margin-bottom: 22px;
}

.volver {
  display: block;
  margin-bottom: 20px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--wine);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.eyebrow {
  display: block;
  color: #a17738;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .12em;
}

h1,
h2 {
  color: var(--deep);
  font-family: Georgia, serif;
  font-weight: 500;
}

h1 {
  margin: 8px 0;
  font-size: clamp(29px, 3.5vw, 40px);
}

h2 {
  margin: 9px 0;
  font-size: 26px;
}

.encabezado p,
.seccion-titulo p {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.7;
}

.progreso-panel,
.panel {
  padding: 24px;
  border: 1px solid var(--line);
  border-radius: 15px;
  background: white;
  box-shadow: 0 12px 35px #382c260a;
}

.progreso-panel {
  margin-bottom: 18px;
}

.progreso-datos {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  margin-bottom: 13px;
}

.progreso-datos strong {
  display: block;
  color: var(--deep);
  font-size: 13px;
}

.progreso-datos span {
  display: block;
  margin-top: 5px;
  color: var(--muted);
  font-size: 11px;
}

.progreso-datos .porcentaje {
  color: var(--wine);
  font-size: 22px;
}

.progreso-barra {
  height: 9px;
  border-radius: 20px;
  background: #f1e9e9;
  overflow: hidden;
}

.progreso-barra > div {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(
    90deg,
    #70273b,
    #c69a4b
  );
  transition: width .2s;
}

/* NAVEGACIÓN */

.secciones {
  display: grid;
  grid-template-columns:
    repeat(5, minmax(0, 1fr));
  gap: 9px;
  margin-bottom: 20px;
}

.paso {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 61px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: white;
  color: #6e6570;
  text-align: left;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}

.paso span {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 25px;
  height: 25px;
  border-radius: 7px;
  background: #f3e9ec;
  color: var(--wine);
  font-size: 10px;
}

.paso.activo {
  border-color: #d4a4b4;
  color: var(--wine);
  background: #fbf0f4;
  box-shadow: 0 0 16px #70273b18;
}

/* SECCIÓN */

.seccion-titulo {
  margin-bottom: 25px;
  padding-bottom: 17px;
  border-bottom: 1px solid var(--line);
}

.campos-grid {
  display: grid;
  grid-template-columns:
    repeat(2, minmax(0, 1fr));
  gap: 19px;
}

.campo {
  display: grid;
  align-content: start;
  gap: 7px;
  min-width: 0;
}

.campo.ancho {
  grid-column: 1 / -1;
}

.campo-etiqueta {
  color: #48444a;
  font-size: 12px;
  font-weight: 800;
}

.requerido {
  color: #b83a4c;
}

.columna {
  color: #9b969c;
  font-size: 10px;
}

.campo input,
.campo select,
.campo textarea {
  width: 100%;
  min-width: 0;
  padding: 12px;
  border: 1px solid #dddcd7;
  border-radius: 9px;
  background: white;
  color: #282c33;
  font: inherit;
  font-size: 12px;
  outline: none;
}

.campo textarea {
  resize: vertical;
  line-height: 1.7;
}

.campo input:focus,
.campo select:focus,
.campo textarea:focus {
  border-color: var(--gold);
  box-shadow: 0 0 0 3px #c69a4b22;
}

.campo input:read-only {
  background: #f5f3f1;
  color: #7e797a;
}

.campo-ayuda {
  color: var(--muted);
  font-size: 10px;
  line-height: 1.6;
}

.acciones {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 11px;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid var(--line);
}

.btn-principal,
.btn-secundario {
  padding: 12px 18px;
  border-radius: 9px;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.btn-principal {
  border: 1px solid var(--wine);
  background: var(--wine);
  color: white;
}

.btn-principal:hover {
  background: var(--deep);
}

.btn-principal:disabled {
  opacity: .6;
  cursor: not-allowed;
}

.btn-secundario {
  border: 1px solid #e5d9d6;
  background: #f5eeeb;
  color: var(--wine);
}

.error {
  padding: 15px;
  margin-bottom: 18px;
  border: 1px solid #eab4bb;
  border-left: 4px solid #bd4556;
  border-radius: 10px;
  background: #fff0f2;
}

.error strong {
  color: #972c41;
  font-size: 13px;
}

.error p {
  margin: 6px 0 0;
  color: #8e3444;
  font-size: 12px;
}

.nota {
  margin-top: 18px;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.8;
}

@media (max-width: 1050px) {
  .secciones {
    grid-template-columns:
      repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 650px) {
  .secciones {
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
  }

  .campos-grid {
    grid-template-columns: 1fr;
  }

  .panel,
  .progreso-panel {
    padding: 17px;
  }

  .acciones button {
    flex: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .progreso-barra > div {
    transition: none;
  }
}
</style>
