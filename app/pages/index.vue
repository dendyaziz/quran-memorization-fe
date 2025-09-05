<script setup lang="ts">
import {useAuthStore} from "~/stores/auth";

definePageMeta({
  middleware: ['auth']
})

const config = useRuntimeConfig()
const apiUrl = config.public.apiBaseUrl

const authStore = useAuthStore()
</script>

<template>
  <h1 class="text-2xl">
    Page Title
  </h1>
  <p class="mb-4">
    {{ apiUrl }}
  </p>

  <p v-if="authStore.session">{{ authStore.session.user.email }}</p>

  <button
    id="button"
    class="btn btn-primary"
    @click="authStore.signOut()"
  >
    Logout
  </button>
</template>
