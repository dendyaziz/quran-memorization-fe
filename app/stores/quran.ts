import type { LastReadAyah, QuranAyah } from '~/types/quran'
import { defineStore } from 'pinia'
import { quranDB } from '~/lib/quranDB'

export const useQuranStore = defineStore('quran', () => {
  // State
  const ayahs = ref<QuranAyah[]>([])
  const lastReadAyah = ref<LastReadAyah>({ id: 1, ayah: 1 })
  const startLoadedPage = ref(1)
  const endLoadedPage = ref(1)
  const pageSize = ref(20)
  const totalPage = ref(0)
  const loading = ref(false)
  const initializing = ref(false)
  const populatingData = ref(false)
  const populationProgress = ref({ current: 0, total: 6236 })
  const hasMore = ref(true)
  const hasPrevious = ref(true)
  const totalCount = ref(0)
  const isInitialized = ref(false)

  // Computed
  const populationPercentage = computed(() => {
    if (populationProgress.value.total === 0)
      return 0
    return Math.round((populationProgress.value.current / populationProgress.value.total) * 100)
  })

  // Computed getter for backward compatibility
  const lastReadAyahId = computed(() => lastReadAyah.value.id)

  // Actions
  async function initialize(): Promise<void> {
    if (isInitialized.value)
      return

    try {
      initializing.value = true

      // Load last read ayah from localStorage
      const savedLastReadAyah = localStorage.getItem('lastReadAyah')
      const savedLastReadAyahId = localStorage.getItem('lastReadAyahId') // Legacy format

      if (savedLastReadAyah) {
        try {
          lastReadAyah.value = JSON.parse(savedLastReadAyah) as LastReadAyah
        }
        catch (error) {
          console.warn('Failed to parse saved last read ayah, using default:', error)
          lastReadAyah.value = { id: 1, ayah: 1 }
        }
      }
      else if (savedLastReadAyahId) {
        // Migrate from legacy format
        const ayahId: number = Number.parseInt(savedLastReadAyahId, 10)

        lastReadAyah.value = { id: Number.isNaN(ayahId) ? 1 : ayahId }
        // Save in new format and remove old format
        try {
          localStorage.set('lastReadAyah', JSON.stringify(lastReadAyah.value))
          localStorage.remove('lastReadAyahId')
        }
        catch (error) {
          console.warn('Failed to migrate lastReadAyah to LocalStorage:', error)
        }
      }

      // Initialize IndexedDB
      await quranDB.init()

      // Check if data is already populated
      const isPopulated = await quranDB.isDataPopulated()

      if (!isPopulated) {
        // Populate data for the first time
        await populateDataFromSupabase()
      }

      // Get total count
      totalCount.value = await quranDB.getTotalCount()
      totalPage.value = Math.ceil(totalCount.value / pageSize.value)

      isInitialized.value = true
    }
    catch (error) {
      console.error('Failed to initialize Quran store:', error)
      throw error
    }
    finally {
      initializing.value = false
    }
  }

  async function populateDataFromSupabase(): Promise<void> {
    try {
      populatingData.value = true
      populationProgress.value = { current: 0, total: 6236 }

      await quranDB.populateData((current: number, total: number) => {
        populationProgress.value = { current, total }
      })
    }
    catch (error) {
      console.error('Failed to populate data:', error)
      throw error
    }
    finally {
      populatingData.value = false
    }
  }

  async function loadPage(page: number): Promise<QuranAyah[]> {
    try {
      loading.value = true

      return await quranDB.getAyahs(page, pageSize.value)
    }
    catch (error) {
      console.error('Failed to load page:', error)
      throw error
    }
    finally {
      loading.value = false
    }
  }

  async function loadInitialData(): Promise<void> {
    await initialize()

    const lastReadAyahPage = Math.ceil(lastReadAyah.value.id / pageSize.value)

    const ayahData = []

    // if not the first page, load previous page
    if (lastReadAyahPage > 1) {
      const previousPageData = await loadPage(lastReadAyahPage - 1)
      ayahData.push(...previousPageData)
      startLoadedPage.value = lastReadAyahPage - 1
    }
    else {
      startLoadedPage.value = lastReadAyahPage
    }

    // load the page of the last read ayah
    const currentPageData = await loadPage(lastReadAyahPage)
    ayahData.push(...currentPageData)

    // if the last read ayah's page is not the last page, load the next page
    if (lastReadAyahPage < totalPage.value) {
      const nextPageData = await loadPage(lastReadAyahPage + 1)
      ayahData.push(...nextPageData)
      endLoadedPage.value = lastReadAyahPage + 1
    }
    else {
      endLoadedPage.value = lastReadAyahPage
    }

    ayahs.value = ayahData

    // Check if there's more data
    hasMore.value = endLoadedPage.value < totalPage.value
    hasPrevious.value = startLoadedPage.value > 1
  }

  async function loadMore(): Promise<void> {
    if (!hasMore.value || loading.value)
      return

    try {
      const nextPage = endLoadedPage.value + 1
      const newData = await loadPage(nextPage)

      if (newData.length > 0) {
        ayahs.value.push(...newData)
        endLoadedPage.value = nextPage

        // Check if there's more data
        hasMore.value = endLoadedPage.value < totalPage.value
      }
      else {
        hasMore.value = false
      }
    }
    catch (error) {
      console.error('Failed to load more data:', error)
      throw error
    }
  }

  async function loadPrevious(): Promise<void> {
    if (!hasPrevious.value || loading.value || startLoadedPage.value <= 1)
      return

    try {
      const previousPage = startLoadedPage.value - 1
      const newData = await loadPage(previousPage)

      if (newData.length > 0) {
        ayahs.value.unshift(...newData)
        startLoadedPage.value = previousPage

        // Check if there's previous data
        hasPrevious.value = previousPage > 1
      }
      else {
        hasPrevious.value = false
      }
    }
    catch (error) {
      console.error('Failed to load previous data:', error)
      throw error
    }
  }

  async function refresh(): Promise<void> {
    try {
      // Clear current data
      ayahs.value = []
      startLoadedPage.value = 1
      endLoadedPage.value = 1
      hasMore.value = true
      hasPrevious.value = true

      // Reload initial data
      await loadInitialData()
    }
    catch (error) {
      console.error('Failed to refresh data:', error)
      throw error
    }
  }

  async function clearCache(): Promise<void> {
    try {
      loading.value = true

      // Clear IndexedDB
      await quranDB.clearData()

      // Reset state
      ayahs.value = []
      startLoadedPage.value = 1
      endLoadedPage.value = 1
      hasMore.value = true
      hasPrevious.value = true
      totalCount.value = 0
      isInitialized.value = false

      // Re-initialize
      await initialize()
      await loadInitialData()
    }
    catch (error) {
      console.error('Failed to clear cache:', error)
      throw error
    }
    finally {
      loading.value = false
    }
  }

  function updateLastReadAyah(ayahId: number, ayahNumber?: number): void {
    const newLastReadAyah: LastReadAyah = { id: ayahId }
    if (ayahNumber !== undefined) {
      newLastReadAyah.ayah = ayahNumber
    }
    lastReadAyah.value = newLastReadAyah
    // Save to localStorage using Quasar LocalStorage
    try {
      localStorage.set('lastReadAyah', JSON.stringify(lastReadAyah.value))
    }
    catch (error) {
      console.warn('Failed to save lastReadAyah to LocalStorage:', error)
    }
  }

  // Reset store state
  function $reset() {
    ayahs.value = []
    lastReadAyah.value = { id: 1, ayah: 1 }
    startLoadedPage.value = 1
    endLoadedPage.value = 1
    pageSize.value = 20
    loading.value = false
    initializing.value = false
    populatingData.value = false
    populationProgress.value = { current: 0, total: 6236 }
    hasMore.value = true
    hasPrevious.value = true
    totalCount.value = 0
    isInitialized.value = false
  }

  return {
    // State
    ayahs,
    lastReadAyah,
    startLoadedPage,
    endLoadedPage,
    pageSize,
    loading,
    initializing,
    populatingData,
    populationProgress,
    hasMore,
    hasPrevious,
    totalCount,
    isInitialized,

    // Computed
    populationPercentage,
    lastReadAyahId,

    // Actions
    initialize,
    populateDataFromSupabase,
    loadPage,
    loadInitialData,
    loadMore,
    loadPrevious,
    refresh,
    clearCache,
    updateLastReadAyah,
    $reset,
  }
})
