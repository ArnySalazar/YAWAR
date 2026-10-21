import iconMsgProblem from './assets/icon-msg-problem-warning.svg'
import iconMsgDislike from './assets/icon-msg-dislike.svg'
import iconMsgSupplyOut from './assets/icon-msg-supply-out.svg'
import iconMsgForgot from './assets/icon-msg-forgot.svg'
import iconMsgNoResponse from './assets/icon-msg-no-response.svg'
import iconMsgFavorable from './assets/icon-msg-favorable.svg'
import type { Accion } from '@/api/yawar'
import type { CommunicationResponse, ReasonCode, ReasonSeverity, ResponseTab } from './types'

/* Mapeos de códigos -> textos / íconos / colores del Figma. */

export interface IconSpec {
  src: string
  width: number
  height: number
  /** Ajuste vertical cuando el SVG no trae su propio margen superior. */
  className?: string
}

export const TAB_LABELS: Record<ResponseTab, string> = {
  todas: 'Todas',
  con_dificultades: 'Con dificultades',
  sin_respuesta: 'Sin respuesta',
  favorable: 'Con respuesta favorable',
}

export const TAB_ORDER: ResponseTab[] = ['todas', 'con_dificultades', 'sin_respuesta', 'favorable']

/** Acción asignada al niño en la semana (`accion` del historial). */
export const ACTION_LABELS: Record<Accion | 'ninguna', string> = {
  visita: 'Visita domiciliaria',
  whatsapp: 'Seguimiento por WhatsApp',
  ninguna: 'Solo recordatorio',
}

const PROBLEM_ICON: IconSpec = { src: iconMsgProblem, width: 16.5, height: 16.25 }

/** Ícono que acompaña a la respuesta según el motivo. Los SVG del Figma ya incluyen 2px de margen superior. */
const REASON_ICONS: Record<ReasonCode, IconSpec> = {
  estrenimiento: PROBLEM_ICON,
  sabor: { src: iconMsgDislike, width: 15, height: 17 },
  se_acabo: { src: iconMsgSupplyOut, width: 15.75, height: 15.5 },
  olvido: { src: iconMsgForgot, width: 13.5, height: 17 },
  otro: PROBLEM_ICON,
  consumo_completo: { src: iconMsgFavorable, width: 14.6, height: 8.017, className: 'mt-[5.5px]' },
}

const NO_RESPONSE_ICON: IconSpec = { src: iconMsgNoResponse, width: 15, height: 18.5 }

export function messageIconFor(item: Pick<CommunicationResponse, 'responseType' | 'reason'>): IconSpec {
  if (item.responseType === 'sin_respuesta') return NO_RESPONSE_ICON
  return item.reason ? REASON_ICONS[item.reason] : PROBLEM_ICON
}

/** Colores de la etiqueta de motivo según gravedad. */
export const REASON_TAG_CLASSES: Record<ReasonSeverity, string> = {
  critica: 'bg-[#ffdad6] text-[#93000a]',
  advertencia: 'bg-[#ffddb3] text-[#291800]',
  neutral: 'bg-[#e2eae3] text-muted',
  positiva: 'bg-[#e8f0e8] text-success',
}

export function formatAge(months: number) {
  return `${months} ${months === 1 ? 'mes' : 'meses'}`
}

/** 0.815 -> "81.5%", 1 -> "100%" */
export function formatRate(rate: number) {
  const value = Math.round(rate * 1000) / 10
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`
}
