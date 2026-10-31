/**
 * Adaptador de la Ficha del niño: convierte el historial del niño y su fila en la lista de la semana
 * en los datos de la pantalla. Las llamadas a la API están en @/api/queries (compartidas con las
 * demás pantallas). La API no tiene GET /ninos/{id}: edad, alias, puntaje, motivos y acción salen
 * de la lista; las respuestas del cuidador, del historial.
 */
import type { Accion, FilaLista, Razon, Respuesta, SemanaHistorial, SemanaIso } from '@/api/yawar'
import { capitalizar, grupoEdad, listaMotivos, parentesco, textoRespuesta, ultimaRespuesta } from '@/lib/dominio'
import type {
  BotWeeklyResponse,
  CaregiverReport,
  ChildFollowUp,
  ChildRoster,
  NextActionChannel,
  WeeklyAnswer,
  WeeklyResponseStatus,
} from './types'

/** Semanas que se muestran en las barras de "Respuesta del cuidador". */
export const SEMANAS_TENDENCIA = 8

/** problema → alerta; no le di → interrupción; sí le di → completado; sin respuesta. */
export function statusFor(respuesta: Respuesta): WeeklyResponseStatus {
  switch (respuesta) {
    case 'problema':
      return 'alerta'
    case 'no_le_di':
      return 'interrupcion'
    case 'si_le_di':
      return 'completado'
    default:
      return 'sin_respuesta'
  }
}

/**
 * Qué hizo el sistema con la respuesta. Es una regla fija: los textos que envió el bot no se
 * guardan. Después de "No le di" o "Tuve un problema" el bot manda la lista de motivos, y el niño
 * sube a la Regla 1 desde esa misma semana.
 */
export function outcomeFor(respuesta: Respuesta, razon: Razon | null, isCurrentWeek: boolean) {
  switch (respuesta) {
    case 'problema':
    case 'no_le_di':
      return razon
        ? 'Se envió la lista de motivos. Prioridad R1 en la lista desde esta misma semana.'
        : 'Se envió la lista de motivos (no eligió ninguno). Prioridad R1 en la lista desde esta misma semana.'
    case 'si_le_di':
      return 'Sin dificultades reportadas.'
    default:
      return isCurrentWeek ? 'Semana en curso: aún no responde.' : 'No respondió esa semana.'
  }
}

function channelOf(accion: Accion): NextActionChannel {
  return accion === 'visita' ? 'visita_domiciliaria' : 'whatsapp'
}

/** El historial llega de la semana más reciente a la más antigua; se asegura ese orden. */
function deMasReciente(historial: SemanaHistorial[]) {
  return [...historial].sort((a, b) => b.semana.localeCompare(a.semana))
}

export function buildBotHistory(historial: SemanaHistorial[], semanaActual: SemanaIso): BotWeeklyResponse[] {
  return deMasReciente(historial).map((s) => {
    const isCurrentWeek = s.semana === semanaActual
    return {
      attendances: s.atenciones,
      alarmPending: s.alarma_pendiente,
      semana: s.semana,
      status: statusFor(s.respuesta),
      respuesta: s.respuesta,
      answer: !s.detalle
        ? textoRespuesta(s.respuesta, s.razon)
        : s.detalle.startsWith('(')
          ? s.detalle.slice(1, -1).replace(/^envió/, 'Envió')
          : `${s.respuesta === 'sin_respuesta' ? 'Escribió' : textoRespuesta(s.respuesta, s.razon)}: «${s.detalle}»`,
      outcome: s.alarma
        ? 'Posible señal de peligro: se envió el texto de seguridad y el niño pasó al primer lugar de la lista.'
        : s.derivar
          ? 'Mensaje para que lo lea una persona; el niño subió en la lista.'
          : outcomeFor(s.respuesta, s.razon, isCurrentWeek),
      channel: s.accion ? channelOf(s.accion) : null,
      riskScore: s.puntaje,
      isCurrentWeek,
    }
  })
}

/** Últimas semanas del historial, de la más antigua a la más reciente (para las barras). */
export function buildAnswerTrend(historial: SemanaHistorial[], semanaActual: SemanaIso): WeeklyAnswer[] {
  return deMasReciente(historial)
    .slice(0, SEMANAS_TENDENCIA)
    .reverse()
    .map((s) => ({ semana: s.semana, respuesta: s.respuesta, isCurrentWeek: s.semana === semanaActual }))
}

export function latestReportFor(historial: SemanaHistorial[], semanaActual: SemanaIso): CaregiverReport | null {
  const ultima = ultimaRespuesta(deMasReciente(historial))
  if (!ultima) return null
  return { text: textoRespuesta(ultima.respuesta, ultima.razon), semana: ultima.semana, isThisWeek: ultima.semana === semanaActual }
}

/** Datos del niño que solo trae la lista de la semana. */
export function buildRoster(fila: FilaLista, lista: FilaLista[], semana: SemanaIso): ChildRoster {
  const channel = channelOf(fila.accion)
  // Orden de visita: posición entre los asignados a visita (como en Planificación)
  const visitOrder = lista.filter((f) => f.accion === 'visita' && f.orden <= fila.orden).length
  const relationship = parentesco(fila.alias_cuidador)
  return {
    ageMonths: fila.edad_meses,
    ageGroup: `${grupoEdad(fila.edad_meses)} meses`,
    caregiverAlias: fila.alias_cuidador,
    relationship: relationship === fila.alias_cuidador ? null : relationship,
    priorityRank: fila.orden,
    rosterSize: lista.length,
    riskScore: fila.puntaje,
    reasons: listaMotivos(fila.motivos),
    prioritizedForHomeVisit: fila.accion === 'visita',
    nextAction: {
      channel,
      semana,
      title: channel === 'visita_domiciliaria' ? `Visita domiciliaria #${visitOrder}` : 'Seguimiento por WhatsApp',
      rationale: capitalizar(fila.regla),
    },
  }
}

/**
 * Arma la ficha. `lista` es undefined si no se pudo cargar. Devuelve null si el niño no existe:
 * la API responde [] (y no 404) para un código desconocido, así que "sin historial y fuera de la
 * lista" se trata como no encontrado.
 */
export function buildChildFollowUp(
  code: string,
  historial: SemanaHistorial[],
  lista: FilaLista[] | undefined,
  ctx: { semana: SemanaIso; establecimiento: string },
): ChildFollowUp | null {
  const fila = lista?.find((f) => f.id_nino === code)
  if (lista && !fila && historial.length === 0) return null
  return {
    code,
    establishmentId: ctx.establecimiento,
    rosterStatus: !lista ? 'sin_lista' : fila ? 'en_lista' : 'fuera_de_lista',
    roster: fila && lista ? buildRoster(fila, lista, ctx.semana) : null,
    latestReport: latestReportFor(historial, ctx.semana),
    botHistory: buildBotHistory(historial, ctx.semana),
    answerTrend: buildAnswerTrend(historial, ctx.semana),
  }
}
