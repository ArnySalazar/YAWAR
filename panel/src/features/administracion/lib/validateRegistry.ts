import type {
  ContractColumn,
  CsvDelimiter,
  PreviewRecord,
  RegistryValidationReport,
  SourceEncoding,
  ValidationIssue,
} from '../types'
import { decodeCsvBytes, detectDelimiter, parseCsv, serializeCsv } from './csv'

/** Registros que se muestran en la vista previa local. */
export const PREVIEW_LIMIT = 4
/** Tamaño máximo aceptado para el padrón (10 MB). */
export const MAX_FILE_BYTES = 10 * 1024 * 1024
/** Máximo de errores que se conservan en el reporte (el total va en `errorCount`). */
const MAX_COLLECTED_ISSUES = 500

/** Edad del programa de suplementación (6 a 35 meses). La API acepta de 0 a 59; aquí se exige el rango del programa. */
export const MIN_AGE_MONTHS = 6
export const MAX_AGE_MONTHS = 35

/** Devuelve el mensaje de error del campo o null si es válido (el valor ya llega recortado y no vacío). */
type FieldRule = (value: string) => string | null

/**
 * Reglas por columna. Cubren lo que revisa la API (edad entera, área, teléfono, fecha, altitud y
 * controles enteros) y además lo que la API deja pasar: vacíos (hallazgo 12), edades con decimales
 * (hallazgo 13) y mensajes en inglés (hallazgo 6).
 */
const FIELD_RULES: Record<string, FieldRule> = {
  id_nino: (v) =>
    /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(v) ? null : 'debe ser un código anonimizado sin espacios (ej. N0001).',
  telefono: (v) => (normalizePhone(v) ? null : 'debe ser un celular de 9 dígitos (puede llevar el prefijo +51).'),
  edad_meses: (v) => {
    const age = /^\d+$/.test(v) ? Number(v) : NaN
    return age >= MIN_AGE_MONTHS && age <= MAX_AGE_MONTHS
      ? null
      : `debe ser un número entero de meses entre ${MIN_AGE_MONTHS} y ${MAX_AGE_MONTHS}.`
  },
  area: (v) => (/^(urbano|rural)$/i.test(v) ? null : 'debe ser «urbano» o «rural».'),
  altitud_msnm: (v) => (/^\d+$/.test(v) ? null : 'debe ser un número entero de metros, sin decimales.'),
  controles_cred: (v) => (/^\d+$/.test(v) ? null : 'debe ser un número entero de controles (0 o más).'),
  fecha_entrega_hierro: (v) => (toIsoDate(v) ? null : 'debe ser una fecha válida con formato AAAA-MM-DD.'),
  acepta_mensajes: (v) => (/^[01]$/.test(v) ? null : 'debe ser 1 (acepta mensajes) o 0 (no acepta).'),
}

/** Columnas cuyo valor puede quedar vacío porque la API lo acepta así (sin entrega de hierro aún). */
const BLANK_ALLOWED = new Set(['fecha_entrega_hierro'])
/** Columnas cuyo valor nunca se repite en los mensajes de error (privacidad). */
const HIDDEN_VALUES = new Set(['telefono'])

/** Devuelve los 9 dígitos del celular (acepta espacios, guiones, paréntesis y prefijo +51 o 51) o null. */
export function normalizePhone(value: string): string | null {
  const match = /^(?:\+?51)?(\d{9})$/.exec(value.replace(/[\s().-]/g, ''))
  return match ? match[1] : null
}

/** `+51 984 *** 449`: nunca se muestra el número completo, ni siquiera si no es válido. */
export function maskPhone(value: string): string {
  const digits = normalizePhone(value)
  if (digits) return `+51 ${digits.slice(0, 3)} *** ${digits.slice(6)}`
  return value.trim() === '' ? '—' : '*** (no válido)'
}

/**
 * Fecha en AAAA-MM-DD o null si no es válida. Acepta también DD/MM/AAAA, que es como Excel en
 * español guarda las fechas: se convierte para que la API no la lea al revés (mes/día).
 */
export function toIsoDate(value: string): string | null {
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value)
  const local = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(value)
  const parts = iso ? [iso[1], iso[2], iso[3]] : local ? [local[3], local[2], local[1]] : null
  if (!parts) return null
  const [y, m, d] = parts.map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Valor tal como se envía a la API: celular con +51 (así lo usa WhatsApp), fecha AAAA-MM-DD y área en minúsculas. */
