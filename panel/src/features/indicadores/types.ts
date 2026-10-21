/**
 * Datos de la pantalla "Indicadores de seguimiento". Se arman en api.ts a partir de
 * GET /establecimientos/{id}/indicadores (serie de hasta 5 semanas + meta-alerta) y del historial de
 * cada niño de la lista (para contar los motivos, que la API no cuenta).
 * No hay "entregados", "en cola", disponibilidad ni latencia: la API no los mide.
 */
import type { Razon, SemanaIso } from '@/api/yawar'

/** Semana elegible en el selector: solo las que trae la serie de la API. */
export interface WeekOption {
  semana: SemanaIso
  /** "Semana 43 · 19 – 25 oct 2026" */
  label: string
}

export interface WeeklyTrendPoint {
  semana: SemanaIso
  /** "Semana 43" */
  label: string
  /** Recordatorios aceptados por WhatsApp (no confirma entrega ni lectura). */
  sent: number
  responses: number
  /** respuestas ÷ enviados (0 a 1); null si no hubo envíos. */
  responseRate: number | null
  /** true si es la semana actual: todavía pueden llegar respuestas. */
  inProgress: boolean
}

export interface IndicatorsReport {
  establishmentId: string
  /** Semana analizada (la última de la serie). */
  semana: SemanaIso
  /** Hubo envíos (o respuestas) en la semana analizada; si no, la pantalla muestra el estado vacío. */
  hasActivity: boolean
  reminders: {
    /** Intentos de envío: enviados + fallidos. */
    attempted: number
    sent: number
  }
  deliveryFailures: {
    count: number
    /** fallidos ÷ intentos (0 a 1); null sin intentos. */
    share: number | null
  }
  responses: {
    received: number
    /** Denominador: recordatorios enviados (las fallas técnicas quedan fuera). */
    sent: number
    rate: number | null
  }
  adherence: {
    /** Respuestas «Sí le di». */
    declaredYes: number
    /** Respondieron «No le di» o «Tuve un problema» (la API los da juntos). */
    casesWithDifficulties: number
  }
  weeklyTrend: WeeklyTrendPoint[]
  /** Texto de la API si la semana cayó muy por debajo de su promedio; null si no. */
  metaAlert: string | null
}

export interface DifficultyReason {
  id: Razon
  label: string
  cases: number
  /** Color de la serie definido en el diseño. */
  color: string
}

/** Motivos contados con el historial de los niños de la lista actual del establecimiento. */
export interface DifficultySummary {
  semana: SemanaIso
  /** Niños de la lista cuyo cuidador respondió «No le di» o «Tuve un problema» esa semana. */
  familiesReporting: number
  /** Las 5 razones del bot, de la más frecuente a la menos frecuente. */
  reasons: DifficultyReason[]
  /** Respondieron con dificultad pero todavía no eligieron la razón. */
  withoutReason: number
  /** Niños de la lista sobre los que se contó. */
  childrenCounted: number
}
