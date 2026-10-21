/**
 * Adaptador de Indicadores: convierte la respuesta de GET /establecimientos/{id}/indicadores y los
 * historiales de los niños en los datos de la pantalla. Las llamadas a la API están en
 * @/api/queries (compartidas con las demás pantallas); aquí solo hay funciones puras.
 */
import type { Indicadores, Razon, SemanaHistorial, SemanaIndicadores, SemanaIso } from '@/api/yawar'
import { ORDEN_RAZONES, RAZONES, tasa } from '@/lib/dominio'
import { etiquetaSemana, etiquetaSemanaLarga } from '@/lib/semana'
import type { DifficultyReason, DifficultySummary, IndicatorsReport, WeekOption, WeeklyTrendPoint } from './types'

/** Colores del diseño para cada razón del bot (digestivo, sabor, frasco, olvido, otros). */
export const REASON_COLORS: Record<Razon, string> = {
  estrenimiento: '#906f6d',
  sabor: '#635d5d',
  se_acabo: '#cdc5c4',
  olvido: '#d4dcd5',
  otro: '#e4bdbb',
}

/* ------------------------------------------------------------ indicadores */

function sinEnvios(semana: SemanaIso): SemanaIndicadores {
  return { semana, enviados: 0, fallidos: 0, respondidos: 0, si_le_di: 0 }
}

export function trendPoint(fila: SemanaIndicadores, semanaActual: SemanaIso): WeeklyTrendPoint {
  return {
    semana: fila.semana,
    label: etiquetaSemana(fila.semana),
    sent: fila.enviados,
    responses: fila.respondidos,
    responseRate: tasa(fila.respondidos, fila.enviados),
    inProgress: fila.semana === semanaActual,
  }
}

/**
 * Indicadores de la semana analizada: la pedida o, si no se pidió ninguna, la última de la serie
 * (la API siempre incluye la semana pedida, aunque no haya tenido envíos).
 */
export function buildIndicatorsReport(
  indicadores: Indicadores,
  ctx: { semana?: SemanaIso; semanaActual: SemanaIso },
): IndicatorsReport {
  const { serie } = indicadores
  const semana = ctx.semana ?? serie[serie.length - 1]?.semana ?? ctx.semanaActual
  const fila = serie.find((s) => s.semana === semana) ?? sinEnvios(semana)
  const attempted = fila.enviados + fila.fallidos
  return {
    establishmentId: indicadores.establecimiento_id,
    semana,
    hasActivity: attempted > 0 || fila.respondidos > 0,
    reminders: { attempted, sent: fila.enviados },
    deliveryFailures: { count: fila.fallidos, share: tasa(fila.fallidos, attempted) },
    responses: { received: fila.respondidos, sent: fila.enviados, rate: tasa(fila.respondidos, fila.enviados) },
    adherence: {
      declaredYes: fila.si_le_di,
      // La API no separa «No le di» de «Tuve un problema»: son las respuestas que no fueron «Sí le di»
      casesWithDifficulties: Math.max(0, fila.respondidos - fila.si_le_di),
    },
    weeklyTrend: serie.map((s) => trendPoint(s, ctx.semanaActual)),
    metaAlert: indicadores.meta_alerta,
  }
}

/** Semanas del selector: las de la serie, de la más reciente a la más antigua (máximo 5). */
export function weekOptionsFrom(indicadores: Indicadores, semanaActual: SemanaIso): WeekOption[] {
  return [...indicadores.serie].reverse().map((s) => ({
    semana: s.semana,
    label: `${etiquetaSemanaLarga(s.semana)}${s.semana === semanaActual ? ' (en curso)' : ''}`,
  }))
}

/* ------------------------------------------------------------------ gráfico */

/** Altura en px de la barra con el valor más alto de la serie. */
export const MAX_BAR_PX = 130

/** Valor más alto de la serie (envíos o respuestas): es la barra más alta del gráfico. */
export function chartMax(points: Pick<WeeklyTrendPoint, 'sent' | 'responses'>[]) {
  return Math.max(0, ...points.flatMap((p) => [p.sent, p.responses]))
}

/** Altura de una barra, proporcional al valor más alto real de la serie (no una altura fija por unidad). */
export function barHeight(value: number, max: number, maxPx = MAX_BAR_PX) {
  return max > 0 ? (value / max) * maxPx : 0
}

