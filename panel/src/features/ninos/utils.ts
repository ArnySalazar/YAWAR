import { DELIVERY_LABEL, formatAge, formatAgeGroup, formatStatus, formatWeeklyAction } from './format'
import type {
  ChildListItem,
  ChildSegment,
  ChildrenFilterParams,
  ChildrenListParams,
  ChildrenListResponse,
} from './types'

export const DEFAULT_PAGE_SIZE = 8

/** Valores por defecto de chips, selectores y orden (todo menos la búsqueda). */
export const DEFAULT_SELECTS: Omit<ChildrenFilterParams, 'search'> = {
  segment: 'todos',
  ageGroup: 'todos',
  delivery: 'todos',
  response: 'todos',
  sort: null,
  order: 'asc',
}

export const DEFAULT_FILTERS: ChildrenFilterParams = { search: '', ...DEFAULT_SELECTS }

export const SEGMENTS: ChildSegment[] = ['todos', 'priorizados', 'dificultades', 'sin_respuesta', 'si_le_di']

/** Chips que necesitan el historial de cada niño (no se pueden contar mientras carga). */
const SEGMENTS_FROM_HISTORY: ReadonlySet<ChildSegment> = new Set(['dificultades', 'si_le_di'])

const normalize = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

export function matchesSegment(child: ChildListItem, segment: ChildSegment) {
  switch (segment) {
    case 'todos':
      return true
    case 'priorizados':
      return child.prioritizedThisWeek
    case 'dificultades':
      return child.status?.kind === 'problema' || child.status?.kind === 'no_le_di'
    case 'sin_respuesta':
      // La misma regla de la API: no respondió en 7 días o más (nivel 1)
      return child.signal === 'sin_respuesta'
    case 'si_le_di':
      return child.status?.kind === 'si_le_di'
  }
}

/** Búsqueda + selectores (todo menos el chip de segmento). */
function matchesBaseFilters(child: ChildListItem, filters: ChildrenFilterParams) {
  const term = normalize(filters.search)
  if (term) {
    const haystack = normalize([child.code, child.caregiverAlias].join(' '))
    if (!haystack.includes(term)) return false
  }
  if (filters.ageGroup !== 'todos' && child.ageGroup !== filters.ageGroup) return false
  if (filters.delivery !== 'todos' && child.weeklyAction.channel !== filters.delivery) return false
  if (filters.response !== 'todos' && child.weekResponse?.kind !== filters.response) return false
  return true
}

const codeNumber = (code: string) => Number(code.replace(/\D/g, '')) || 0

/** Sin campo elegido, el orden de la lista de la semana (1 = mayor urgencia). */
function sortChildren(items: ChildListItem[], filters: ChildrenFilterParams) {
  const byRank = (a: ChildListItem, b: ChildListItem) => a.priorityRank - b.priorityRank
  if (!filters.sort) return [...items].sort(byRank)
  const direction = filters.order === 'desc' ? -1 : 1
  const value = (child: ChildListItem) => (filters.sort === 'age' ? child.ageMonths : codeNumber(child.code))
  // A igual edad, se respeta el orden de prioridad
  return [...items].sort((a, b) => (value(a) - value(b)) * direction || byRank(a, b))
}

/** Aplica búsqueda, selectores, chip y orden. */
export function filterChildren(all: ChildListItem[], filters: ChildrenFilterParams) {
  const base = all.filter((child) => matchesBaseFilters(child, filters))
  return sortChildren(
    base.filter((child) => matchesSegment(child, filters.segment)),
    filters,
  )
}

/** Una página del listado y el conteo de cada chip (la API no tiene una ruta de niños). */
export function queryChildren(all: ChildListItem[], params: ChildrenListParams): ChildrenListResponse {
  const { page, pageSize, ...filters } = params
  const base = all.filter((child) => matchesBaseFilters(child, filters))
  const historyLoaded = all.every((child) => child.status !== undefined)
  const segmentCounts: Partial<Record<ChildSegment, number>> = {}
  for (const segment of SEGMENTS) {
    if (SEGMENTS_FROM_HISTORY.has(segment) && !historyLoaded) continue
    segmentCounts[segment] = base.filter((child) => matchesSegment(child, segment)).length
  }
  const filtered = sortChildren(
    base.filter((child) => matchesSegment(child, filters.segment)),
    filters,
  )
  const lastPage = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(Math.max(1, page), lastPage)
  const start = (safePage - 1) * pageSize
  return {
    items: filtered.slice(start, start + pageSize),
    total: filtered.length,
    page: safePage,
    pageSize,
    segmentCounts,
  }
}

/* ------------------------------------------------------------------ */
/* Exportación CSV                                                     */
/* ------------------------------------------------------------------ */

const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`

const NO_DISPONIBLE = 'No disponible'

export function buildChildrenCsv(items: ChildListItem[]) {
  const header = [
    'Prioridad',
    'Código',
    'Estado de seguimiento',
    'Edad',
    'Grupo',
    'Establecimiento',
    'Cuidador',
    'Respuesta de la semana',
    'Acción semanal',
    'Entrega',
    'Priorizado esta semana',
  ]
  const rows = items.map((child) => [
    child.priorityRank,
    child.code,
    child.status ? formatStatus(child.status) : NO_DISPONIBLE,
    formatAge(child.ageMonths),
    formatAgeGroup(child),
    child.establishmentId,
    child.caregiverAlias,
    child.weekResponse?.label ?? NO_DISPONIBLE,
    formatWeeklyAction(child.weeklyAction),
    DELIVERY_LABEL[child.weeklyAction.channel],
    child.prioritizedThisWeek ? 'Sí' : 'No',
  ])
  // BOM para que Excel abra correctamente las tildes.
  return '\uFEFF' + [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
}

export function downloadTextFile(content: string, filename: string, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
