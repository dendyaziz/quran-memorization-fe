import type { QuranAyah } from '~/types/quran'
import basmallah from '~/assets/basmallah.json'

class QuranDB {
  private db: IDBDatabase | null = null
  private readonly dbName = 'QuranCache'
  private readonly dbVersion = 1

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'))
      }

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create quran_ayah object store
        if (!db.objectStoreNames.contains('quran_ayah')) {
          const quranStore = db.createObjectStore('quran_ayah', { keyPath: 'id' })
          quranStore.createIndex('surah_id', 'surah_id', { unique: false })
        }

        // Create metadata object store
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' })
        }
      }
    })
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init()
    }
    return this.db!
  }

  // Check if data has been populated
  async isDataPopulated(): Promise<boolean> {
    const db = await this.ensureDB()
    const transaction = db.transaction(['metadata'], 'readonly')
    const store = transaction.objectStore('metadata')

    return new Promise((resolve, reject) => {
      const request = store.get('data_populated')

      request.onerror = () => reject(new Error(request.error?.message || 'Failed to check data population status'))
      request.onsuccess = () => {
        resolve(!!request.result?.value)
      }
    })
  }

  // Mark data as populated
  async markDataAsPopulated(): Promise<void> {
    const db = await this.ensureDB()
    const transaction = db.transaction(['metadata'], 'readwrite')
    const store = transaction.objectStore('metadata')

    return new Promise((resolve, reject) => {
      const request = store.put({
        key: 'data_populated',
        value: true,
        last_updated: new Date(),
      })

      request.onerror = () => reject(new Error(request.error?.message || 'Failed to mark data as populated'))
      request.onsuccess = () => resolve()
    })
  }

  // Get total count of ayahs
  async getTotalCount(): Promise<number> {
    const db = await this.ensureDB()
    const transaction = db.transaction(['quran_ayah'], 'readonly')
    const store = transaction.objectStore('quran_ayah')

    return new Promise((resolve, reject) => {
      const request = store.count()

      request.onerror = () => reject(new Error(request.error?.message || 'Failed to get total count'))
      request.onsuccess = () => resolve(request.result)
    })
  }

  // Populate data from Supabase in batches
  async populateData(onProgress?: (current: number, total: number) => void): Promise<void> {
    const batchSize = 1000
    const totalExpected = 6236
    let currentBatch = 0

    const { $supabase } = useNuxtApp()

    while (true) {
      const from = currentBatch * batchSize
      const to = from + batchSize - 1

      const { data, error } = await $supabase
        .from('quran_ayah')
        .select('*')
        .order('id', { ascending: true })
        .range(from, to)

      if (error) {
        throw new Error(`Failed to fetch data: ${error.message}`)
      }

      if (!data || data.length === 0) {
        break
      }

      // Process the data
      const processedData = data.map(ayah => ({
        ...ayah,
        words_array: ayah.words_array ? JSON.parse(ayah.words_array) : [],
      }))

      // Store in IndexedDB
      await this.storeBatch(processedData)

      currentBatch++
      const currentCount = currentBatch * batchSize

      if (onProgress) {
        onProgress(Math.min(currentCount, totalExpected), totalExpected)
      }

      // If we got less than the batch size, we're done
      if (data.length < batchSize) {
        break
      }
    }

    await this.markDataAsPopulated()
  }

  // Store a batch of ayahs
  private async storeBatch(ayahs: QuranAyah[]): Promise<void> {
    const db = await this.ensureDB()
    const transaction = db.transaction(['quran_ayah'], 'readwrite')
    const store = transaction.objectStore('quran_ayah')

    return new Promise((resolve, reject) => {
      let completed = 0
      const total = ayahs.length

      if (total === 0) {
        resolve()
        return
      }

      ayahs.forEach((ayah) => {
        const request = store.put(ayah)

        request.onerror = () => reject(new Error(request.error?.message || 'Failed to store ayah'))
        request.onsuccess = () => {
          completed++
          if (completed === total) {
            resolve()
          }
        }
      })
    })
  }

  // Inject basmallah
  injectBasmallah(ayahs: QuranAyah[]): QuranAyah[] {
    const firstAyahIndexes = ayahs
      .map((ayah, index) => ({ ayah, index }))
      .filter(({ ayah }) => ayah.ayah === 1)
      .map(({ index }) => index)
      .sort((a, b) => b - a)

    if (firstAyahIndexes.length === 0) {
      return ayahs
    }

    let result = [...ayahs]

    // Insert basmallah before each first ayah
    for (const index of firstAyahIndexes) {
      const firstAyah = result[index]

      if (!firstAyah)
        continue

      const basmallahRow: QuranAyah = {
        id: firstAyah.surah_id - 0.5,
        surah_id: firstAyah.surah_id,
        page: firstAyah.page,
        juz: firstAyah.juz,
        ...basmallah,
      }

      result = [
        ...result.slice(0, index),
        basmallahRow,
        ...result.slice(index),
      ]
    }

    return result
  }

  // Get paginated ayahs
  async getAyahs(page: number, pageSize: number = 20): Promise<QuranAyah[]> {
    const db = await this.ensureDB()
    const transaction = db.transaction(['quran_ayah'], 'readonly')
    const store = transaction.objectStore('quran_ayah')

    return new Promise((resolve, reject) => {
      const ayahs: QuranAyah[] = []
      const skip = (page - 1) * pageSize
      let count = 0
      let skipped = 0

      const request = store.openCursor()

      request.onerror = () => reject(new Error(request.error?.message || 'Failed to open cursor'))
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result

        if (cursor) {
          if (skipped < skip) {
            skipped++
            cursor.continue()
            return
          }

          if (count < pageSize) {
            ayahs.push(cursor.value)
            count++
            cursor.continue()
          }
          else {
            resolve(this.injectBasmallah(ayahs))
          }
        }
        else {
          resolve(this.injectBasmallah(ayahs))
        }
      }
    })
  }

  // Clear all data
  async clearData(): Promise<void> {
    const db = await this.ensureDB()
    const transaction = db.transaction(['quran_ayah', 'metadata'], 'readwrite')

    const quranStore = transaction.objectStore('quran_ayah')
    const metadataStore = transaction.objectStore('metadata')

    return new Promise((resolve, reject) => {
      let completed = 0
      const total = 2

      const checkComplete = () => {
        completed++
        if (completed === total) {
          resolve()
        }
      }

      const clearQuran = quranStore.clear()
      const clearMetadata = metadataStore.clear()

      clearQuran.onerror = () => reject(new Error(clearQuran.error?.message || 'Failed to clear quran data'))
      clearQuran.onsuccess = checkComplete

      clearMetadata.onerror = () => reject(new Error(clearMetadata.error?.message || 'Failed to clear metadata'))
      clearMetadata.onsuccess = checkComplete
    })
  }
}

export const quranDB = new QuranDB()
