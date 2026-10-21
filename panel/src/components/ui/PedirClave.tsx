// Si la API responde 401 (API_CLAVE definida en su .env), se pide la clave en pantalla.
// Se guarda solo durante la sesión del navegador; nunca va escrita en el código del panel.
import { useEffect, useState } from 'react'
import { EVENTO_FALTA_CLAVE, guardarClave } from '@/api/http'

export function PedirClave() {
  const [visible, setVisible] = useState(false)
  const [clave, setClave] = useState('')

  useEffect(() => {
    const mostrar = () => setVisible(true)
    window.addEventListener(EVENTO_FALTA_CLAVE, mostrar)
    return () => window.removeEventListener(EVENTO_FALTA_CLAVE, mostrar)
  }, [])

  if (!visible) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:hidden">
      <form
        className="w-full max-w-sm rounded-[20px] bg-white p-6 shadow-[0px_8px_24px_rgba(22,29,25,0.12)]"
        onSubmit={(event) => {
          event.preventDefault()
          guardarClave(clave)
          window.location.reload()
        }}
      >
        <h2 className="text-lg font-semibold text-ink-strong">Clave de acceso</h2>
        <p className="mt-1 text-[13px] leading-[18px] text-muted">El servidor pide una clave para usar el panel.</p>
        <label className="mt-4 block text-xs font-semibold text-ink" htmlFor="clave-api">
          Clave
        </label>
        <input
          id="clave-api"
          type="password"
          value={clave}
          onChange={(event) => setClave(event.target.value)}
          autoFocus
          className="mt-1 h-11 w-full rounded-[12px] border border-line px-3 text-sm outline-none focus:ring-2 focus:ring-brand/40"
        />
        <button
          type="submit"
          disabled={!clave}
          className="mt-4 h-11 w-full rounded-full bg-brand text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          Entrar
        </button>
      </form>
    </div>
  )
}