function normalizeValue(name: string, value: string): string {
  if (name === 'telefono') {
    const digits = normalizePhone(value)
    return digits ? `+51${digits}` : value
  }
  if (name === 'fecha_entrega_hierro') return toIsoDate(value) ?? value
  if (name === 'area') return value.toLowerCase()
  return value
}

function isBlankRow(cells: string[]) {
  return cells.every((cell) => cell.trim() === '')
}

/** Excel suele dejar columnas vacías al final de la cabecera ("…;fecha_entrega_hierro;;"): se ignoran, como hace la API. */
function trimTrailingBlanks(header: string[]) {
  let end = header.length
  while (end > 0 && header[end - 1] === '') end--
  return header.slice(0, end)
}

interface FileInfo {
  fileName: string
  sizeBytes: number
  encoding: SourceEncoding
}

function rejectedReport(file: FileInfo, message: string, delimiter: CsvDelimiter = ','): RegistryValidationReport {
  return {
    summary: { ...file, rowsDetected: 0, delimiter, establishments: {} },
    ok: false,
    validRows: 0,
    errors: [{ row: null, column: null, message }],
    errorCount: 1,
    preview: [],
    cleanCsv: null,
    rowMap: [],
  }
}

/**
 * Valida la cabecera: todas las columnas obligatorias, sin columnas ajenas al contrato (para no
 * cargar datos de más, como DNI o nombres) ni repetidas. El orden no importa: la API no lo exige.
 */
