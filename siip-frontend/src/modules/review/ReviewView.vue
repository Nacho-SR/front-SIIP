<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const filtroEstado = ref('Pendientes');

// Mock de datos replicando tu prototipo
const revisiones = ref([
  {
    id: 'SIIP.01.F01.003',
    estado: 'En revisión',
    nombre: 'Cobertura de operativos de seguridad en zonas prioritarias',
    agrupacion: '01. Seguridad pública, justicia cívica y protección civil',
    periodo: '3er trimestre 2026',
    responsable: 'Dirección General de Seguridad'
  },
  {
    id: 'SIIP.02.F16.002',
    estado: 'Observado',
    nombre: 'Porcentaje de intervenciones en servicios básicos ejecutadas...',
    agrupacion: '02. Bienestar y desarrollo social',
    periodo: '3er trimestre 2026',
    responsable: 'Dirección General de Obras Públicas...'
  },
  {
    id: 'SIIP.05.F34.004',
    estado: 'Validado',
    nombre: 'Porcentaje de aguas residuales colectadas que reciben tratamiento',
    agrupacion: '05. Servicios públicos municipales',
    periodo: 'Septiembre 2026',
    responsable: 'Comité Municipal de Agua Potable...'
  },
  {
    id: 'SIIP.07.F47.002',
    estado: 'En revisión',
    nombre: 'Porcentaje de colonias y/o localidades consideradas en el esquema...',
    agrupacion: '07. Gobierno y gestión institucional',
    periodo: '1er semestre 2026',
    responsable: 'Dirección General de Bienestar...'
  }
]);

// Lógica de filtrado en tiempo real
const revisionesFiltradas = computed(() => {
  if (filtroEstado.value === 'Todos') return revisiones.value;
  if (filtroEstado.value === 'Pendientes') {
    return revisiones.value.filter(r => r.estado === 'En revisión' || r.estado === 'Observado');
  }
  return revisiones.value.filter(r => r.estado === filtroEstado.value);
});

const getBadgeClass = (estado: string) => {
  switch (estado) {
    case 'En revisión': return 'bg-gray-100 text-ink font-bold';
    case 'Observado': return 'bg-yellow-100 text-yellow-800 font-bold';
    case 'Validado': return 'bg-green-100 text-green-800 font-bold';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const irARevision = (id: string) => {
  router.push(`/seguimiento/${id}`);
};
</script>

<template>
  <div class="max-w-7xl mx-auto">
    <!-- Encabezado del Módulo -->
    <div class="mb-6 flex justify-between items-end">
      <div>
        <h1 class="text-3xl font-bold text-wine">Módulo de Seguimiento</h1>
        <p class="text-sm text-gray-500 mt-1">Revisión, observaciones, solventación y validación de información.</p>
      </div>
      
      <!-- Filtro Rápido propuesto -->
      <div class="w-64">
        <label class="block text-xs font-bold text-ink mb-1">Filtrar por estado</label>
        <select v-model="filtroEstado" class="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-wine bg-white">
          <option value="Pendientes">Solo Pendientes (Revisión / Observados)</option>
          <option value="En revisión">En revisión</option>
          <option value="Observado">Observado</option>
          <option value="Validado">Validado</option>
          <option value="Todos">Ver Todos</option>
        </select>
      </div>
    </div>

    <!-- Tabla de Revisiones -->
    <div class="bg-white border border-gray-200 rounded shadow-sm overflow-x-auto">
      <table class="w-full text-left text-sm border-collapse whitespace-nowrap">
        <thead class="bg-gray-50 text-ink border-b border-gray-200">
          <tr>
            <th class="py-3 px-4 font-bold w-32 text-center">Estado</th>
            <th class="py-3 px-4 font-bold w-full">Indicador</th>
            <th class="py-3 px-4 font-bold">Periodo</th>
            <th class="py-3 px-4 font-bold">Responsable</th>
            <th class="py-3 px-4 font-bold text-center">Acción</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="rev in revisionesFiltradas" :key="rev.id" class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
            <td class="py-4 px-4 text-center">
              <span class="px-3 py-1 rounded-full text-xs" :class="getBadgeClass(rev.estado)">
                {{ rev.estado }}
              </span>
            </td>
            <td class="py-4 px-4">
              <p class="font-bold text-ink">{{ rev.nombre }}</p>
              <p class="text-xs text-gray-500">{{ rev.id }} · {{ rev.agrupacion }}</p>
            </td>
            <td class="py-4 px-4 text-gray-600">{{ rev.periodo }}</td>
            <td class="py-4 px-4 text-gray-600 whitespace-normal min-w-[200px] leading-tight">{{ rev.responsable }}</td>
            <td class="py-4 px-4 text-center">
              <button @click="irARevision(rev.id)" class="px-4 py-1.5 border border-gray-300 rounded text-ink font-bold hover:bg-gray-100 transition-colors text-xs shadow-sm">
                Revisar
              </button>
            </td>
          </tr>
          <tr v-if="revisionesFiltradas.length === 0">
            <td colspan="5" class="py-8 text-center text-gray-500 italic">No hay registros que coincidan con el filtro actual.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>