/* ------------------------------------------------------------------ motivos */

/**
 * Cuenta los motivos de dificultad de una semana con el historial de cada niño de la lista: la API no
 * los cuenta. Las 5 razones del diseño calzan 1 a 1 con las del bot.
 */
export function countDifficultyReasons(
  historiales: Record<string, SemanaHistorial[]>,
  semana: SemanaIso,
): DifficultySummary {
  const casos = Object.fromEntries(ORDEN_RAZONES.map((razon) => [razon, 0])) as Record<Razon, number>
  let familiesReporting = 0
  let withoutReason = 0
  const ninos = Object.values(historiales)
  for (const historial of ninos) {
    const registro = historial.find((s) => s.semana === semana)
    if (!registro || (registro.respuesta !== 'no_le_di' && registro.respuesta !== 'problema')) continue
    familiesReporting++
    if (registro.razon) casos[registro.razon]++
    else withoutReason++
  }
  // sort es estable: a igual cantidad de casos se mantiene el orden de ORDEN_RAZONES
  const reasons = ORDEN_RAZONES.map(
    (razon): DifficultyReason => ({ id: razon, label: RAZONES[razon], cases: casos[razon], color: REASON_COLORS[razon] }),
  ).sort((a, b) => b.cases - a.cases)
  return { semana, familiesReporting, reasons, withoutReason, childrenCounted: ninos.length }
}

/** Motivos con más casos (puede haber empate); vacío si nadie indicó un motivo. */
export function topReasons(summary: DifficultySummary) {
  const max = Math.max(0, ...summary.reasons.map((r) => r.cases))
  return max > 0 ? summary.reasons.filter((r) => r.cases === max) : []
}

/** "Motivo más frecuente: Estreñimiento (2 casos)" · null si no hay motivos. */
export function topReasonText(summary: DifficultySummary) {
  const top = topReasons(summary)
  if (top.length === 0) return null
  const casos = `${top[0].cases} ${top[0].cases === 1 ? 'caso' : 'casos'}`
  return top.length === 1
    ? `Motivo más frecuente: ${top[0].label} (${casos})`
    : `Motivos más frecuentes: ${top.map((r) => r.label).join(', ')} (${casos} cada uno)`
}

/* --------------------------------------------------------------------- CSV */

function csvCell(value: string | number) {
  const text = String(value)
  return /[",;\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function pctCsv(rate: number | null) {
  return rate === null ? '' : (rate * 100).toFixed(1)
}

export function buildIndicatorsCsv(report: IndicatorsReport, difficulties?: DifficultySummary) {
  const rows: Array<Array<string | number>> = [
    ['Indicador', 'Valor'],
    ['Establecimiento', report.establishmentId],
    ['Semana', etiquetaSemanaLarga(report.semana)],
    ['Recordatorios programados (enviados + fallidos)', report.reminders.attempted],
    ['Enviados (aceptados por WhatsApp)', report.reminders.sent],
    ['Fallas de envío', report.deliveryFailures.count],
    ['Fallas de envío (% de los intentos)', pctCsv(report.deliveryFailures.share)],
    ['Respuestas recibidas', report.responses.received],
    ['Tasa de respuesta (% = respuestas / enviados)', pctCsv(report.responses.rate)],
    ['Respondieron «Sí le di»', report.adherence.declaredYes],
    ['Casos con dificultades («No le di» o «Tuve un problema»)', report.adherence.casesWithDifficulties],
    ['Meta-alerta', report.metaAlert ?? 'Ninguna'],
    [],
    ['Semana', 'Enviados', 'Respuestas recibidas', 'Tasa de respuesta (%)'],
    ...report.weeklyTrend.map((p) => [p.semana, p.sent, p.responses, pctCsv(p.responseRate)]),
  ]
  if (difficulties) {
    rows.push(
      [],
      [`Motivo de dificultad (${etiquetaSemana(difficulties.semana)}, niños de la lista actual)`, 'Casos'],
      ...difficulties.reasons.map((r) => [r.label, r.cases]),
    )
    if (difficulties.withoutReason > 0) rows.push(['Sin motivo indicado', difficulties.withoutReason])
  }
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
}
