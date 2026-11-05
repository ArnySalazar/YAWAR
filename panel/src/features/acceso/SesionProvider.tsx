/**
 * Sesión del panel. Al abrir, pregunta a la API quién es el usuario; si la API responde 401
 * en cualquier momento (sesión vencida), vuelve a la pantalla de ingreso.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { accesoApi, type UsuarioPanel } from '@/api/acceso'
import { ApiError, EVENTO_SIN_SESION } from '@/api/http'

type Estado = 'cargando' | 'dentro' | 'fuera' | 'sin_conexion'

interface Sesion {
  estado: Estado
  usuario: UsuarioPanel | null
  entrar: (usuario: string, clave: string) => Promise<void>
  salir: () => Promise<void>
  reintentar: () => void
}

const Contexto = createContext<Sesion | null>(null)

export function SesionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [estado, setEstado] = useState<Estado>('cargando')
  const [usuario, setUsuario] = useState<UsuarioPanel | null>(null)

  const consultar = useCallback(() => {
    setEstado('cargando')
    accesoApi
      .yo()
      .then((u) => {
        setUsuario(u)
        setEstado('dentro')
      })
      .catch((e: unknown) => {
        setUsuario(null)
        setEstado(e instanceof ApiError && e.status === 401 ? 'fuera' : 'sin_conexion')
      })
  }, [])

  useEffect(consultar, [consultar])

  useEffect(() => {
    const vencida = () => {
      setUsuario(null)
      setEstado('fuera')
      queryClient.clear()
    }
    window.addEventListener(EVENTO_SIN_SESION, vencida)
    return () => window.removeEventListener(EVENTO_SIN_SESION, vencida)
  }, [queryClient])

  const entrar = useCallback(async (u: string, clave: string) => {
    const datos = await accesoApi.entrar(u, clave)
    setUsuario(datos)
    setEstado('dentro')
  }, [])

  const salir = useCallback(async () => {
    try {
      await accesoApi.salir()
    } finally {
      queryClient.clear()
      setUsuario(null)
      setEstado('fuera')
    }
  }, [queryClient])

  const valor = useMemo(
    () => ({ estado, usuario, entrar, salir, reintentar: consultar }),
    [estado, usuario, entrar, salir, consultar],
  )
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

/** Fuera de SesionProvider (pruebas de pantallas sueltas) devuelve null. */
export function useSesion() {
  return useContext(Contexto)
}
