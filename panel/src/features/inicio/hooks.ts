import { useMemo } from 'react'
import { useHoy, useIndicadores, useSalud } from '@/api/queries'
import type { FilaLista } from '@/api/yawar'
import { useEstablecimiento } from '@/features/establecimiento/EstablecimientoProvider'
import { buildAlerts, buildHomeOverview, buildWhatsappStats } from './api'
import { greetingFor } from './utils'

/** Resumen de la semana a partir de la lista (la misma que usa Planificación). */
export function useHomeOverview(lista: FilaLista[]) {
  const { semana } = useHoy()
  const { establecimiento, capacidad } = useEstablecimiento()
  return useMemo(
    () => buildHomeOverview(lista, { semana, establecimiento, capacidad }),
    [lista, semana, establecimiento, capacidad],
  )
}

/** Respuestas al recordatorio de la semana en curso (indicadores de la API). */
export function useWhatsappStats() {
  const query = useIndicadores()
  const stats = useMemo(() => (query.data ? buildWhatsappStats(query.data) : null), [query.data])
  return { query, stats }
}

/** Alertas de la lista + la meta-alerta de los indicadores. */
export function useOperationalAlerts(lista: FilaLista[]) {
  const query = useIndicadores()
  const metaAlerta = query.data?.meta_alerta
  const alerts = useMemo(() => buildAlerts(lista, metaAlerta), [lista, metaAlerta])
  return { query, alerts }
}

/** Saludo según la hora de Lima que informa la API (o la del navegador mientras responde). */
export function useGreeting() {
  const salud = useSalud()
  const hora = salud.data ? Number(salud.data.hora_local.slice(11, 13)) : new Date().getHours()
  return greetingFor(hora)
}
