/**
 * Datos de la pantalla "Niños en seguimiento". Se arman en api.ts con la lista de la semana
 * (POST /establecimientos/{id}/lista), el historial de cada niño y los indicadores de la semana.
 * La API no tiene una ruta de niños: la búsqueda, los filtros, el orden y la paginación se hacen
 * en el navegador. No hay sector, teléfono, suplemento ni fecha del último reporte: la API no los da.
 */
import type { Respuesta, SemanaIso } from '@/api/yawar'
import type { GrupoEdad, SenalSeguimiento } from '@/lib/dominio'

/** Grupo etario del padrón (meses cumplidos). */
export type AgeGroup = GrupoEdad

/** Estado de seguimiento: la última respuesta registrada del cuidador (las 4 que ofrece el bot). */
export type FollowUpStatus = Respuesta

/** Respuesta del cuidador en la semana en curso (historial del niño). */
export type ResponseKind = Respuesta

/** Canal de la acción semanal (filtro "Entrega"): los N primeros de la lista van a visita. */
export type WeeklyActionChannel = 'visita_domiciliaria' | 'whatsapp_automatizado'

/** Chips de segmentación rápida del listado. */
export type ChildSegment = 'todos' | 'priorizados' | 'dificultades' | 'sin_respuesta' | 'si_le_di'

/** Orden de la tabla; sin campo elegido se usa la posición en la lista de la semana. */
export type SortField = 'code' | 'age'
export type SortOrder = 'asc' | 'desc'

export interface ChildStatus {
  kind: FollowUpStatus
  /** Semana de esa respuesta; null si el cuidador nunca respondió. */
  semana: SemanaIso | null
  isThisWeek: boolean
}

export interface WeekResponse {
  kind: ResponseKind
  /** Texto de la respuesta tal como se muestra, ej. "Tuve un problema: Estreñimiento". */
  label: string
}

export interface ChildListItem {
  /** Código del niño en el padrón, ej. N0001. */
  code: string
  /** Posición en la lista de la semana (1 = mayor urgencia). */
  priorityRank: number
  ageMonths: number
  ageGroup: AgeGroup
  /** Código del establecimiento, ej. EESS01 (la API no tiene nombres de establecimientos). */
  establishmentId: string
  /** Alias del cuidador, ej. "Mamá de N0001" (no hay nombres reales ni teléfonos en el panel). */
  caregiverAlias: string
  /** Señal de la lista: qué pasó la semana pasada (null = sin novedad). */
  signal: SenalSeguimiento
  weeklyAction: {
    channel: WeeklyActionChannel
    /** Orden de la visita domiciliaria (#1, #2…); null para WhatsApp. */
    visitOrder: number | null
  }
  /** Con señal roja o ámbar en la lista de la semana (nivel 0 o 1). */
  prioritizedThisWeek: boolean
  /** Última respuesta registrada; undefined mientras carga el historial o si no se pudo leer. */
  status?: ChildStatus
  /** Respuesta de esta semana; undefined mientras carga el historial o si no se pudo leer. */
  weekResponse?: WeekResponse
}

/** Búsqueda, filtros y orden: se aplican en el navegador sobre la lista de la semana. */
export interface ChildrenFilterParams {
  search: string
  segment: ChildSegment
  ageGroup: AgeGroup | 'todos'
  delivery: WeeklyActionChannel | 'todos'
  response: ResponseKind | 'todos'
  sort: SortField | null
  order: SortOrder
}

export interface ChildrenListParams extends ChildrenFilterParams {
  page: number
  pageSize: number
}

export interface ChildrenListResponse {
  items: ChildListItem[]
  /** Total de registros que cumplen los filtros (todas las páginas). */
  total: number
  page: number
  pageSize: number
  /** Conteo por chip, con la búsqueda y los selectores aplicados (sin el chip). Falta el de los
   *  chips que dependen del historial mientras este carga. */
  segmentCounts: Partial<Record<ChildSegment, number>>
}

/** Respuestas de la semana según los indicadores de la API. */
export interface WeeklyResponseSummary {
  responded: number
  /** Recordatorios enviados (sin contar los fallidos). */
  contacted: number
  /** respondidos ÷ enviados; null si aún no se envió ningún recordatorio. */
  returnRate: number | null
}

/** Indicadores de la pantalla, calculados en el navegador. */
export interface ChildrenSummary {
  totalActive: number
  ageRange: { minMonths: number; maxMonths: number } | null
  /** undefined mientras cargan los indicadores; null si no se pudieron leer. */
  weeklyResponse: WeeklyResponseSummary | null | undefined
  homeVisits: { assigned: number; whatsapp: number }
  /** Niños cuya última respuesta fue "Tuve un problema" o "No le di" (historial).
   *  undefined mientras carga el historial; null si no se pudo leer. */
  alerts: { active: number; problems: number; refusals: number } | null | undefined
}
