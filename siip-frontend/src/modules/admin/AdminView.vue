
<script setup lang="ts">
import { useRoute } from 'vue-router';
import './admin.css';

// ============================================
// CONFIGURACIÓN DE RUTAS
// ============================================

const route = useRoute();

interface SeccionAdmin {
  nombre: string;
  ruta: string;
}

const secciones: SeccionAdmin[] = [
  {
    nombre: 'Usuarios',
    ruta: '/administrador/usuarios'
  },
  {
    nombre: 'Dependencias',
    ruta: '/administrador/dependencias'
  },
  {
    nombre: 'Indicadores',
    ruta: '/administrador/indicadores'
  },
  {
    nombre: 'Agrupaciones Temáticas',
    ruta: '/administrador/agrupaciones'
  },
  {
    nombre: 'Familias',
    ruta: '/administrador/familias'
  }
];

// ============================================
// IDENTIFICAR SECCIÓN ACTIVA
// ============================================

function activa(ruta: string): boolean {
  return (
    route.path === ruta ||
    route.path.startsWith(`${ruta}/`)
  );
}
</script>

<template>
  <div class="admin">

    <!-- =====================================
         ENCABEZADO
    ====================================== -->

    <header
      v-if="route.name !== 'AdministradorNuevoIndicador'"
      class="encabezado"
    >
      <div>
        <span class="eyebrow">
          GESTIÓN Y CONFIGURACIÓN
        </span>

        <h1>Administración</h1>

        <p>
          Gestiona usuarios, dependencias,
          indicadores, agrupaciones temáticas
          y familias del SIIP Salamanca.
        </p>
      </div>

      <span class="etiqueta">
        Acceso administrativo
      </span>
    </header>

    <!-- =====================================
         NAVEGACIÓN ADMINISTRATIVA
    ====================================== -->

    <nav
      class="admin-nav"
      aria-label="Secciones de administración"
    >
      <router-link
        v-for="seccion in secciones"
        :key="seccion.ruta"
        :to="seccion.ruta"
        :class="{
          activo: activa(seccion.ruta)
        }"
        :aria-current="
          activa(seccion.ruta)
            ? 'page'
            : undefined
        "
      >
        {{ seccion.nombre }}
      </router-link>
    </nav>

    <!-- =====================================
         CONTENIDO DE LA RUTA
    ====================================== -->

    <router-view :key="route.path" />

  </div>
</template>
