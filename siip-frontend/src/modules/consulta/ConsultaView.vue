<script setup lang="ts">
import { ref, computed } from 'vue';

// ==========================================
// 1. ESTADO DE LOS FILTROS
// ==========================================
const filtros = ref({
  tipologia: 'Todas',
  ambito: 'Todos',
  desagregacion: 'Todas',
  semaforo: 'Todos'
});

const limpiarFiltros = () => {
  filtros.value = { tipologia: 'Todas', ambito: 'Todos', desagregacion: 'Todas', semaforo: 'Todos' };
};

// ==========================================
// 2. MOCK DE DATOS (Estructura jerárquica)
// ==========================================
const agrupaciones = ref([
  {
    id: 1,
    clave: '01',
    nombre: 'Seguridad pública, justicia cívica y protección civil',
    semaforoGlobal: 'amarillo',
    totalIndicadores: 16,
    conteo: { v: 12, a: 3, r: 1 },
    expandido: false,
    indicadores: [] // En un caso real, aquí irían los hijos. Los omito para no alargar el código.
  },
  {
    id: 2,
    clave: '02',
    nombre: 'Bienestar y desarrollo social',
    semaforoGlobal: 'verde',
    totalIndicadores: 7,
    conteo: { v: 5, a: 2, r: 0 },
    expandido: true, // Inicia abierto como en el mockup
    indicadores: [
      { clave: 'SIIP.02.F12.002', nombre: 'Porcentaje de población objetivo del Fondo de Infraestructura Social...', tipologia: 'Estratégico', ambito: 'Productos', desagregacion: 'Colonia', semaforo: 'verde' },
      { clave: 'SIIP.02.F13.002', nombre: 'Porcentaje de población objetivo atendida mediante acciones municipales...', tipologia: 'Estratégico', ambito: 'Productos', desagregacion: 'Municipal', semaforo: 'verde' },
      { clave: 'SIIP.02.F14.001', nombre: 'Porcentaje de estudiantes de población objetivo que reciben paquetes...', tipologia: 'Estratégico', ambito: 'Productos', desagregacion: 'Colonia', semaforo: 'verde' },
      { clave: 'SIIP.02.F15.002', nombre: 'Porcentaje de población objetivo cubierta por jornadas y acciones...', tipologia: 'Estratégico', ambito: 'Productos', desagregacion: 'Municipal', semaforo: 'verde' },
      { clave: 'SIIP.02.F16.002', nombre: 'Porcentaje de intervenciones en servicios básicos ejecutadas en localidades...', tipologia: 'Gestión', ambito: 'Procesos', desagregacion: 'Municipal', semaforo: 'amarillo' },
      { clave: 'SIIP.02.F17.002', nombre: 'Variación porcentual de asistentes a eventos culturales organizados...', tipologia: 'Estratégico', ambito: 'Productos', desagregacion: 'Municipal', semaforo: 'verde' },
      { clave: 'SIIP.02.F17.003', nombre: 'Porcentaje de bienes patrimoniales salmantinos que utilizan al menos...', tipologia: 'Gestión', ambito: 'Productos', desagregacion: 'Municipal', semaforo: 'amarillo' }
    ]
  },
  {
    id: 3,
    clave: '03',
    nombre: 'Desarrollo económico y empleo',
    semaforoGlobal: 'verde',
    totalIndicadores: 7,
    conteo: { v: 5, a: 2, r: 0 },
    expandido: false,
    indicadores: []
  }
]);

const toggleAgrupacion = (id: number) => {
  const agrupacion = agrupaciones.value.find(a => a.id === id);
  if (agrupacion) {
    agrupacion.expandido = !agrupacion.expandido;
  }
};

// Utilidad para pintar los semáforos
const getSemaforoClass = (color: string) => {
  switch (color) {
    case 'verde': return 'bg-green-500';
    case 'amarillo': return 'bg-yellow-400';
    case 'rojo': return 'bg-red-500';
    default: return 'bg-gray-300';
  }
};
</script>

