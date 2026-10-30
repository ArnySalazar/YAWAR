/**
 * Datos de la pantalla "Ficha del niño". Se arman en api.ts con el historial del niño
 * (GET /ninos/{id}/historial) y su fila en la lista de la semana (POST /establecimientos/{id}/lista).
 * No hay nombres, iniciales, teléfonos, sector, suplemento, fecha del último CRED ni año de registro:
 * la API no los tiene o van contra las reglas del proyecto.
 */
import type { AtencionAlarma, Respuesta, SemanaIso } from '@/api/yawar'

/** Estado de una semana según lo que respondió el cuidador con los botones del bot de WhatsApp. */
export type WeeklyResponseStatus = 'alerta' | 'interrupcion' | 'completado' | 'sin_respuesta'

export type NextActionChannel = 'visita_domiciliaria' | 'whatsapp'

/** Acción de esta semana, tal como la asignó la lista (no se reasigna a mano: la API no lo permite). */
export interface NextAction {
  channel: NextActionChannel
  semana: SemanaIso
  /** "Visita domiciliaria #1" · "Seguimiento por WhatsApp" */
  title: string
  /** Regla de la API, ej. "Seguimiento: la semana pasada respondió: No le di". */
  rationale: string
}

/** Lo que solo sabe la lista de la semana: edad, alias del cuidador, puntaje, motivos y acción. */
export interface ChildRoster {
  ageMonths: number
  /** "6-11 meses" */
  ageGroup: string
  /** Alias del cuidador, ej. "Mamá de N0001" (no hay nombres reales ni teléfonos en el panel). */
  caregiverAlias: string
  /** "Mamá", deducido del alias; null si el alias no sigue el formato "Mamá de …". */
  relationship: string | null
  /** Posición en la lista (1 = mayor urgencia) y cantidad de niños de la lista. */
  priorityRank: number
  rosterSize: number
  /** Probabilidad estimada de no consumo (0 a 1). */
  riskScore: number
  /** Motivos del modelo, ej. ["tiene 18 meses o más"]. */
  reasons: string[]
  prioritizedForHomeVisit: boolean
  nextAction: NextAction
}

/** Una semana del historial del bot. */
export interface BotWeeklyResponse {
  attendances?: AtencionAlarma[]
  alarmPending?: boolean
  semana: SemanaIso
  status: WeeklyResponseStatus
  respuesta: Respuesta
  /** Respuesta armada con los botones: "Tuve un problema: Estreñimiento" (el bot no recibe texto libre). */
  answer: string
  /** Qué hizo el sistema, según una regla fija por respuesta. */
  outcome: string
  /** Acción asignada esa semana; null si solo se envió el recordatorio, sin generar la lista. */
  channel: NextActionChannel | null
  /** Probabilidad de no consumo de esa semana; null si no se generó la lista. */
  riskScore: number | null
  isCurrentWeek: boolean
}

/** Última respuesta del cuidador (sin contar las semanas sin respuesta). */
export interface CaregiverReport {
  /** "No le di: No le gusta" */
  text: string
  semana: SemanaIso
  isThisWeek: boolean
}

/** Una barra de "Respuesta del cuidador": lo que dijo el cuidador, no una toma verificada. */
export interface WeeklyAnswer {
  semana: SemanaIso
  respuesta: Respuesta
  isCurrentWeek: boolean
}

/** en_lista; fuera_de_lista (enlace directo, otro establecimiento); sin_lista (la lista no se pudo cargar). */
export type RosterStatus = 'en_lista' | 'fuera_de_lista' | 'sin_lista'

export interface ChildFollowUp {
  code: string
  /** Establecimiento elegido en el selector (el de la lista consultada). */
  establishmentId: string
  rosterStatus: RosterStatus
  /** Fila del niño en la lista; null si no está o si la lista no se pudo cargar. */
  roster: ChildRoster | null
  latestReport: CaregiverReport | null
  /** De la semana más reciente a la más antigua. */
  botHistory: BotWeeklyResponse[]
  /** De la semana más antigua a la más reciente (últimas semanas del historial). */
  answerTrend: WeeklyAnswer[]
}
