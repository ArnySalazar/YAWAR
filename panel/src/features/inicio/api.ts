/**
 * Adaptador de Inicio: convierte la lista de la semana y los indicadores de la API en los datos de
 * la pantalla. Las llamadas a la API están en @/api/queries (compartidas con las demás pantallas).
 * Inicio NO genera la lista por su cuenta: usa la misma de Planificación (useListaSemana).
 */
import type { FilaLista, Indicadores, SemanaIso } from '@/api/yawar'
import { capitalizar, listaMotivos, senalDeFila, tasa } from '@/lib/dominio'
import { signalFor } from '@/features/planificacion/api'
import type { HomeOverview, OperationalAlert, PrioritizedChild, WhatsappStats } from './types'

/* ------------------------------------------------------------ lista de la semana */

/** R1 y R2: el texto de `seguimiento` de la API; R3: los motivos del modelo. */
export function statusTextFor(fila: Pick<FilaLista, 'seguimiento' | 'motivos'>) {
  if (fila.seguimiento) return capitalizar(fila.seguimiento)
  const motivos = listaMotivos(fila.motivos)
  return motivos.length ? capitalizar(motivos.join('; ')) : 'Sin factores destacados'
}

/** La lista en orden de prioridad, con la regla (R1, R2, R3) y el número de visita de cada niño. */
export function toPrioritizedChildren(lista: FilaLista[]): PrioritizedChild[] {
  let visita = 0
  return [...lista]
    .sort((a, b) => a.orden - b.orden)
    .map((fila): PrioritizedChild => {
      const signal = signalFor(fila)
      return {
        id: fila.id_nino,
        code: fila.id_nino,
        ageMonths: fila.edad_meses,
        caregiverAlias: fila.alias_cuidador,
        rank: fila.orden,
        rule: signal.rule,
        signalLabel: signal.label,
        statusText: statusTextFor(fila),
        riskScore: fila.puntaje,
        nextAction:
          fila.accion === 'visita' ? { type: 'home_visit', visitOrder: ++visita } : { type: 'whatsapp_followup' },
      }
    })
}

const pctDe = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 100) : 0)

export function buildHomeOverview(
  lista: FilaLista[],
  ctx: { semana: SemanaIso; establecimiento: string; capacidad: number },
): HomeOverview {
  const children = toPrioritizedChildren(lista)
  const total = children.length
  const assigned = children.filter((c) => c.nextAction.type === 'home_visit').length
  const prioritized = children.filter((c) => c.rule !== 'R3').length
  const edades = lista.map((fila) => fila.edad_meses)
  return {
    semana: ctx.semana,
    establishmentId: ctx.establecimiento,
    roster: {
      total,
      ageRangeMonths: edades.length ? { min: Math.min(...edades), max: Math.max(...edades) } : null,
    },
    prioritized: { total: prioritized, registrySharePct: pctDe(prioritized, total) },
    homeVisits: { assigned, capacityN: ctx.capacidad, coveragePct: pctDe(assigned, ctx.capacidad) },
    whatsappFollowUps: total - assigned,
    children,
  }
}

/* ------------------------------------------------------------------ indicadores */

/** Respuestas al recordatorio de la semana en curso: la última semana de la serie de indicadores. */
export function buildWhatsappStats(indicadores: Pick<Indicadores, 'serie'>): WhatsappStats | null {
  const ultima = indicadores.serie.at(-1)
  if (!ultima) return null
  return {
    semana: ultima.semana,
    sent: ultima.enviados,
    failed: ultima.fallidos,
    responses: ultima.respondidos,
    responseRate: tasa(ultima.respondidos, ultima.enviados),
  }
}

/* ---------------------------------------------------------------------- alertas */

/** Limitación conocida de la meta-alerta (hallazgo 11). */
export const META_ALERT_NOTE =
  'Al inicio de la semana puede salir aunque nada esté roto: compara la semana en curso, que todavía está ' +
  'recibiendo respuestas, con semanas ya completas.'

/**
 * Alertas de Inicio: la meta-alerta de la API (el sistema dejó de enviar o de recibir mensajes) y
 * los niños con señal R1 (nivel 0) o R2 (nivel 1) en la lista de la semana.
 */
export function buildAlerts(lista: FilaLista[], metaAlerta: string | null | undefined): OperationalAlert[] {
  let noLeDi = 0
  let problema = 0
  let sinRespuesta = 0
  for (const fila of lista) {
    const senal = senalDeFila(fila)
    if (senal === 'no_le_di') noLeDi++
    else if (senal === 'problema') problema++
    else if (senal === 'sin_respuesta') sinRespuesta++
  }

  const alerts: OperationalAlert[] = []
  if (metaAlerta) {
    alerts.push({
      type: 'meta_alert',
      title: 'Meta-alerta del sistema',
      description: metaAlerta,
      note: META_ALERT_NOTE,
      tag: 'Revisar el sistema',
      affectedChildren: null,
    })
  }

  const r1 = noLeDi + problema
  if (r1 > 0) {
    alerts.push({
      type: 'reported_problem',
      title: r1 === 1 ? '1 reportó problema o no le dio' : `${r1} reportaron problema o no le dieron`,
      description:
        `Cuidadores con una posible señal de peligro, un mensaje para leer, o que esta semana o la anterior respondieron «No le di» (${noLeDi}) o «Tuve un problema» (${problema}). ` +
        'Van primero en la lista.',
      note: null,
      tag: 'Regla R1',
      affectedChildren: r1,
    })
  }

  if (sinRespuesta > 0) {
    alerts.push({
      type: 'no_response',
      title: sinRespuesta === 1 ? '1 niño sin respuesta' : `${sinRespuesta} niños sin respuesta`,
      description:
        sinRespuesta === 1
          ? 'Su cuidador no responde el recordatorio hace 7 días o más.'
          : 'Sus cuidadores no responden el recordatorio hace 7 días o más.',
      note: null,
      tag: 'Regla R2',
      affectedChildren: sinRespuesta,
    })
  }

  return alerts
}
