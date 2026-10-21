import type { CsvDelimiter, SourceEncoding, ValidationIssue } from '../types'

/** 145408 -> "142 KB". */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toLocaleString('es-PE', { maximumFractionDigits: 1 })} MB`
}

const DELIMITER_LABELS: Record<CsvDelimiter, string> = {
  ',': 'coma (,)',
  ';': 'punto y coma (;)',
  '\t': 'tabulación',
}

export function formatDelimiter(delimiter: CsvDelimiter): string {
  return DELIMITER_LABELS[delimiter]
}

const ENCODING_LABELS: Record<SourceEncoding, string> = {
  'UTF-8': 'UTF-8',
  'Windows-1252': 'Windows-1252 (Excel)',
}

export function formatEncoding(encoding: SourceEncoding): string {
  return ENCODING_LABELS[encoding]
}

export function pluralize(count: number, singular: string, plural: string) {
  return `${count.toLocaleString('es-PE')} ${count === 1 ? singular : plural}`
}

/** {EESS01: 4, EESS02: 3} -> "EESS01: 4 · EESS02: 3". */
export function formatEstablishments(counts: Record<string, number>): string {
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, count]) => `${id}: ${count.toLocaleString('es-PE')}`)
    .join(' · ')
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** "hoy, 08:30 hrs" · "ayer, 17:05 hrs" · "12/10/2026, 09:00 hrs" (hora de este navegador). */
export function formatWhen(iso: string, now = new Date()): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'en fecha desconocida'

  const time = date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)

  if (isSameDay(date, now)) return `hoy, ${time} hrs`
  if (isSameDay(date, yesterday)) return `ayer, ${time} hrs`
  return `${date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}, ${time} hrs`
}

/** "Fila 5 · edad_meses" / "Cabecera · telefono" / "Archivo · id_nino" / "Archivo". */
export function formatIssueLocation(issue: ValidationIssue): string {
  const where = issue.row === null ? 'Archivo' : issue.row === 1 ? 'Cabecera' : `Fila ${issue.row}`
  return issue.column && issue.row !== 1 ? `${where} · ${issue.column}` : where
}
