/**
 * Adaptador de "Niños en seguimiento": convierte la lista de la semana, el historial de cada niño
 * y los indicadores de la API en los datos de la pantalla. Las llamadas a la API están en
 * @/api/queries (compartidas con las demás pantallas); aquí solo hay funciones puras.
 */
import type { FilaLista, Indicadores, SemanaHistorial, SemanaIso } from '@/api/yawar'
import { grupoEdad, respuestaDeSemana, senalDeFila, tasa, textoRespuesta, ultimaRespuesta } from '@/lib/dominio'
import type { ChildListItem, ChildStatus, ChildrenSummary, WeekResponse, WeeklyResponseSummary } from './types'

/** Una fila por niño, en el orden de la lista; las visitas se numeran #1..#N. */
export function buildChildren(lista: FilaLista[], establecimiento: string): ChildListItem[] {
  const ordenada = [...lista].sort((a, b) => a.orden - b.orden)
  let visita = 0
  return ordenada.map(
    (fila): ChildListItem => ({
      code: fila.id_nino,
      priorityRank: fila.orden,
      ageMonths: fila.edad_meses,
      ageGroup: grupoEdad(fila.edad_meses),
      establishmentId: establecimiento,
      caregiverAlias: fila.alias_cuidador,
      signal: senalDeFila(fila),
      weeklyAction:
        fila.accion === 'visita'
          ? { channel: 'visita_domiciliaria', visitOrder: ++visita }
          : { channel: 'whatsapp_automatizado', visitOrder: null },
      prioritizedThisWeek: fila.nivel !== 2,
    }),
  )
}

/** Estado de seguimiento: la última respuesta registrada; "Sin respuesta" si nunca respondió. */
export function statusFor(historial: SemanaHistorial[] | undefined, semanaActual: SemanaIso): ChildStatus {
  const ultima = ultimaRespuesta(historial)
  if (!ultima) return { kind: 'sin_respuesta', semana: null, isThisWeek: false }
  return { kind: ultima.respuesta, semana: ultima.semana, isThisWeek: ultima.semana === semanaActual }
}

/** Respuesta de la semana en curso; si no hay registro de esa semana, aún no respondió. */
export function weekResponseFor(historial: SemanaHistorial[] | undefined, semanaActual: SemanaIso): WeekResponse {
  const semana = respuestaDeSemana(historial, semanaActual)
  if (!semana) return { kind: 'sin_respuesta', label: textoRespuesta('sin_respuesta', null) }
  return { kind: semana.respuesta, label: textoRespuesta(semana.respuesta, semana.razon) }
}

/** Agrega estado y respuesta de la semana a cada niño; sin historiales (cargando o error), quedan undefined. */
export function attachResponses(
  children: ChildListItem[],
  historiales: Record<string, SemanaHistorial[]> | undefined,
  semanaActual: SemanaIso,
): ChildListItem[] {
  if (!historiales) return children
  return children.map((child) => ({
    ...child,
    status: statusFor(historiales[child.code], semanaActual),
    weekResponse: weekResponseFor(historiales[child.code], semanaActual),
  }))
}

/**
 * Respuestas de la semana según los indicadores. Las semanas sin envíos no aparecen en la serie:
 * si falta la semana en curso, aún no se envió ningún recordatorio.
 */
export function weeklyResponseFrom(indicadores: Indicadores, semanaActual: SemanaIso): WeeklyResponseSummary {
  const semana = indicadores.serie.find((s) => s.semana === semanaActual)
  const responded = semana?.respondidos ?? 0
  const contacted = semana?.enviados ?? 0
  return { responded, contacted, returnRate: tasa(responded, contacted) }
}

export function summarizeChildren(
  children: ChildListItem[],
  weeklyResponse: WeeklyResponseSummary | null | undefined,
  historialesState: 'cargando' | 'error' | 'listo',
): ChildrenSummary {
  const edades = children.map((child) => child.ageMonths)
  const assigned = children.filter((child) => child.weeklyAction.channel === 'visita_domiciliaria').length
  const problems = children.filter((child) => child.status?.kind === 'problema').length
  const refusals = children.filter((child) => child.status?.kind === 'no_le_di').length
  return {
    totalActive: children.length,
    ageRange: edades.length ? { minMonths: Math.min(...edades), maxMonths: Math.max(...edades) } : null,
    weeklyResponse,
    homeVisits: { assigned, whatsapp: children.length - assigned },
    alerts:
      historialesState === 'listo'
        ? { active: problems + refusals, problems, refusals }
        : historialesState === 'cargando'
          ? undefined
          : null,
  }
}