<template>
  <div class="max-w-7xl mx-auto">
    
    <!-- Encabezado -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-wine">Consulta por agrupaciones temáticas e indicadores</h1>
      <p class="text-sm text-gray-500 mt-1">Utilice los filtros para consultar los indicadores. Puede desplegar cada agrupación temática para ver los indicadores que la integran.</p>
    </div>

    <!-- Barra de Filtros -->
    <div class="bg-white p-4 rounded border border-gray-200 mb-4 flex flex-wrap items-end gap-4 shadow-sm">
      <div class="flex-1 min-w-[150px]">
        <label class="block text-xs font-bold text-ink mb-1">Tipología</label>
        <select v-model="filtros.tipologia" class="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-wine bg-white">
          <option>Todas</option>
          <option>Estratégico</option>
          <option>Gestión</option>
        </select>
      </div>
      <div class="flex-1 min-w-[150px]">
        <label class="block text-xs font-bold text-ink mb-1">Ámbito de desempeño</label>
        <select v-model="filtros.ambito" class="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-wine bg-white">
          <option>Todos</option>
          <option>Impacto</option>
          <option>Productos</option>
          <option>Procesos</option>
        </select>
      </div>
      <div class="flex-1 min-w-[150px]">
        <label class="block text-xs font-bold text-ink mb-1">Desagregación territorial</label>
        <select v-model="filtros.desagregacion" class="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-wine bg-white">
          <option>Todas</option>
          <option>Municipal</option>
          <option>Colonia</option>
        </select>
      </div>
      <div class="flex-1 min-w-[150px]">
        <label class="block text-xs font-bold text-ink mb-1">Semáforo</label>
        <select v-model="filtros.semaforo" class="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-wine bg-white">
          <option>Todos</option>
          <option>Verde</option>
          <option>Amarillo</option>
          <option>Rojo</option>
        </select>
      </div>
      
      <!-- Botón Limpiar -->
      <div>
        <button @click="limpiarFiltros" class="flex items-center gap-2 px-4 py-2 border border-wine text-wine font-bold rounded hover:bg-wine/5 transition-colors text-sm h-[38px]">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Limpiar filtros
        </button>
      </div>
    </div>

    <!-- Metadatos de la consulta -->
    <div class="text-xs text-gray-500 mb-4">
      <strong class="text-wine text-sm">63</strong> indicadores de 63 · Información simulada para fines demostrativos.
    </div>

    <!-- Acordeón de Agrupaciones -->
    <div class="space-y-3">
      <div v-for="grupo in agrupaciones" :key="grupo.id" class="border border-gray-200 rounded shadow-sm overflow-hidden bg-white">
        
        <!-- Cabecera del Acordeón -->
        <div 
          @click="toggleAgrupacion(grupo.id)"
          class="flex items-center justify-between p-4 cursor-pointer transition-colors"
          :class="grupo.expandido ? 'bg-wine text-white' : 'hover:bg-gray-50 text-ink'"
        >
          <div class="flex items-center gap-3">
            <!-- Icono Chevron -->
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 transition-transform" :class="grupo.expandido ? 'rotate-90' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
            <h2 class="font-bold text-sm lg:text-base">{{ grupo.clave }}. {{ grupo.nombre }}</h2>
          </div>

          <div class="flex items-center gap-6">
            <!-- Semáforo Global del Grupo -->
            <div class="w-4 h-4 rounded-full shadow-inner" :class="getSemaforoClass(grupo.semaforoGlobal)"></div>
            
            <!-- Conteo de Indicadores -->
            <div class="text-right text-xs">
              <div class="font-bold leading-tight">{{ grupo.totalIndicadores }} indicadores</div>
              <div class="font-mono tracking-tighter opacity-80" :class="grupo.expandido ? 'text-white' : 'text-gray-500'">
                {{ grupo.conteo.v }} V &nbsp; {{ grupo.conteo.a }} A &nbsp; {{ grupo.conteo.r }} R
              </div>
            </div>
          </div>
        </div>

        <!-- Cuerpo del Acordeón (Tabla de Indicadores) -->
        <div v-show="grupo.expandido" class="overflow-x-auto border-t border-gray-200">
          <table class="w-full text-left border-collapse text-xs whitespace-nowrap">
            <thead class="bg-gray-50 text-ink border-b border-gray-200">
              <tr>
                <th class="py-3 px-4 font-bold">Clave</th>
                <th class="py-3 px-4 font-bold w-full">Nombre del indicador</th>
                <th class="py-3 px-4 font-bold">Tipología</th>
                <th class="py-3 px-4 font-bold">Ámbito de desempeño</th>
                <th class="py-3 px-4 font-bold">Desagregación territorial</th>
                <th class="py-3 px-4 font-bold text-center">Semáforo</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(ind, index) in grupo.indicadores" :key="ind.clave" class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td class="py-3 px-4 text-gray-500">{{ ind.clave }}</td>
                <td class="py-3 px-4 font-medium text-ink whitespace-normal min-w-[300px]">{{ ind.nombre }}</td>
                <td class="py-3 px-4">{{ ind.tipologia }}</td>
                <td class="py-3 px-4">{{ ind.ambito }}</td>
                <td class="py-3 px-4">{{ ind.desagregacion }}</td>
                <td class="py-3 px-4 flex justify-center">
                  <div class="w-4 h-4 rounded-full shadow-inner" :class="getSemaforoClass(ind.semaforo)"></div>
                </td>
              </tr>
              <!-- Mensaje si no hay datos en el mock -->
              <tr v-if="grupo.indicadores.length === 0">
                <td colspan="6" class="py-6 text-center text-gray-400 italic">Información no disponible en el demo</td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>

  </div>
</template>