function validateHeader(header: string[], columns: ContractColumn[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const issue = (message: string, column: string | null = null) => issues.push({ row: 1, column, message })
  const allowed = columns.map((column) => column.name)
  const seen = new Set<string>()

  header.forEach((name, index) => {
    if (name === '') {
      issue(`La cabecera tiene una columna sin nombre (posición ${index + 1}).`)
    } else if (seen.has(name)) {
      issue(`La columna «${name}» está duplicada en la cabecera.`, name)
    } else if (!allowed.includes(name)) {
      const caseMatch = allowed.find((a) => a.toLowerCase() === name.toLowerCase())
      issue(
        caseMatch
          ? `La columna «${name}» debe escribirse exactamente como «${caseMatch}».`
          : `La columna «${name}» no forma parte del contrato. Quítela: el padrón solo lleva las columnas indicadas.`,
        name,
      )
    }
    seen.add(name)
  })

  for (const column of columns) {
    if (column.required && !header.some((h) => h.toLowerCase() === column.name.toLowerCase())) {
      issue(`Falta la columna obligatoria «${column.name}».`, column.name)
    }
  }
  return issues
}

/**
 * Valida el texto de un CSV contra el contrato de columnas y arma el CSV limpio que se envía a la
 * API. La carga es atómica: el reporte solo es `ok` si la cabecera y TODAS las filas son válidas.
 */
export function validateRegistryCsv(rawText: string, file: FileInfo, columns: ContractColumn[]): RegistryValidationReport {
  const text = rawText.replace(/^﻿/, '')
  const delimiter = detectDelimiter(text)
  const parsed = parseCsv(text, delimiter)
  const [headerCells, ...bodyRows] = parsed.rows

  if (!headerCells || isBlankRow(headerCells)) {
    return rejectedReport(file, 'El archivo no contiene una cabecera de columnas.', delimiter)
  }

  // Número de fila "de hoja de cálculo": la cabecera es la fila 1.
  const dataRows = bodyRows
    .map((cells, index) => ({ cells, rowNumber: index + 2 }))
    .filter(({ cells }) => !isBlankRow(cells))

  const errors: ValidationIssue[] = []
  let errorCount = 0
  const report = (issue: ValidationIssue) => {
    errorCount++
    if (errors.length < MAX_COLLECTED_ISSUES) errors.push(issue)
  }

  if (parsed.error) report({ row: null, column: null, message: parsed.error })
  if (dataRows.length === 0) report({ row: null, column: null, message: 'El archivo no contiene registros.' })

  const header = trimTrailingBlanks(headerCells.map((cell) => cell.trim()))
  const headerIssues = validateHeader(header, columns)
  headerIssues.forEach(report)

  const establishments: Record<string, number> = {}
  const summary = { ...file, rowsDetected: dataRows.length, delimiter, establishments }

  // Sin una cabecera válida las filas no se pueden interpretar.
  if (headerIssues.length > 0) {
    return { summary, ok: false, validRows: 0, errors, errorCount, preview: [], cleanCsv: null, rowMap: [] }
  }

  // Columnas del archivo en el orden del contrato (así se arma el CSV limpio).
  const present = columns.filter((column) => header.includes(column.name))
  const indexOf = new Map(header.map((name, index) => [name, index]))
  const valueOf = (cells: string[], name: string) => cells[indexOf.get(name) ?? -1]?.trim() ?? ''
  const seenIds = new Map<string, number>()
  const preview: PreviewRecord[] = []
  const cleanRows: string[][] = []
  const rowMap: number[] = []
  let validRows = 0

  for (const { cells, rowNumber } of dataRows) {
    const rowIssues: ValidationIssue[] = []
    // Las celdas vacías que sobran al final (columnas vacías de Excel) no cuentan.
    const extraCellsBlank = cells.slice(header.length).every((cell) => cell.trim() === '')
    const cellCount = extraCellsBlank ? Math.min(cells.length, header.length) : cells.length

    if (cellCount !== header.length) {
      rowIssues.push({
        row: rowNumber,
        column: null,
        message: `Se esperaban ${header.length} campos y se encontraron ${cells.length}.`,
      })
    } else {
      for (const { name } of present) {
        const value = valueOf(cells, name)
        if (value === '') {
          if (!BLANK_ALLOWED.has(name)) rowIssues.push({ row: rowNumber, column: name, message: 'Campo obligatorio vacío.' })
          continue
        }
        const problem = FIELD_RULES[name]?.(value)
        if (problem) {
          const shown = HIDDEN_VALUES.has(name) ? 'Valor no válido' : `Valor «${value}» no válido`
          rowIssues.push({ row: rowNumber, column: name, message: `${shown}: ${problem}` })
        }
      }

      const childId = valueOf(cells, 'id_nino')
      if (childId) {
        const firstRow = seenIds.get(childId)
        if (firstRow !== undefined) {
          rowIssues.push({
            row: rowNumber,
            column: 'id_nino',
            message: `Identificador «${childId}» duplicado (ya aparece en la fila ${firstRow}).`,
          })
        } else {
          seenIds.set(childId, rowNumber)
        }
      }
    }

    if (rowIssues.length === 0) validRows++
    rowIssues.forEach(report)

    const establishment = valueOf(cells, 'establecimiento_id')
    if (establishment) establishments[establishment] = (establishments[establishment] ?? 0) + 1
    cleanRows.push(present.map(({ name }) => normalizeValue(name, valueOf(cells, name))))
    rowMap.push(rowNumber)

    if (preview.length < PREVIEW_LIMIT) {
      preview.push({
        rowNumber,
        childId: valueOf(cells, 'id_nino'),
        establishment,
        caregiverAlias: valueOf(cells, 'alias_cuidador'),
        maskedPhone: maskPhone(valueOf(cells, 'telefono')),
        ageMonths: valueOf(cells, 'edad_meses'),
        area: valueOf(cells, 'area'),
        altitude: valueOf(cells, 'altitud_msnm'),
        credControls: valueOf(cells, 'controles_cred'),
        lastIronDelivery: valueOf(cells, 'fecha_entrega_hierro'),
        valid: rowIssues.length === 0,
      })
    }
  }

  const ok = errorCount === 0
  return {
    summary,
    ok,
    validRows,
    errors,
    errorCount,
    preview,
    cleanCsv: ok ? serializeCsv([present.map(({ name }) => name), ...cleanRows]) : null,
    rowMap,
  }
}

/**
 * Lee el archivo (UTF-8 o, si no lo es, Windows-1252 de Excel) y lo valida localmente: nada sale
 * del navegador hasta confirmar la carga.
 */
export async function validateRegistryFile(file: File, columns: ContractColumn[]): Promise<RegistryValidationReport> {
  const info: FileInfo = { fileName: file.name, sizeBytes: file.size, encoding: 'UTF-8' }
  if (!/\.csv$/i.test(file.name)) {
    return rejectedReport(info, 'El archivo debe tener extensión .csv.')
  }
  if (file.size === 0) {
    return rejectedReport(info, 'El archivo está vacío.')
  }
  if (file.size > MAX_FILE_BYTES) {
    return rejectedReport(info, 'El archivo supera el tamaño máximo permitido de 10 MB.')
  }

  const { text, encoding } = decodeCsvBytes(await file.arrayBuffer())
  return validateRegistryCsv(text, { ...info, encoding }, columns)
}
