<template>
  <div class="app-wrapper" :class="{ 'dark-mode': isDark }">
    <router-view />
    <Toast position="top-right" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import Toast from 'primevue/toast'

const isDark = ref(false)
</script>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.app-wrapper {
  min-height: 100vh;
  background: var(--p-surface-ground, #f8f9fa);
  font-family: 'Inter', sans-serif;
}
</style>
