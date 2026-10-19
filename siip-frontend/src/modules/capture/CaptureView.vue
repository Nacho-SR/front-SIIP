<script setup lang="ts">
import { ref, computed } from 'vue';

// ==========================================
// 1. MOCK DE DATOS (Esto vendrá de Laravel en el futuro)
// ==========================================
const agrupaciones = [
  { id: 1, nombre: '01. Seguridad pública, justicia cívica y protección civil' }
];

const familias = [
  { id: 1, id_agrupacion: 1, nombre: 'F01. Incidencia delictiva' }
];

// Estructura dinámica: Cada indicador define qué variables necesita para su fórmula
const indicadores = [
  { 
    id: 'SIIP.01.F01.002', 
    id_familia: 1,
    clave: 'SIIP.01.F01.002',
    nombre: 'Variación porcentual de la incidencia delictiva',
    frecuencia: 'Mensual',
    medio_verificacion: 'Datos calculados con información del Secretariado Ejecutivo del Sistema Nacional de Seguridad Pública...',
    // Aquí definimos las variables dinámicas para renderizar los inputs
    variables: [
      { clave: 'IDPA', nombre: 'Incidencia delictiva periodo anterior' },
      { clave: 'IDA', nombre: 'Incidencia delictiva actual' }
    ]
  }
];

// ==========================================
// 2. ESTADO REACTIVO DE LOS SELECTORES
// ==========================================
const selectedAgrupacionId = ref<number | null>(null);
const selectedFamiliaId = ref<number | null>(null);
const selectedIndicadorId = ref<string | null>(null);

// Propiedad computada que nos devuelve el objeto completo del indicador seleccionado
const indicadorActivo = computed(() => {
  return indicadores.find(i => i.id === selectedIndicadorId.value) || null;
});

// ==========================================
// 3. ESTADO REACTIVO DEL FORMULARIO DE CAPTURA
// ==========================================
const periodo = ref('Septiembre 2026');
// Guardará los valores de forma dinámica ej: { 'IDPA': 1000, 'IDA': 958 }
const valoresVariables = ref<Record<string, number>>({});
const descripcion = ref('');
const archivoEvidencia = ref<File | null>(null);

// ==========================================
// 4. LÓGICA DE ARCHIVOS
// ==========================================

// Manejador estricto para aceptar solo PDF
const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    const file = target.files[0];
    if (file.type === 'application/pdf') {
      archivoEvidencia.value = file;
    } else {
      alert('Por favor, suba únicamente archivos en formato PDF.');
      target.value = ''; // Limpiar el input
    }
  }
};

const enviarSeguimiento = () => {
  console.log('Enviando datos...', {
    indicador: selectedIndicadorId.value,
    valores: valoresVariables.value,
    archivo: archivoEvidencia.value?.name
  });
  // TODO: Conectar con Axios a Laravel
};
</script>

