import { useMemo } from 'react'
import { useHistoriales, useHoy, useIndicadores, useListaSemana } from '@/api/queries'
import type { SemanaIso } from '@/api/yawar'
import { buildWeekResponses, weekOptions } from './api'

/**
 * Indicadores de la semana elegida. La semana actual se pide sin parámetro, para reutilizar la misma
 * consulta que el encabezado; las anteriores, con ?semana=.
 */
export function useWeekIndicators(semana: SemanaIso) {
  const { semana: actual } = useHoy()
  return useIndicadores(semana === actual ? undefined : semana)
}

/** Semanas del selector: las de la serie de indicadores (las que tuvieron envíos) y la actual. */
export function useWeekOptions() {
  const { semana } = useHoy()
  const indicadores = useIndicadores()
  return useMemo(() => weekOptions(indicadores.data?.serie ?? [], semana), [indicadores.data, semana])
}

/**
 * Respuestas de la semana de cada niño de la lista actual: la lista + el historial de cada uno
 * (una llamada por niño, compartida con las demás pantallas).
 */
export function useWeekResponses(semana: SemanaIso) {
  const lista = useListaSemana()
  const historiales = useHistoriales()
  const data = useMemo(
    () => (lista.data && historiales.data ? buildWeekResponses(lista.data, historiales.data, semana) : undefined),
    [lista.data, historiales.data, semana],
  )
  return { lista, historiales, data }
}
