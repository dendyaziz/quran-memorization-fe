<script setup lang="ts">
const config = useRuntimeConfig()
const apiUrl = config.public.apiBaseUrl
</script>

<template>
  <h1 class="text-2xl">
    Page Title
  </h1>
  <p class="mb-4">
    {{ apiUrl }}
  </p>

  <button
    id="button"
    class="btn btn-primary"
  >
    Button
  </button>
</template>
