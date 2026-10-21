import { useMemo, useState } from 'react'
import { useHistoriales, useHoy, useIndicadores, useListaSemana } from '@/api/queries'
import type { SemanaIso } from '@/api/yawar'
import { useEstablecimiento } from '@/features/establecimiento/EstablecimientoProvider'
import { buildIndicatorsReport, countDifficultyReasons, weekOptionsFrom } from './api'

/**
 * Semana elegida y sus indicadores. Las semanas disponibles salen de la serie de la semana actual
 * (máximo 5, solo las que tuvieron envíos); al elegir otra se pide `?semana=` a la API.
 */
export function useIndicatorsReport() {
  const { establecimiento } = useEstablecimiento()
  const { semana: semanaActual } = useHoy()
  const actual = useIndicadores()
  // Se recuerda con su establecimiento: al cambiar de establecimiento se vuelve a la semana actual
  const [elegida, setElegida] = useState<{ establecimiento: string; semana: SemanaIso }>()
  const semanaPedida = elegida?.establecimiento === establecimiento ? elegida.semana : undefined
  const query = useIndicadores(semanaPedida)

  const weeks = useMemo(() => (actual.data ? weekOptionsFrom(actual.data, semanaActual) : []), [actual.data, semanaActual])
  const report = useMemo(
    () => (query.data ? buildIndicatorsReport(query.data, { semana: semanaPedida, semanaActual }) : undefined),
    [query.data, semanaPedida, semanaActual],
  )

  // La más reciente de la serie es la que se pide sin `?semana=` (comparte la consulta con el encabezado)
  const setSemana = (semana: SemanaIso) =>
    setElegida(semana === weeks[0]?.semana ? undefined : { establecimiento, semana })

  return { query, report, weeks, semana: semanaPedida ?? weeks[0]?.semana, setSemana }
}

/**
 * Motivos de dificultad de una semana, contados con el historial de cada niño de la lista actual del
 * establecimiento (una llamada por niño: la API no los cuenta).
 */
export function useDifficultySummary(semana: SemanaIso | undefined) {
  const lista = useListaSemana()
  const historiales = useHistoriales()
  const summary = useMemo(
    () => (historiales.data && semana ? countDifficultyReasons(historiales.data, semana) : undefined),
    [historiales.data, semana],
  )
  // Si la lista falla, los historiales nunca se piden: el error que importa es el de la lista
  const error = lista.error ?? historiales.error
  return {
    summary,
    error,
    retry: () => (lista.isError ? lista.refetch() : historiales.refetch()),
  }
}
