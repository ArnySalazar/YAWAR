/**
 * Exportación en el navegador de las respuestas de la semana (las que cumplen los filtros, todas las
 * páginas). Sin fechas, estados de entrega ni teléfonos: la API no los devuelve o el panel no los muestra.
 */
import type { SemanaIso } from '@/api/yawar'
import { RESPUESTAS } from '@/lib/dominio'
import { ACTION_LABELS } from './presentation'
import type { CommunicationResponse } from './types'

function escapeCell(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? '' : String(value)
  return /[",;\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

const COLUMNS: Array<[header: string, value: (item: CommunicationResponse) => string | number | null]> = [
  ['Semana', (item) => item.semana],
  ['Código del niño', (item) => item.childCode],
  ['Edad (meses)', (item) => item.ageMonths],
  ['Parentesco', (item) => item.caregiverRole],
  ['Alias del cuidador', (item) => item.caregiverAlias],
  ['Respuesta', (item) => RESPUESTAS[item.answer]],
  ['Motivo', (item) => item.reasonLabel],
  ['Mensaje', (item) => item.message],
  ['Acción asignada', (item) => ACTION_LABELS[item.action ?? 'ninguna']],
]

/** Construye el contenido CSV (separador coma, filas CRLF) de una lista de respuestas. */
export function buildResponsesCsv(items: CommunicationResponse[]): string {
  const header = COLUMNS.map(([title]) => escapeCell(title)).join(',')
  const rows = items.map((item) => COLUMNS.map(([, value]) => escapeCell(value(item))).join(','))
  return [header, ...rows].join('\r\n')
}

/** "respuestas_whatsapp_EESS01_2026-W43.csv" */
export function responsesCsvFileName(establecimiento: string, semana: SemanaIso) {
  return `respuestas_whatsapp_${establecimiento}_${semana}.csv`
}

/** Descarga el CSV en el navegador, con BOM para que Excel respete las tildes y la ñ. */
export function downloadResponsesCsv(items: CommunicationResponse[], fileName: string) {
  const blob = new Blob(['﻿', buildResponsesCsv(items)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
