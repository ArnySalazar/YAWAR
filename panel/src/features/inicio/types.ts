/**
 * Datos de la pantalla "Inicio". Se arman en api.ts a partir de la lista de la semana
 * (POST /establecimientos/{id}/lista) y de los indicadores (GET /establecimientos/{id}/indicadores).
 * No hay agenda por día y hora, mapa, fotos, dosaje de Hb ni visitas realizadas: la API no los tiene.
 */
import type { AlarmaPendiente, SemanaIso } from '@/api/yawar'

/** Regla que ubicó al niño en la lista (las mismas de la API): R1 = nivel 0, R2 = nivel 1, R3 = nivel 2. */
export type PriorityRule = 'R1' | 'R2' | 'R3'

/** Acción de la semana: los N primeros a visita, el resto a WhatsApp. */
export type NextAction = { type: 'home_visit'; visitOrder: number } | { type: 'whatsapp_followup' }

export interface PrioritizedChild {
  pendingAlarms?: AlarmaPendiente[]
  id: string
  /** Código del niño en el padrón, ej. N0001. */
  code: string
  ageMonths: number
  /** Alias del cuidador, ej. "Mamá de N0001" (no hay nombres reales ni teléfonos en el panel). */
  caregiverAlias: string
  /** Posición en la lista (1 = mayor urgencia). */
  rank: number
  rule: PriorityRule
  /** "No le dio", "Reportó problema", "Sin respuesta" o "Por puntaje". */
  signalLabel: string
  /** Texto de la API: `seguimiento` (R1 y R2) o los `motivos` del modelo (R3). */
  statusText: string
  /** Probabilidad estimada de no consumo (0 a 1). */
  riskScore: number
  nextAction: NextAction
}

/* ------------------------------------------------------------------ */
/* Resumen de la semana (de la lista)                                  */
/* ------------------------------------------------------------------ */

export interface HomeOverview {
  semana: SemanaIso
  establishmentId: string
  roster: {
    total: number
    ageRangeMonths: { min: number; max: number } | null
  }
  /** "Priorizado" = con señal R1 o R2 (decisión 2 de la brecha diseño vs API). */
  prioritized: {
    total: number
    registrySharePct: number
  }
  homeVisits: {
    assigned: number
    /** Capacidad N con la que se generó la lista. */
    capacityN: number
    /** % de la capacidad N ocupada con visitas. */
    coveragePct: number
  }
  whatsappFollowUps: number
  /** Toda la lista, en orden de prioridad. */
  children: PrioritizedChild[]
}

/* ------------------------------------------------------------------ */
/* Respuestas al recordatorio (de los indicadores)                     */
/* ------------------------------------------------------------------ */

export interface WhatsappStats {
  semana: SemanaIso
  /** Recordatorios que no fallaron (van a TODOS los cuidadores, también a los de visita). */
  sent: number
  failed: number
  /** Cuidadores que respondieron algo esa semana. */
  responses: number
  /** Respuestas ÷ enviados (0 a 1), o null si aún no se envió nada. */
  responseRate: number | null
}

/* ------------------------------------------------------------------ */
/* Alertas operativas                                                  */
/* ------------------------------------------------------------------ */

export type OperationalAlertType = 'meta_alert' | 'reported_problem' | 'no_response'

export interface OperationalAlert {
  type: OperationalAlertType
  title: string
  description: string
  /** Limitación conocida que hay que leer junto con la alerta. */
  note: string | null
  tag: string
  /** Niños afectados; null para la meta-alerta (es del sistema, no de un niño). */
  affectedChildren: number | null
}
