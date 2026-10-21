import { etiquetaSemana, partesSemana, rangoCorto } from '@/lib/semana'
import type { ChannelAssignment, PlannedChild, PrioritySignalKind, WeeklyPlan } from './types'

/* ------------------------------------------------------------------ resumen */

export interface PlanSummary {
  total: number
  homeVisits: number
  whatsapp: number
  /** R1: reportaron "No le di" o "Tuve un problema" la semana pasada. */
  difficulties: number
  /** R1 + R2: con señal de seguimiento (los "priorizados"). */
  withSignal: number
  /** % del padrón con señal de seguimiento. */
  signalPct: number
  /** % de la capacidad N comprometida con visitas asignadas. */
  capacityPct: number
}

export function summarizePlan(plan: WeeklyPlan): PlanSummary {
  const total = plan.children.length
  const homeVisits = plan.children.filter((c) => c.assignment.channel === 'home_visit').length
  const withSignal = plan.children.filter((c) => c.signal.rule !== 'R3').length
  return {
    total,
    homeVisits,
    whatsapp: total - homeVisits,
    difficulties: plan.children.filter((c) => c.hasDifficulty).length,
    withSignal,
    signalPct: total > 0 ? Math.round((withSignal / total) * 100) : 0,
    capacityPct: plan.visitCapacity > 0 ? Math.round((homeVisits / plan.visitCapacity) * 100) : 0,
  }
}

/** Orden de la tabla: visitas (#1..#N) y luego seguimiento por WhatsApp. */
export function sortForDisplay(children: PlannedChild[]): PlannedChild[] {
  return [...children].sort((a, b) => {
    const channelDiff = Number(a.assignment.channel === 'whatsapp') - Number(b.assignment.channel === 'whatsapp')
    if (channelDiff !== 0) return channelDiff
    return a.priorityRank - b.priorityRank
  })
}

/* ------------------------------------------------------------------ fechas */

/** "Semana 43 (19 – 25 oct, 2026)" */
export function formatWeekLabel(plan: Pick<WeeklyPlan, 'semana'>) {
  const partes = partesSemana(plan.semana)
  return partes ? `${etiquetaSemana(plan.semana)} (${rangoCorto(plan.semana)}, ${partes.anio})` : plan.semana
}

/** "Esta semana" · "Semana 42" */
export function reportWhen(report: { semana: string; isThisWeek: boolean }) {
  return report.isThisWeek ? 'Esta semana, vía WhatsApp' : `${etiquetaSemana(report.semana)}, vía WhatsApp`
}

/* --------------------------------------------------------- etiquetas/tonos */

export function signalBadgeText(child: PlannedChild) {
  return `${child.signal.label} (${child.signal.rule})`
}

export const signalTone: Record<PrioritySignalKind, { badge: string; dot: string | null; bar: string }> = {
  reported_problem: { badge: 'bg-[#ffdad7] text-[#930018]', dot: 'bg-[#b81025]', bar: 'bg-[#b81025]' },
  intake_rejection: { badge: 'bg-[#ffdad7] text-[#930018]', dot: 'bg-[#b81025]', bar: 'bg-[#b81025]' },
  no_response: { badge: 'bg-[#ffddb3] text-[#603e00]', dot: 'bg-[#603e00]', bar: 'bg-[#603e00]' },
  predictive_risk: { badge: 'bg-[#f1f3f2] text-[#161d19]', dot: 'bg-[#635d5d]', bar: 'bg-[#635d5d]' },
}

/** El círculo replica el tono de la señal; los casos de WhatsApp van atenuados. */
export function avatarTone(child: PlannedChild) {
  if (child.assignment.channel === 'whatsapp') return 'bg-[#f1f3f2] text-[#635d5d]'
  switch (child.signal.kind) {
    case 'reported_problem':
      return 'bg-[#ffdad7] text-[#b81025]'
    case 'intake_rejection':
      return 'bg-[#ffddb3] text-[#291800]'
    case 'no_response':
      return 'bg-[#dde5dd] text-[#161d19]'
    default:
      return 'bg-[#f1f3f2] text-[#161d19]'
  }
}

export function channelLabel(assignment: ChannelAssignment) {
  return assignment.channel === 'home_visit' ? `Visita domiciliaria #${assignment.visitOrder ?? '–'}` : 'WhatsApp automatizado'
}

export function caregiverLine(child: PlannedChild) {
  return `${child.ageMonths} meses · ${child.caregiverAlias}`
}

export function riskPct(child: PlannedChild) {
  return Math.round(child.riskScore * 100)
}

/* -------------------------------------------------------------------- CSV */

function csvCell(value: string | number) {
  const text = String(value)
  return /[",;\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function buildPlanCsv(children: PlannedChild[]) {
  const header = [
    'Prioridad',
    'Código',
    'Edad (meses)',
    'Cuidador',
    'Señal de prioridad',
    'Última respuesta',
    'Riesgo de no consumo (%)',
    'Canal asignado',
    'Motivos',
    'Regla',
  ]
  const lines = sortForDisplay(children).map((child) => [
    child.priorityRank,
    child.code,
    child.ageMonths,
    child.caregiverAlias,
    signalBadgeText(child),
    child.lastReport ? child.lastReport.text : 'Sin respuestas registradas',
    riskPct(child),
    channelLabel(child.assignment),
    child.reasons.join('; '),
    child.ruleText,
  ])
  return [header, ...lines].map((line) => line.map(csvCell).join(',')).join('\r\n')
}

export function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob(['﻿', content], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
