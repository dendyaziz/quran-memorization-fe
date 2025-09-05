export interface QuranAyah {
  id: number
  surah_id: number
  ayah?: number
  arabic: string
  transliteration: string
  page: number
  juz: number
  position?: number
  row_number_end?: number
  row_number_start?: number
  quarter_hizb?: string
  manzil?: number
  no_tashkeel?: string
  has_asbabun?: string
  words_array: string[]
}

export interface QuranSurah {
  id: number
  surah_name: string
  arabic: string
  translate: string
  location: string
  num_ayah: number
}

export interface LastReadAyah {
  id: number
  ayah?: number
}
