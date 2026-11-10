<script setup lang="ts">
import { useRoute } from 'vue-router';
import './admin.css';
const route = useRoute();
const secciones = [
  { nombre: 'Usuarios', ruta: '/administrador/usuarios' },
  { nombre: 'Dependencias', ruta: '/administrador/dependencias' },
  { nombre: 'Indicadores', ruta: '/administrador/indicadores' },
];
const activa = (ruta: string) => route.path === ruta || route.path.startsWith(ruta + '/');
</script>

<template>
  <div class="admin">
    <header v-if="route.name !== 'AdministradorNuevoIndicador'" class="encabezado">
      <div>
        <span class="eyebrow">GESTIÓN Y CONFIGURACIÓN</span>
        <h1>Administración</h1>
        <p>Gestiona las cuentas, las dependencias y las fichas de indicadores del SIIP.</p>
      </div>
      <span class="etiqueta">Acceso administrativo</span>
    </header>
    <nav class="admin-nav" aria-label="Secciones de administración">
      <router-link v-for="seccion in secciones" :key="seccion.ruta" :to="seccion.ruta"
        :class="{ activo: activa(seccion.ruta) }" :aria-current="activa(seccion.ruta) ? 'page' : undefined">
        {{ seccion.nombre }}
      </router-link>
    </nav>
    <router-view />
  </div>
</template>
