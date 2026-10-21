import type { LastRegistryUpload } from '../types'

/**
 * Último archivo cargado desde este navegador. Es solo una comodidad: la API no informa qué archivo
 * se cargó ni cuándo, así que otro navegador (o una carga por script) no se ve aquí.
 */
export const LAST_UPLOAD_KEY = 'yawar.administracion.ultimoPadron'

export function readLastUpload(): LastRegistryUpload | null {
  try {
    const raw = localStorage.getItem(LAST_UPLOAD_KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<LastRegistryUpload> | null
    if (!value || typeof value.fileName !== 'string' || typeof value.loaded !== 'number' || typeof value.uploadedAt !== 'string') {
      return null
    }
    return {
      fileName: value.fileName,
      sizeBytes: value.sizeBytes ?? 0,
      rowsDetected: value.rowsDetected ?? value.loaded,
      delimiter: value.delimiter ?? ',',
      encoding: value.encoding ?? 'UTF-8',
      establishments: value.establishments ?? {},
      loaded: value.loaded,
      uploadedAt: value.uploadedAt,
    }
  } catch {
    return null
  }
}

export function writeLastUpload(value: LastRegistryUpload) {
  try {
    localStorage.setItem(LAST_UPLOAD_KEY, JSON.stringify(value))
  } catch {
    // navegador sin almacenamiento: no se recuerda, pero la carga ya se hizo
  }
}
