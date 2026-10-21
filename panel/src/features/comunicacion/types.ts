/**
 * Datos de la pantalla "Comunicación", versión reducida: las respuestas de la semana.
 * Se arman en api.ts con la lista de la semana (POST /establecimientos/{id}/lista), el historial de
 * cada niño (GET /ninos/{id}/historial) y los indicadores (GET /establecimientos/{id}/indicadores).
 * La API no devuelve fechas de envío ni de respuesta, el estado de entrega de cada mensaje, la
 * conversación ni los mensajes de texto libre: la pantalla no los muestra (ver
 * docs/panel/evidencias/2026-10-21_brecha_diseno_vs_api.md, sección 5.6).
 */
import type { Accion, Razon, Respuesta, SemanaIso } from '@/api/yawar'

/** Pestañas de la lista. */
export type ResponseTab = 'todas' | 'con_dificultades' | 'sin_respuesta' | 'favorable'

/** Tipo de respuesta del cuidador al recordatorio semanal del bot. */
export type ResponseType =
  /** «Tuve un problema» (con su razón, si la eligió) */
  | 'problema'
  /** «No le di» (con su razón, si la eligió) */
  | 'no_consumo'
  /** «Sí le di» */
  | 'favorable'
  /** No hay respuesta registrada en la semana */
  | 'sin_respuesta'

/** Motivo: las 5 razones que ofrece el bot, más "consumo completo" para «Sí le di». */
export type ReasonCode = Razon | 'consumo_completo'

/** Gravedad visual del motivo: define el color de la etiqueta (no es una indicación clínica). */
export type ReasonSeverity = 'critica' | 'advertencia' | 'neutral' | 'positiva'

/** Respuesta de un niño en la semana elegida (una por niño de la lista con registro esa semana). */
export interface CommunicationResponse {
  /** Código del niño en el padrón, ej. N0001 (también sirve de id). */
  id: string
  childCode: string
  ageMonths: number
  /** Parentesco deducido del alias: "Mamá de N0001" → "Mamá". */
  caregiverRole: string
  /** Alias del cuidador, ej. "Mamá de N0001" (no hay nombres reales ni teléfonos en el panel). */
  caregiverAlias: string
  /** Posición del niño en la lista de la semana actual (1 = mayor urgencia). */
  priorityRank: number
  semana: SemanaIso
  /** Código de la respuesta tal como lo guarda la API. */
  answer: Respuesta
  responseType: ResponseType
  /** Respuesta armada con los botones que eligió, sin comillas: "Tuve un problema: Estreñimiento". */
  message: string
  /** null si no respondió, o si respondió «No le di» o «Tuve un problema» sin elegir razón. */
  reason: ReasonCode | null
  reasonLabel: string | null
  reasonSeverity: ReasonSeverity | null
  /** Acción asignada esa semana; null si solo se envió el recordatorio, sin generar la lista. */
  action: Accion | null
}

/** Respuestas de una semana para los niños de la lista actual. */
export interface WeekResponses {
  semana: SemanaIso
  /** Niños de la lista actual. */
  rosterSize: number
  items: CommunicationResponse[]
  /** Niños de la lista sin registro esa semana (no estaban en la lista ni recibieron el recordatorio). */
  withoutRecord: number
}

/** Conteos por tipo de respuesta, sobre los niños de la lista actual con registro en la semana. */
export type ResponseCounts = Record<ResponseType, number> & { total: number }

/** KPIs de la semana según los indicadores de la API (todo el establecimiento). */
export interface WeekSummary {
  semana: SemanaIso
  /** Recordatorios enviados (aceptados por WhatsApp) en la semana. */
  contacted: number
  responded: number
  /** respondidos ÷ enviados (0 a 1), o null si no hubo envíos. */
  responseRate: number | null
}

/** Conteos por pestaña (calculados sobre la búsqueda y el motivo, sin considerar la pestaña). */
export type ResponseTabCounts = Record<ResponseTab, number>

/** Filtros de la lista; se aplican en el navegador. */
export interface ResponseFilters {
  tab: ResponseTab
  /** Búsqueda por código del niño o alias del cuidador. */
  q: string
  reason: Razon | 'todos'
  page: number
  pageSize: number
}

export interface ResponsePage {
  items: CommunicationResponse[]
  total: number
  page: number
  pageSize: number
  counts: ResponseTabCounts
}

export interface WeekOption {
  value: SemanaIso
  label: string
  current: boolean
}
