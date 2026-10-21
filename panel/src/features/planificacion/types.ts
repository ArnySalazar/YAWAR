/**
 * Datos de la pantalla "Planificación semanal". Se arman en api.ts a partir de la lista de la API
 * (POST /establecimientos/{id}/lista) y del historial de cada niño.
 * No hay agenda con horas, reasignación manual ni semanas pasadas: la API no los tiene.
 */
import type { SemanaIso } from '@/api/yawar'

/** Canal asignado por la regla de corte: los N primeros a visita, el resto a WhatsApp. */
export type FollowUpChannel = 'home_visit' | 'whatsapp'

/** Regla que ubicó al niño en la lista (las mismas de la API): R1 = nivel 0, R2 = nivel 1, R3 = nivel 2. */
export type PriorityRule = 'R1' | 'R2' | 'R3'

export type PrioritySignalKind = 'reported_problem' | 'intake_rejection' | 'no_response' | 'predictive_risk'

export interface PrioritySignal {
  kind: PrioritySignalKind
  rule: PriorityRule
  label: string
}

/** Última respuesta registrada del cuidador (del historial). */
export interface CaregiverReport {
  /** "No le di: No le gusta" */
  text: string
  semana: SemanaIso
  isThisWeek: boolean
}

export interface ChannelAssignment {
  channel: FollowUpChannel
  /** Orden en la lista de visitas (1..N); null para WhatsApp. */
  visitOrder: number | null
}

export interface PlannedChild {
  id: string
  /** Código del niño en el padrón, ej. N0001. */
  code: string
  ageMonths: number
  /** Alias del cuidador, ej. "Mamá de N0001" (no hay nombres reales ni teléfonos en el panel). */
  caregiverAlias: string
  /** Posición en la lista (1 = mayor urgencia). */
  priorityRank: number
  signal: PrioritySignal
  /** Texto de seguimiento de la API, ej. "La semana pasada respondió: No le di"; null si no hay señal. */
  followUpNote: string | null
  /** Motivos del modelo, ej. ["tiene 18 meses o más", "vive en zona rural"]. */
  reasons: string[]
  /** Regla aplicada tal como la explica la API. */
  ruleText: string
  /** Probabilidad estimada de no consumo (0 a 1). */
  riskScore: number
  /** Reportó "No le di" o "Tuve un problema" la semana pasada (R1). */
  hasDifficulty: boolean
  assignment: ChannelAssignment
  /** Última respuesta del cuidador: undefined mientras carga el historial, null si nunca respondió. */
  lastReport?: CaregiverReport | null
}

export interface WeeklyPlan {
  semana: SemanaIso
  /** Lunes y domingo de la semana (AAAA-MM-DD). */
  startDate: string
  endDate: string
  /** Hoy según el servidor (AAAA-MM-DD). */
  referenceDate: string
  establishmentId: string
  rosterSize: number
  ageRange: { minMonths: number; maxMonths: number } | null
  visitCapacity: number
  children: PlannedChild[]
}
