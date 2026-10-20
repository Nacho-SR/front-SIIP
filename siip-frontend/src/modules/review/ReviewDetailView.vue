<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const observaciones = ref('');

// Simulamos la obtención de los datos usando el ID de la URL
const indicadorId = route.params.id as string;
const datosReportados = ref({
  nombre: 'Cobertura de operativos de seguridad en zonas prioritarias',
  periodo: '3er trimestre 2026',
  resultado: '84.0 %',
  semaforo: 'Amarillo',
  evidenciaUrl: '#',
  evidenciaNombre: 'evidencia_demo_periodo.pdf'
});

const volverAtras = () => {
  router.push('/seguimiento');
};

const procesarAccion = (accion: 'observado' | 'validado') => {
  if (accion === 'observado' && observaciones.value.trim() === '') {
    alert('Debe ingresar una observación para regresar el reporte.');
    return;
  }
  
  console.log(`Reporte ${accion}:`, {
    id: indicadorId,
    observacion: observaciones.value
  });
  
  // Aquí irá la llamada a la API con Axios
  // ...
  
  // Tras finalizar, regresamos al usuario a la lista
  volverAtras();
};
</script>

<template>
  <div class="max-w-5xl mx-auto">
    <!-- Botón de retorno rápido -->
    <button @click="volverAtras" class="flex items-center gap-2 text-wine font-semibold text-sm mb-6 hover:text-wine3 transition-colors">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      Volver a la lista de seguimiento
    </button>

    <div class="bg-white border border-gray-200 rounded shadow-sm p-8">
      <!-- Encabezado del Detalle -->
      <div class="mb-6">
        <h2 class="text-xl font-bold text-wine mb-1">{{ datosReportados.nombre }}</h2>
        <p class="text-sm text-gray-500">{{ indicadorId }} · {{ datosReportados.periodo }}</p>
      </div>

      <!-- Tabla de Datos Reportados -->
      <div class="border border-gray-200 rounded mb-6 text-sm">
        <div class="grid grid-cols-12 border-b border-gray-200">
          <div class="col-span-3 bg-gray-50 font-bold text-ink p-3 border-r border-gray-200">Resultado reportado</div>
          <div class="col-span-9 p-3 text-ink">{{ datosReportados.resultado }}</div>
        </div>
        <div class="grid grid-cols-12 border-b border-gray-200">
          <div class="col-span-3 bg-gray-50 font-bold text-ink p-3 border-r border-gray-200">Semáforo</div>
          <div class="col-span-9 p-3 text-ink">{{ datosReportados.semaforo }}</div>
        </div>
        <div class="grid grid-cols-12">
          <div class="col-span-3 bg-gray-50 font-bold text-ink p-3 border-r border-gray-200">Evidencia</div>
          <div class="col-span-9 p-3">
            <!-- Simulación de enlace de descarga -->
            <a :href="datosReportados.evidenciaUrl" class="text-wine font-medium hover:underline flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              {{ datosReportados.evidenciaNombre }}
            </a>
          </div>
        </div>
      </div>

      <!-- Área de Observaciones -->
      <div class="mb-6">
        <label class="block text-sm font-bold text-ink mb-2">Observación de seguimiento</label>
        <textarea 
          v-model="observaciones"
          rows="4"
          class="w-full border border-gray-300 rounded p-3 text-sm focus:outline-none focus:border-wine resize-none"
          placeholder="Ingrese sus observaciones en caso de rechazar la validación..."
        ></textarea>
      </div>

      <!-- Botones de Acción basados en la captura -->
      <div class="flex justify-end gap-3">
        <button 
          @click="procesarAccion('observado')"
          class="px-6 py-2 border border-gray-300 rounded text-ink font-bold hover:bg-gray-50 transition-colors shadow-sm"
        >
          Emitir observación
        </button>
        <button 
          @click="procesarAccion('validado')"
          class="px-6 py-2 bg-wine text-white rounded font-bold hover:bg-wine2 transition-colors shadow-sm"
        >
          Validar
        </button>
      </div>

    </div>
  </div>
</template>