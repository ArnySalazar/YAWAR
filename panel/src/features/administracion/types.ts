/** Delimitadores de campo admitidos al leer el padrón CSV (a la API siempre se envía con coma). */
export type CsvDelimiter = ',' | ';' | '\t'

/** Codificación con la que se leyó el archivo. A la API siempre se envía en UTF-8. */
export type SourceEncoding = 'UTF-8' | 'Windows-1252'

/** Tipo de dato declarado en el contrato de columnas (texto tal cual se muestra en la UI). */
export type ContractColumnType = 'Texto' | 'Entero' | 'Fecha ISO' | '1 o 0'

/** Una columna del CSV del padrón, tal como la pide POST /padron (COLUMNAS_PADRON en api/servicios.py). */
export interface ContractColumn {
  /** Identificador exacto de la columna en la cabecera del CSV (ej. `id_nino`). */
  name: string
  description: string
  type: ContractColumnType
  /** false = columna opcional: la API la usa si viene, pero no la exige. */
  required: boolean
  /** Valor de ejemplo usado al generar la plantilla CSV. */
  example: string
}

/** Problema detectado al validar el archivo (cabecera, fila o archivo completo). */
export interface ValidationIssue {
  /** Número de fila tal como se ve en una hoja de cálculo (la cabecera es la fila 1); null = archivo/cabecera. */
  row: number | null
  /** Columna afectada; null cuando el problema no es de un campo concreto o no se puede deducir. */
  column: string | null
  message: string
}

/** Datos básicos del archivo detectados al leerlo. */
export interface RegistryFileSummary {
  fileName: string
  sizeBytes: number
  rowsDetected: number
  delimiter: CsvDelimiter
  encoding: SourceEncoding
  /** Registros por establecimiento (`establecimiento_id` → cantidad). Un padrón puede traer varios. */
  establishments: Record<string, number>
}

/**
 * Último archivo cargado con éxito desde ESTE navegador (se guarda en localStorage como comodidad:
 * la API no informa qué archivo se cargó ni cuándo).
 */
export interface LastRegistryUpload extends RegistryFileSummary {
  /** Registros que la API confirmó (`cargados`). */
  loaded: number
  /** Fecha ISO del navegador en que se cargó. */
  uploadedAt: string
}

/** Por qué no se cargó el padrón: errores por fila (400 de la API) o un problema general. */
export type UploadFailure =
  | { kind: 'validation'; issues: ValidationIssue[] }
  | { kind: 'general'; message: string }

/** Registro mostrado en la vista previa local (el teléfono siempre enmascarado). */
export interface PreviewRecord {
  rowNumber: number
  childId: string
  establishment: string
  caregiverAlias: string
  /** Teléfono ya enmascarado para mostrar (ej. `+51 984 *** 449`). */
  maskedPhone: string
  ageMonths: string
  area: string
  /** Altitud en msnm. */
  altitude: string
  credControls: string
  /** Última entrega de hierro (AAAA-MM-DD). */
  lastIronDelivery: string
  /** Estado sintáctico de la fila. */
  valid: boolean
}

/** Resultado de la validación local (en el navegador) de un archivo seleccionado. */
export interface RegistryValidationReport {
  summary: RegistryFileSummary
  ok: boolean
  validRows: number
  /** Errores encontrados (lista acotada; ver `errorCount` para el total). */
  errors: ValidationIssue[]
  errorCount: number
  preview: PreviewRecord[]
  /** CSV limpio que se envía a la API (UTF-8, coma, valores normalizados); null si el archivo no es válido. */
  cleanCsv: string | null
  /**
   * Fila del archivo original de cada registro del CSV limpio (rowMap[0] = fila del 1.er registro).
   * Sirve para traducir la "fila N" que responde la API a la fila que ve la persona en su archivo.
   */
  rowMap: number[]
}

/** Una fila de la lista imprimible de la semana. */
export interface PrintableRow {
  order: number
  code: string
  caregiverAlias: string
  ageMonths: number
  action: 'Visita' | 'WhatsApp'
  reasons: string
}

/** Hora del servidor (Lima) lista para mostrar. */
export interface ServerClock {
  /** "21/10/2026" */
  date: string
  /** "10:00" */
  time: string
  /** "Semana 43 · 19 – 25 oct 2026" */
  week: string
}
