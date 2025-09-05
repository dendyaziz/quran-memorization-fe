<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: ['auth'],
})

const authStore = useAuthStore()
const quranStore = useQuranStore()

const config = useRuntimeConfig()
const apiUrl = config.public.apiBaseUrl

const populatingData = computed(() => quranStore.populatingData)
const populationPercentage = computed(() => quranStore.populationPercentage)

onMounted(async () => {
  await quranStore.loadInitialData()
})
</script>

<template>
  <h1 class="text-2xl">
    Page Title
  </h1>
  <p class="mb-4">
    {{ apiUrl }}
  </p>

  <ClientOnly>
    <p v-if="authStore.session">
      {{ authStore.session.user.email }}
    </p>
  </ClientOnly>

  <button
    id="button"
    class="btn btn-primary"
    @click="authStore.signOut()"
  >
    Logout
  </button>

  <ClientOnly>
    <div
      v-if="populatingData"
      class="p-4 text-center"
    >
      <span class="loading loading-spinner" />
      <div class="mt-4">
        <div
          v-if="populatingData"
          class="h6"
        >
          Downloading Quran Data...
        </div>

        <div
          v-if="populatingData"
          class="mt-4"
        >
          <div
            class="progress h-4"
            role="progressbar"
            aria-label="100% Progressbar"
            :aria-valuenow="populationPercentage"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <div class="progress-bar w-full font-normal">
              {{ populationPercentage }}%
            </div>
          </div>
        </div>
      </div>
    </div>
  </ClientOnly>
</template>
