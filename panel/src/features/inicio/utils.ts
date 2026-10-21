import type { SemanaIso } from '@/api/yawar'
import { etiquetaSemana, partesSemana, rangoCorto } from '@/lib/semana'
import type { NextAction, PrioritizedChild, PriorityRule } from './types'

/** Saludo para una hora del día (0-23). */
export function greetingFor(hour: number): string {
  if (hour < 12) return 'Buenos días'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

/** "Semana 43 (19 – 25 oct, 2026)": semana ISO de la API, no la semana epidemiológica del MINSA. */
export function weekLabel(semana: SemanaIso): string {
  const partes = partesSemana(semana)
  return partes ? `${etiquetaSemana(semana)} (${rangoCorto(semana)}, ${partes.anio})` : semana
}

/** 40 -> '40%', 81.818 -> '81.8%' (con `decimals` = 1). */
export function formatPct(value: number, decimals = 0): string {
  return `${Number(value.toFixed(decimals))}%`
}

export function percentOf(part: number, total: number): number {
  return total > 0 ? (part / total) * 100 : 0
}

/** "1 niño" · "4 niños" */
export function plural(n: number, singular: string, pluralForm = `${singular}s`) {
  return `${n} ${n === 1 ? singular : pluralForm}`
}

export function riskPct(child: Pick<PrioritizedChild, 'riskScore'>) {
  return Math.round(child.riskScore * 100)
}

export type ActionIcon = 'walk' | 'chat'

export function describeNextAction(action: NextAction): { label: string; icon: ActionIcon } {
  return action.type === 'home_visit'
    ? { label: `Visita domiciliaria #${action.visitOrder}`, icon: 'walk' }
    : { label: 'Seguimiento por WhatsApp', icon: 'chat' }
}

export type PriorityFilter = 'all' | PriorityRule

export function countByRule(items: PrioritizedChild[]): Record<PriorityFilter, number> {
  const counts: Record<PriorityFilter, number> = { all: items.length, R1: 0, R2: 0, R3: 0 }
  for (const item of items) counts[item.rule] += 1
  return counts
}
