import { porcentaje } from '@/lib/dominio'
import { etiquetaSemana, partesSemana, rangoCorto } from '@/lib/semana'
import type { CaregiverReport, ChildFollowUp, NextActionChannel } from './types'

/** Por qué faltan los datos de la lista: "no está en la lista de esta semana de EESS01". */
export function missingRosterReason(child: Pick<ChildFollowUp, 'rosterStatus' | 'establishmentId'>) {
  return child.rosterStatus === 'sin_lista'
    ? `no se pudo cargar la lista de la semana de ${child.establishmentId}`
    : `no está en la lista de esta semana de ${child.establishmentId}`
}

/** "Semana 42 (12 – 18 oct 2026)": semana ISO, no la epidemiológica del MINSA. */
export function weekTitle(semana: string) {
  const partes = partesSemana(semana)
  return partes ? `${etiquetaSemana(semana)} (${rangoCorto(semana)} ${partes.anio})` : semana
}

/** "S42", para las barras. */
export function weekShort(semana: string) {
  const partes = partesSemana(semana)
  return partes ? `S${partes.numero}` : semana
}

/** Riesgo solo en porcentaje: no hay umbrales definidos para alto, medio o bajo. */
export function riskPct(score: number) {
  return porcentaje(score)
}

export function channelName(channel: NextActionChannel) {
  return channel === 'visita_domiciliaria' ? 'Visita domiciliaria' : 'WhatsApp'
}

/** "Esta semana, vía WhatsApp" · "Semana 42, vía WhatsApp" */
export function reportWhen(report: CaregiverReport) {
  return report.isThisWeek ? 'Esta semana, vía WhatsApp' : `${etiquetaSemana(report.semana)}, vía WhatsApp`
}
