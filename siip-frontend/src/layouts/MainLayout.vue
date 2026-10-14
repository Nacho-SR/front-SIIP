<script setup lang="ts">
// Aquí irá la lógica del menú lateral y la sesión más adelante
</script>

<template>
  <div class="min-h-screen bg-gray-50 text-ink">
    <!-- Navbar temporal para probar -->
    <header class="bg-wine text-white p-4 shadow-md flex justify-between items-center">
      <h1 class="text-xl font-bold">SIIP Salamanca - Esqueleto</h1>
      <span class="text-sm">Layout Principal</span>
    </header>

    <!-- Contenedor principal donde se inyectan las vistas hijas -->
    <main class="p-6">
      <router-view></router-view>
    </main>
  </div>
</template>