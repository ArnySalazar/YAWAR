import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router'
import { paths } from '@/routes/paths'
import moreIcon from '../assets/icon-more-vertical.svg'

/**
 * Botón "más opciones" (⋮) de cada niño de la lista: solo accesos a otras pantallas. No hay
 * "registrar llamada o mensaje": la API no tiene esa ruta.
 */
export function RowActionsMenu({ childCode }: { childCode: string }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const items = [
    { label: 'Ver ficha del niño', to: paths.fichaNino(childCode) },
    { label: 'Abrir en Planificación', to: paths.planificacion },
    { label: 'Ver comunicación', to: paths.comunicacion },
  ]

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={`Más opciones para ${childCode}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        className="flex size-10 items-center justify-center rounded-full bg-chip transition-colors hover:bg-track"
      >
        <img src={moreIcon} alt="" width={3} height={12} />
      </button>

      {open && (
        <ul
          id={menuId}
          role="menu"
          className="absolute top-full right-0 z-20 mt-1 min-w-[200px] rounded-xl border border-line bg-white p-1 shadow-[0px_8px_24px_rgba(0,0,0,0.12)]"
        >
          {items.map((item) => (
            <li key={item.label} role="none">
              <Link
                role="menuitem"
                to={item.to}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-xs font-medium leading-4 text-ink hover:bg-chip"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
