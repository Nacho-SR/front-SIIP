<script setup lang="ts">
import { onMounted } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import { adminState, refrescarAdmin } from './data/admin.store';
const router = useRouter();
function nuevoIndicador() { void router.push({ name: 'AdministradorNuevoIndicador' }); }
function verIndicador(id: string) { void router.push({ name: 'AdministradorNuevoIndicador', query: { ver: id } }); }
async function cargarIndicadores() {
  try { await refrescarAdmin(); }
  catch (error) {
    adminState.error = axios.isAxiosError(error)
      ? error.response?.data?.detail || 'No se pudo conectar con el servidor. Intenta de nuevo.'
      : 'No se pudo cargar el catálogo de indicadores. Reintenta la carga.';
  }
}
onMounted(() => { void cargarIndicadores(); });
</script>
<template>
<section class="panel">
      <div class="panel-header">

        <div>
          <span class="eyebrow">
            CATÁLOGO METODOLÓGICO
          </span>

          <h2>Fichas de indicadores</h2>

          <p>
            Registra fichas metodológicas en la base de datos. Permanecen inactivas
            hasta configurar y verificar sus variables, asignaciones y reglas operativas.
          </p>
        </div>

        <button
          type="button"
          class="btn-principal"
          @click="nuevoIndicador"
        >
          + Nuevo indicador
        </button>
      </div>

      <p v-if="adminState.cargando" class="nota" role="status">Cargando indicadores…</p>
      <div v-else-if="adminState.error">
        <p class="error" role="alert">{{ adminState.error }}</p>
        <button type="button" class="btn-secundario" @click="cargarIndicadores">Reintentar indicadores</button>
      </div>
      <div
        v-else-if="adminState.indicadores.length"
        class="tabla-scroll tabla-indicadores"
      >
        <table>
          <thead>
            <tr>
              <th>Clave</th>
              <th>Nombre</th>
              <th>Agrupación</th>
              <th>Frecuencia</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="indicador in adminState.indicadores"
              :key="indicador.id"
            >
              <td>
                <strong>
                  {{ indicador.campos.clave }}
                </strong>
              </td>

              <td>
                {{ indicador.campos.nombre }}
              </td>

              <td>
                {{ indicador.campos.agrupacion }}
              </td>

              <td>
                {{ indicador.campos.frecuencia }}
              </td>

              <td>{{ indicador.activo ? 'Activo' : 'Inactivo' }}</td>
              <td>
                <button
                  type="button"
                  class="btn-editar"
                  @click="verIndicador(indicador.id)"
                >
                  Ver ficha
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        v-else
        class="indicadores-vacio"
      >
        <strong>
          Listo para registrar nuevos indicadores
        </strong>

        <p>
          El catálogo inicial conserva sus
          63 indicadores.

          Las fichas nuevas se guardan en la base y se muestran aquí.
          Las demostraciones anteriores de este navegador no se trasladan automáticamente.
        </p>
      </div>
    </section>
</template>
