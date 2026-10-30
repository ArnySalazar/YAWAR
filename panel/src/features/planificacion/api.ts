/**
 * Adaptador de Planificación: convierte la lista de la API y los historiales en los datos de la
 * pantalla. Las llamadas a la API están en @/api/queries (compartidas con las demás pantallas).
 */
import type { FilaLista, SemanaHistorial, SemanaIso } from '@/api/yawar'
import { capitalizar, listaMotivos, senalDeFila, textoRespuesta, ultimaRespuesta } from '@/lib/dominio'
import { rangoSemana } from '@/lib/semana'
import type { CaregiverReport, PlannedChild, PrioritySignal, WeeklyPlan } from './types'

export function signalFor(fila: Pick<FilaLista, 'nivel' | 'seguimiento'>): PrioritySignal {
  const nota = fila.seguimiento ?? ''
  if (nota.startsWith('POSIBLE SEÑAL')) return { kind: 'reported_problem', rule: 'R1', label: 'Posible peligro' }
  if (nota.startsWith('mensaje para leer')) return { kind: 'reported_problem', rule: 'R1', label: 'Mensaje para leer' }
  switch (senalDeFila(fila)) {
    case 'problema':
      return { kind: 'reported_problem', rule: 'R1', label: 'Reportó problema' }
    case 'no_le_di':
      return { kind: 'intake_rejection', rule: 'R1', label: 'No le dio' }
    case 'sin_respuesta':
      return { kind: 'no_response', rule: 'R2', label: 'Sin respuesta' }
    default:
      return { kind: 'predictive_risk', rule: 'R3', label: 'Por puntaje' }
  }
}

export function buildWeeklyPlan(
  lista: FilaLista[],
  ctx: { semana: SemanaIso; hoy: string; establecimiento: string; capacidad: number },
): WeeklyPlan {
  const ordenada = [...lista].sort((a, b) => a.orden - b.orden)
  let visita = 0
  const children = ordenada.map(
    (fila): PlannedChild => ({
      id: fila.id_nino,
      code: fila.id_nino,
      ageMonths: fila.edad_meses,
      caregiverAlias: fila.alias_cuidador,
      priorityRank: fila.orden,
      signal: signalFor(fila),
      followUpNote: fila.seguimiento ? capitalizar(fila.seguimiento) : null,
      reasons: listaMotivos(fila.motivos),
      ruleText: capitalizar(fila.regla),
      riskScore: fila.puntaje,
      hasDifficulty: fila.nivel === 0,
      assignment:
        fila.accion === 'visita'
          ? { channel: 'home_visit', visitOrder: ++visita }
          : { channel: 'whatsapp', visitOrder: null },
    }),
  )
  const edades = lista.map((fila) => fila.edad_meses)
  const rango = rangoSemana(ctx.semana)
  return {
    semana: ctx.semana,
    startDate: rango?.inicio ?? ctx.hoy,
    endDate: rango?.fin ?? ctx.hoy,
    referenceDate: ctx.hoy,
    establishmentId: ctx.establecimiento,
    rosterSize: lista.length,
    ageRange: edades.length ? { minMonths: Math.min(...edades), maxMonths: Math.max(...edades) } : null,
    visitCapacity: ctx.capacidad,
    children,
  }
}

export function lastReportFor(historial: SemanaHistorial[] | undefined, semanaActual: SemanaIso): CaregiverReport | null {
  const ultima = ultimaRespuesta(historial)
  if (!ultima) return null
  return { text: textoRespuesta(ultima.respuesta, ultima.razon), semana: ultima.semana, isThisWeek: ultima.semana === semanaActual }
}

/** Agrega la última respuesta de cada cuidador; sin historiales (cargando), queda undefined. */
export function attachLastReports(
  plan: WeeklyPlan,
  historiales: Record<string, SemanaHistorial[]> | undefined,
): WeeklyPlan {
  if (!historiales) return plan
  return {
    ...plan,
    children: plan.children.map((child) => ({ ...child, lastReport: lastReportFor(historiales[child.id], plan.semana) })),
  }
}
