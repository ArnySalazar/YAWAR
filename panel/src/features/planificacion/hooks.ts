import { useMemo } from 'react'
import { useHistoriales, useHoy } from '@/api/queries'
import type { FilaLista } from '@/api/yawar'
import { useEstablecimiento } from '@/features/establecimiento/EstablecimientoProvider'
import { attachLastReports, buildWeeklyPlan } from './api'

/** Planificación de la semana: la lista de la API + la última respuesta de cada cuidador. */
export function useWeeklyPlan(lista: FilaLista[]) {
  const { dia, semana } = useHoy()
  const { establecimiento, capacidad } = useEstablecimiento()
  const historiales = useHistoriales()
  return useMemo(
    () =>
      attachLastReports(
        buildWeeklyPlan(lista, { semana, hoy: dia, establecimiento, capacidad }),
        historiales.data,
      ),
    [lista, semana, dia, establecimiento, capacidad, historiales.data],
  )
}
