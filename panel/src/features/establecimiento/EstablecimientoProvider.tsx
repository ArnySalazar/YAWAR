/**
 * Establecimiento elegido y capacidad N de visitas de cada uno. Se recuerdan en el navegador
 * (comodidad del usuario); la información de verdad siempre viene de la API.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { env } from '@/config/env'

/** Capacidad N por defecto: la misma que usa la API si no se le indica. */
export const CAPACIDAD_POR_DEFECTO = 10

interface EstadoEstablecimiento {
  establecimientos: readonly string[]
  establecimiento: string
  setEstablecimiento: (id: string) => void
  /** Capacidad N de visitas elegida para el establecimiento actual. */
  capacidad: number
  setCapacidad: (n: number) => void
}

const Contexto = createContext<EstadoEstablecimiento | null>(null)

function leer(llave: string) {
  try {
    return localStorage.getItem(llave)
  } catch {
    return null
  }
}

function escribir(llave: string, valor: string) {
  try {
    localStorage.setItem(llave, valor)
  } catch {
    // sin almacenamiento: no se recuerda, pero el panel sigue funcionando
  }
}

export function EstablecimientoProvider({
  children,
  inicial,
}: {
  children: ReactNode
  /** Solo para pruebas: establecimiento con el que arranca. */
  inicial?: string
}) {
  const establecimientos = env.establecimientos
  const [establecimiento, setEstado] = useState(() => {
    const guardado = inicial ?? leer('yawar.establecimiento')
    return guardado && establecimientos.includes(guardado) ? guardado : establecimientos[0]
  })
  const [capacidades, setCapacidades] = useState<Record<string, number>>({})

  const setEstablecimiento = useCallback((id: string) => {
    setEstado(id)
    escribir('yawar.establecimiento', id)
  }, [])

  const capacidad = capacidades[establecimiento] ?? Number(leer(`yawar.capacidad.${establecimiento}`) ?? CAPACIDAD_POR_DEFECTO)

  const setCapacidad = useCallback(
    (n: number) => {
      setCapacidades((actual) => ({ ...actual, [establecimiento]: n }))
      escribir(`yawar.capacidad.${establecimiento}`, String(n))
    },
    [establecimiento],
  )

  const valor = useMemo(
    () => ({ establecimientos, establecimiento, setEstablecimiento, capacidad, setCapacidad }),
    [establecimientos, establecimiento, setEstablecimiento, capacidad, setCapacidad],
  )
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useEstablecimiento() {
  const valor = useContext(Contexto)
  if (!valor) throw new Error('useEstablecimiento debe usarse dentro de EstablecimientoProvider')
  return valor
}
