/**
 * Adaptador de Comunicación: convierte la lista de la semana, los historiales y los indicadores de la
 * API en los datos de la pantalla. Las llamadas a la API están en @/api/queries (compartidas con las
 * demás pantallas); aquí solo hay funciones puras. Búsqueda, pestañas, filtros y paginación se hacen
 * en el navegador: la API no tiene una ruta de mensajes por establecimiento.
 */
import type { FilaLista, Indicadores, Respuesta, SemanaHistorial, SemanaIndicadores, SemanaIso } from '@/api/yawar'
import { RAZONES, parentesco, respuestaDeSemana, tasa, textoRespuesta } from '@/lib/dominio'
import { etiquetaSemana } from '@/lib/semana'
import type {
  CommunicationResponse,
  ReasonCode,
  ReasonSeverity,
  ResponseCounts,
  ResponseFilters,
  ResponsePage,
  ResponseTab,
  ResponseTabCounts,
  ResponseType,
  WeekOption,
  WeekResponses,
  WeekSummary,
} from './types'

export function responseTypeOf(respuesta: Respuesta): ResponseType {
  switch (respuesta) {
    case 'problema':
      return 'problema'
    case 'no_le_di':
      return 'no_consumo'
    case 'si_le_di':
      return 'favorable'
    default:
      return 'sin_respuesta'
  }
}

export const REASON_LABELS: Record<ReasonCode, string> = { ...RAZONES, consumo_completo: 'Consumo completo' }

/**
 * Color de la etiqueta de cada motivo. Es solo visual (qué conviene mirar primero), no una
 * indicación clínica: estreñimiento y falta de hierro cortan el consumo; sabor y olvido se conversan.
 */
export const REASON_SEVERITY: Record<ReasonCode, ReasonSeverity> = {
  estrenimiento: 'critica',
  se_acabo: 'critica',
  sabor: 'advertencia',
  olvido: 'advertencia',
  otro: 'neutral',
  consumo_completo: 'positiva',
}

function reasonOf(registro: SemanaHistorial): ReasonCode | null {
  if (registro.respuesta === 'si_le_di') return 'consumo_completo'
  if (registro.respuesta === 'sin_respuesta') return null
  return registro.razon
}

/** Una fila de la lista + su registro de la semana → respuesta de la pantalla. */
export function buildResponse(fila: FilaLista, registro: SemanaHistorial): CommunicationResponse {
  const reason = reasonOf(registro)
  return {
    id: fila.id_nino,
    childCode: fila.id_nino,
    ageMonths: fila.edad_meses,
    caregiverRole: parentesco(fila.alias_cuidador),
    caregiverAlias: fila.alias_cuidador,
    priorityRank: fila.orden,
    semana: registro.semana,
    answer: registro.respuesta,
    responseType: responseTypeOf(registro.respuesta),
    // La razón solo acompaña a «No le di» y «Tuve un problema»; «Sí le di» va sin razón
    message: textoRespuesta(registro.respuesta, registro.respuesta === 'si_le_di' ? null : registro.razon),
    reason,
    reasonLabel: reason ? REASON_LABELS[reason] : null,
    reasonSeverity: reason ? REASON_SEVERITY[reason] : null,
    action: registro.accion,
  }
}

/** Primero las dificultades, luego los que no respondieron y al final «Sí le di». */
const TYPE_ORDER: Record<ResponseType, number> = { problema: 0, no_consumo: 1, sin_respuesta: 2, favorable: 3 }

/**
 * Respuestas de la semana elegida para cada niño de la lista actual (respuestaDeSemana). Los niños
 * sin registro esa semana no se listan: no estaban en la lista ni se les envió el recordatorio.
 */
