import { RESPUESTAS } from '@/lib/dominio'
import { etiquetaSemana } from '@/lib/semana'
import type {
  AgeGroup,
  ChildListItem,
  ChildSegment,
  ChildStatus,
  FollowUpStatus,
  ResponseKind,
  WeeklyActionChannel,
} from './types'

export const AGE_GROUP_LABEL: Record<AgeGroup, string> = {
  '6-11': '6–11 m',
  '12-23': '12–23 m',
  '24-35': '24–35 m',
}

/** Los 4 estados que existen: la última respuesta del cuidador al bot. */
export const STATUS_LABEL: Record<FollowUpStatus, string> = {
  problema: 'Reportó problema',
  no_le_di: 'No le dio',
  sin_respuesta: 'Sin respuesta',
  si_le_di: 'Sí le dio',
}

/** Opciones del filtro "Respuesta": los mismos textos de los botones del bot. */
export const RESPONSE_KIND_LABEL: Record<ResponseKind, string> = {
  problema: RESPUESTAS.problema,
  no_le_di: RESPUESTAS.no_le_di,
  sin_respuesta: RESPUESTAS.sin_respuesta,
  si_le_di: RESPUESTAS.si_le_di,
}

export const DELIVERY_LABEL: Record<WeeklyActionChannel, string> = {
  visita_domiciliaria: 'Visita domiciliaria',
  whatsapp_automatizado: 'WhatsApp automatizado',
}

export const SEGMENT_LABEL: Record<ChildSegment, string> = {
  todos: 'Todos',
  priorizados: 'Priorizados esta semana',
  dificultades: 'Con dificultades',
  sin_respuesta: 'Sin respuesta ≥7 días',
  si_le_di: 'Sí le dio',
}

export const formatAge = (months: number) => `${months} ${months === 1 ? 'mes' : 'meses'}`

export const formatAgeGroup = (child: Pick<ChildListItem, 'ageGroup'>) => AGE_GROUP_LABEL[child.ageGroup]

/** "No le dio" (esta semana) · "No le dio · Semana 42" (una semana anterior). */
export function formatStatus(status: ChildStatus) {
  const label = STATUS_LABEL[status.kind]
  return status.semana && !status.isThisWeek ? `${label} · ${etiquetaSemana(status.semana)}` : label
}

export const formatWeeklyAction = (action: ChildListItem['weeklyAction']) =>
  action.channel === 'visita_domiciliaria'
    ? `Visita Domiciliaria${action.visitOrder ? ` #${action.visitOrder}` : ''}`
    : 'WhatsApp Automatizado'

/** 0.815 → "81.5%" */
export const formatPercent = (ratio: number) => `${(ratio * 100).toFixed(1)}%`
