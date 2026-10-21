import type { CsvDelimiter, SourceEncoding } from '../types'

const DELIMITER_CANDIDATES: CsvDelimiter[] = [',', ';', '\t']

/** Elige el delimitador más frecuente en la primera línea (fuera de comillas). Por defecto, coma. */
export function detectDelimiter(text: string): CsvDelimiter {
  const counts = new Map<string, number>(DELIMITER_CANDIDATES.map((d) => [d, 0]))
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (inQuotes) continue
    if (ch === '\n' || ch === '\r') break
    const current = counts.get(ch)
    if (current !== undefined) counts.set(ch, current + 1)
  }

  let best: CsvDelimiter = ','
  let max = 0
  for (const candidate of DELIMITER_CANDIDATES) {
    const count = counts.get(candidate) ?? 0
    if (count > max) {
      best = candidate
      max = count
    }
  }
  return best
}

export interface CsvParseResult {
  /** Filas tal como aparecen en el archivo (incluidas las líneas vacías, como `['']`). */
  rows: string[][]
  error: string | null
}

/**
 * Parser CSV mínimo (RFC 4180): campos entre comillas con delimitadores, saltos de línea y
 * comillas escapadas (`""`), y finales de línea LF, CRLF o CR.
 */
export function parseCsv(text: string, delimiter: CsvDelimiter): CsvParseResult {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let fieldWasQuoted = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
      continue
    }

    if (ch === '"' && field.length === 0 && !fieldWasQuoted) {
      inQuotes = true
      fieldWasQuoted = true
    } else if (ch === delimiter) {
      row.push(field)
      field = ''
      fieldWasQuoted = false
    } else if (ch === '\n' || ch === '\r') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      fieldWasQuoted = false
      if (ch === '\r' && text[i + 1] === '\n') i++
    } else {
      field += ch
    }
  }

  if (inQuotes) {
    return { rows, error: 'El archivo tiene comillas sin cerrar; revise el formato del último registro.' }
  }
  if (field.length > 0 || row.length > 0 || fieldWasQuoted) {
    row.push(field)
    rows.push(row)
  }
  return { rows, error: null }
}

/** Escapa un valor para escribirlo en un CSV. */
export function toCsvField(value: string, delimiter: CsvDelimiter = ','): string {
  return value.includes('"') || value.includes(delimiter) || /[\r\n]/.test(value)
    ? `"${value.replace(/"/g, '""')}"`
    : value
}

/**
 * Lee los bytes del archivo como UTF-8 y, si no es UTF-8 válido, como Windows-1252 (el "CSV" que
 * guarda Excel en español, hallazgo 7). El BOM, si lo hay, se descarta.
 */
export function decodeCsvBytes(bytes: ArrayBuffer | Uint8Array): { text: string; encoding: SourceEncoding } {
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), encoding: 'UTF-8' }
  } catch {
    return { text: new TextDecoder('windows-1252').decode(bytes), encoding: 'Windows-1252' }
  }
}

/** Arma un CSV limpio como lo lee la API: separado por comas, comillas solo donde hacen falta, fin de línea LF. */
export function serializeCsv(rows: string[][]): string {
  return `${rows.map((row) => row.map((value) => toCsvField(value, ',')).join(',')).join('\n')}\n`
}
