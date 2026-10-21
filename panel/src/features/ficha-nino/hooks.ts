import { useMemo } from 'react'
import { useHistorial, useHoy, useListaSemana } from '@/api/queries'
import { useEstablecimiento } from '@/features/establecimiento/EstablecimientoProvider'
import { buildChildFollowUp } from './api'

/**
 * Ficha de un niño: su historial + su fila en la lista de la semana del establecimiento elegido.
 * `child` es undefined mientras carga y null si el código no existe. Si la lista falla, la ficha
 * se arma solo con el historial.
 */
export function useChildFollowUp(code: string) {
  const historial = useHistorial(code)
  const lista = useListaSemana()
  const { semana } = useHoy()
  const { establecimiento } = useEstablecimiento()

  const child = useMemo(() => {
    if (!historial.data || lista.isPending) return undefined
    return buildChildFollowUp(code, historial.data, lista.data, { semana, establecimiento })
  }, [code, historial.data, lista.isPending, lista.data, semana, establecimiento])

  return { historial, lista, child }
}