export function buildWeekResponses(
  lista: FilaLista[],
  historiales: Record<string, SemanaHistorial[]>,
  semana: SemanaIso,
): WeekResponses {
  const items: CommunicationResponse[] = []
  for (const fila of lista) {
    const registro = respuestaDeSemana(historiales[fila.id_nino], semana)
    if (registro) items.push(buildResponse(fila, registro))
  }
  items.sort((a, b) => TYPE_ORDER[a.responseType] - TYPE_ORDER[b.responseType] || a.priorityRank - b.priorityRank)
  return { semana, rosterSize: lista.length, items, withoutRecord: lista.length - items.length }
}

export function countResponses(items: CommunicationResponse[]): ResponseCounts {
  const counts: ResponseCounts = { problema: 0, no_consumo: 0, favorable: 0, sin_respuesta: 0, total: items.length }
  for (const item of items) counts[item.responseType] += 1
  return counts
}

/** KPIs de la semana según los indicadores. Si la semana no está en la serie, no hubo envíos. */
export function weekSummary(indicadores: Pick<Indicadores, 'serie'> | undefined, semana: SemanaIso): WeekSummary {
  const fila: SemanaIndicadores | undefined = indicadores?.serie.find((s) => s.semana === semana)
  const contacted = fila?.enviados ?? 0
  const responded = fila?.respondidos ?? 0
  return { semana, contacted, responded, responseRate: tasa(responded, contacted) }
}

/** Semanas del selector: las de la serie de indicadores (hasta 5) y la actual, de la más reciente a la más antigua. */
export function weekOptions(serie: Pick<SemanaIndicadores, 'semana'>[], actual: SemanaIso): WeekOption[] {
  const semanas = [...new Set([actual, ...serie.map((s) => s.semana)])].sort().reverse()
  return semanas.map((value) => ({
    value,
    label: value === actual ? `${etiquetaSemana(value)} (actual)` : etiquetaSemana(value),
    current: value === actual,
  }))
}

/** Minúsculas y sin tildes, para que "mama" encuentre a "Mamá de N0001". */
function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
}

function matchesTab(item: CommunicationResponse, tab: ResponseTab) {
  switch (tab) {
    case 'con_dificultades':
      return item.responseType === 'problema' || item.responseType === 'no_consumo'
    case 'sin_respuesta':
      return item.responseType === 'sin_respuesta'
    case 'favorable':
      return item.responseType === 'favorable'
    default:
      return true
  }
}

/** Búsqueda (código o alias) y motivo; sin la pestaña. */
export function filterResponses(items: CommunicationResponse[], filters: Pick<ResponseFilters, 'q' | 'reason'>) {
  const q = normalizar(filters.q)
  return items.filter(
    (item) =>
      (filters.reason === 'todos' || item.reason === filters.reason) &&
      (!q || normalizar(item.childCode).includes(q) || normalizar(item.caregiverAlias).includes(q)),
  )
}

/** Todas las respuestas que cumplen los filtros (sin paginar): las mismas que se exportan. */
export function selectResponses(items: CommunicationResponse[], filters: Omit<ResponseFilters, 'page' | 'pageSize'>) {
  return filterResponses(items, filters).filter((item) => matchesTab(item, filters.tab))
}

export function queryResponses(items: CommunicationResponse[], filters: ResponseFilters): ResponsePage {
  const filtered = filterResponses(items, filters)
  const counts: ResponseTabCounts = {
    todas: filtered.length,
    con_dificultades: filtered.filter((item) => matchesTab(item, 'con_dificultades')).length,
    sin_respuesta: filtered.filter((item) => matchesTab(item, 'sin_respuesta')).length,
    favorable: filtered.filter((item) => matchesTab(item, 'favorable')).length,
  }
  const inTab = filtered.filter((item) => matchesTab(item, filters.tab))
  const totalPages = Math.max(1, Math.ceil(inTab.length / filters.pageSize))
  const page = Math.min(Math.max(1, filters.page), totalPages)
  const start = (page - 1) * filters.pageSize
  return {
    items: inTab.slice(start, start + filters.pageSize),
    total: inTab.length,
    page,
    pageSize: filters.pageSize,
    counts,
  }
}