<template>
  <div class="max-w-7xl mx-auto">
    
    <!-- Encabezado del Módulo -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-wine">Módulo de Captura</h1>
      <p class="text-sm text-gray-500 mt-1">Ejemplo de captura de variables, cálculo preliminar y envío a seguimiento.</p>
    </div>

    <!-- Grid Layout: Izquierda (Selectores) / Derecha (Captura) -->
    <div class="flex flex-col lg:flex-row gap-6 items-start">
      
      <!-- ========================================== -->
      <!-- COLUMNA IZQUIERDA: SELECTORES Y METADATOS -->
      <!-- ========================================== -->
      <div class="w-full lg:w-1/3 flex flex-col gap-6">
        
        <!-- Tarjeta de Selectores -->
        <div class="bg-white rounded-md border border-gray-200 shadow-sm p-5">
          <h2 class="text-lg font-bold text-wine mb-4">Indicador asignado</h2>
          
          <div class="space-y-4">
            <!-- 1. Agrupación -->
            <div>
              <label class="block text-xs font-bold text-ink mb-1">Agrupación temática</label>
              <select 
                v-model="selectedAgrupacionId" 
                class="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-wine bg-white"
              >
                <option :value="null">Seleccione una agrupación...</option>
                <option v-for="agrup in agrupaciones" :key="agrup.id" :value="agrup.id">
                  {{ agrup.nombre }}
                </option>
              </select>
            </div>

            <!-- 2. Familia -->
            <div>
              <label class="block text-xs font-bold text-ink mb-1">Familia de indicadores</label>
              <select 
                v-model="selectedFamiliaId" 
                :disabled="!selectedAgrupacionId"
                class="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-wine bg-white disabled:bg-gray-100"
              >
                <option :value="null">Seleccione una familia...</option>
                <option v-for="fam in familias" :key="fam.id" :value="fam.id">
                  {{ fam.nombre }}
                </option>
              </select>
            </div>

            <!-- 3. Indicador -->
            <div>
              <label class="block text-xs font-bold text-ink mb-1">Indicador específico</label>
              <select 
                v-model="selectedIndicadorId"
                :disabled="!selectedFamiliaId" 
                class="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-wine bg-white disabled:bg-gray-100"
              >
                <option :value="null">Seleccione un indicador...</option>
                <option v-for="ind in indicadores" :key="ind.id" :value="ind.id">
                  {{ ind.clave }} - {{ ind.nombre }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- Tarjeta de Información Precargada (Solo visible si hay indicador seleccionado) -->
        <div v-if="indicadorActivo" class="bg-gray-50 rounded-md border border-dashed border-gray-300 p-5 text-sm text-ink">
          <h3 class="font-bold mb-3">Información precargada</h3>
          <ul class="space-y-2">
            <li><strong>ID:</strong> {{ indicadorActivo.clave }}</li>
            <li><strong>Frecuencia:</strong> {{ indicadorActivo.frecuencia }}</li>
            <li class="pt-2 text-xs leading-relaxed">
              <strong>Medio de verificación:</strong> <br>
              {{ indicadorActivo.medio_verificacion }}
            </li>
          </ul>
        </div>

      </div>

      <!-- ========================================== -->
      <!-- COLUMNA DERECHA: FORMULARIO DE CAPTURA -->
      <!-- ========================================== -->
      <div class="w-full lg:w-2/3 bg-white rounded-md border border-gray-200 shadow-sm p-6">
        
        <h2 class="text-xl font-bold text-wine mb-6">Captura del periodo</h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <!-- Periodo Reportado -->
          <div>
            <label class="block text-xs font-bold text-ink mb-1">Periodo reportado</label>
            <input 
              v-model="periodo" 
              type="text" 
              class="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-wine" 
            />
          </div>
          <!-- Estado (Solo lectura) -->
          <div>
            <label class="block text-xs font-bold text-ink mb-1">Estado</label>
            <input 
              type="text" 
              value="En captura" 
              disabled
              class="w-full border border-gray-300 bg-gray-100 rounded p-2 text-sm text-gray-600" 
            />
          </div>
        </div>

        <!-- INYECCIÓN DINÁMICA DE VARIABLES -->
        <!-- Si se selecciona un indicador, Vue genera un input por cada variable en su fórmula -->
        <template v-if="indicadorActivo">
          <div class="space-y-5 mb-6">
            <div v-for="variable in indicadorActivo.variables" :key="variable.clave">
              <label class="block text-xs font-bold text-ink mb-1">
                {{ variable.clave }} · {{ variable.nombre }}
              </label>
              <input 
                v-model.number="valoresVariables[variable.clave]" 
                type="number" 
                class="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-wine" 
              />
            </div>
          </div>
        </template>

        <!-- Descripción y Archivo PDF -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label class="block text-xs font-bold text-ink mb-1">Descripción del avance</label>
            <textarea 
              v-model="descripcion"
              rows="3" 
              class="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-wine resize-none"
              placeholder="Ingrese el sustento cualitativo..."
            ></textarea>
          </div>
          <div>
            <label class="block text-xs font-bold text-ink mb-1">Evidencia de respaldo (Solo .PDF)</label>
            <!-- Input nativo de archivos file, restringido a PDF -->
            <input 
              type="file" 
              accept=".pdf"
              @change="handleFileUpload"
              class="w-full border border-gray-300 rounded p-1.5 text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-wine/10 file:text-wine hover:file:bg-wine/20 cursor-pointer focus:outline-none"
            />
            <p class="text-[10px] text-gray-400 mt-1">Sustento documental de la captura.</p>
          </div>
        </div>

        <!-- Botones de Acción -->
        <div class="flex justify-end gap-4 border-t border-gray-200 pt-6">
          <button class="px-6 py-2 border border-gray-300 rounded text-ink font-bold hover:bg-gray-50 transition-colors">
            Guardar borrador
          </button>
          <button 
            @click="enviarSeguimiento"
            class="px-6 py-2 bg-wine text-white rounded font-bold hover:bg-wine2 transition-colors"
          >
            Enviar a seguimiento
          </button>
        </div>

      </div>
    </div>

  </div>
</template>