import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { paths } from '@/routes/paths'
import { SIN_CONEXION } from '@/api/http'
import { useSesion } from './SesionProvider'

/** Deja pasar solo con sesión iniciada; si no, manda a la pantalla de ingreso. */
export function RequiereSesion({ children }: { children: ReactNode }) {
  const sesion = useSesion()
  const ubicacion = useLocation()
  if (!sesion || sesion.estado === 'dentro') return <>{children}</>
  if (sesion.estado === 'fuera') {
    const volver = ubicacion.pathname + ubicacion.search
    return <Navigate to={paths.ingresar} replace state={{ volver }} />
  }
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas p-4">
      {sesion.estado === 'cargando' ? (
        <p className="text-sm text-muted">Cargando…</p>
      ) : (
        <div className="max-w-sm text-center">
          <p className="text-sm text-ink">{SIN_CONEXION}</p>
          <button
            type="button"
            onClick={sesion.reintentar}
            className="mt-4 h-10 rounded-full bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Reintentar
          </button>
        </div>
      )}
    </div>
  )
}
