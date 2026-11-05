import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import logo from '@/assets/yawar-cred-logo.png'
import { ApiError } from '@/api/http'
import { paths } from '@/routes/paths'
import { useSesion } from './SesionProvider'

export default function IngresarPage() {
  const sesion = useSesion()
  const navigate = useNavigate()
  const ubicacion = useLocation()
  const volver = (ubicacion.state as { volver?: string } | null)?.volver ?? paths.inicio
  const [usuario, setUsuario] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (sesion?.estado === 'dentro') return <Navigate to={volver} replace />

  async function enviar(event: FormEvent) {
    event.preventDefault()
    if (!sesion) return
    setEnviando(true)
    setError('')
    try {
      await sesion.entrar(usuario, clave)
      navigate(volver, { replace: true })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo iniciar sesión.')
      setClave('')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas p-4">
      <form
        onSubmit={enviar}
        className="w-full max-w-sm rounded-[20px] bg-white p-6 shadow-[0px_8px_24px_rgba(22,29,25,0.12)] sm:p-8"
      >
        <img src={logo} alt="YAWAR CRED" width={128} height={32} className="h-8 w-32 object-contain" />
        <h1 className="mt-6 text-xl font-semibold text-ink-strong">Ingresar al panel</h1>
        <p className="mt-1 text-[13px] leading-[18px] text-muted">Solo para el personal del establecimiento.</p>

        <label className="mt-5 block text-xs font-semibold text-ink" htmlFor="usuario">
          Usuario
        </label>
        <input
          id="usuario"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={usuario}
          onChange={(event) => setUsuario(event.target.value)}
          autoFocus
          required
          className="mt-1 h-11 w-full rounded-[12px] border border-line px-3 text-sm outline-none focus:ring-2 focus:ring-brand/40"
        />

        <label className="mt-4 block text-xs font-semibold text-ink" htmlFor="clave">
          Contraseña
        </label>
        <input
          id="clave"
          name="password"
          type="password"
          autoComplete="current-password"
          value={clave}
          onChange={(event) => setClave(event.target.value)}
          required
          className="mt-1 h-11 w-full rounded-[12px] border border-line px-3 text-sm outline-none focus:ring-2 focus:ring-brand/40"
        />

        {error && (
          <p role="alert" className="mt-3 text-[13px] leading-[18px] text-brand-dark">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando || !usuario || !clave}
          className="mt-5 h-11 w-full rounded-full bg-brand text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </main>
  )
}
