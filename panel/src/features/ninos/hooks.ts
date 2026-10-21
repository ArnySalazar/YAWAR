import { useMemo } from 'react'
import { useHistoriales, useHoy, useIndicadores, useListaSemana } from '@/api/queries'
import { useEstablecimiento } from '@/features/establecimiento/EstablecimientoProvider'
import { attachResponses, buildChildren, summarizeChildren, weeklyResponseFrom } from './api'

/**
 * Niños de la semana: la lista de la API (la misma que usa Planificación, sin regenerarla), la
 * respuesta de cada cuidador (historial) y la tasa de respuesta de la semana (indicadores).
 * Mientras la lista no llega, `children` es un arreglo vacío.
 */
export function useChildren() {
  const { semana } = useHoy()
  const { establecimiento } = useEstablecimiento()
  const lista = useListaSemana()
  const historiales = useHistoriales()
  const indicadores = useIndicadores()

  const children = useMemo(
    () => attachResponses(buildChildren(lista.data ?? [], establecimiento), historiales.data, semana),
    [lista.data, establecimiento, historiales.data, semana],
  )

  const historialesState = historiales.isError ? 'error' : historiales.data ? 'listo' : 'cargando'
  const summary = useMemo(() => {
    const weeklyResponse = indicadores.data
      ? weeklyResponseFrom(indicadores.data, semana)
      : indicadores.isError
        ? null
        : undefined
    return summarizeChildren(children, weeklyResponse, historialesState)
  }, [children, indicadores.data, indicadores.isError, semana, historialesState])

  return { lista, historiales, children, summary, semana, establecimiento }
}
