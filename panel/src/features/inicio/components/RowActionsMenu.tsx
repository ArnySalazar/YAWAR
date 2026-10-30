import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router'
import { paths } from '@/routes/paths'
import type { AlarmaPendiente, MedioAtencion } from '@/api/yawar'
import { useRegistrarAtencion } from '@/api/queries'
import moreIcon from '../assets/icon-more-vertical.svg'

const itemClass = 'block w-full rounded-lg px-3 py-2 text-left text-xs font-medium leading-4 text-ink hover:bg-chip focus-visible:bg-chip focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50'
const medios: { value: MedioAtencion; label: string }[] = [
  { value: 'llamada', label: 'Llamada' },
  { value: 'visita_presencial', label: 'Visita presencial' },
]

/** Menú de la fila: navegación y atención de alarmas pendientes con confirmación explícita. */
export function RowActionsMenu({ childCode, pendingAlarms = [] }: { childCode: string; pendingAlarms?: AlarmaPendiente[] }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'actions' | 'alarms' | 'medium' | 'success'>('actions')
  const [alarma, setAlarma] = useState<AlarmaPendiente | null>(null)
  const [medio, setMedio] = useState<MedioAtencion | null>(null)
  const mutation = useRegistrarAtencion()
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  const resetMenu = () => {
    setStep('actions')
    setAlarma(null)
    setMedio(null)
    mutation.reset()
  }

  useEffect(() => {
    if (open) containerRef.current?.querySelector<HTMLElement>('[role="menuitem"], [role="menuitemradio"]')?.focus()
  }, [open, step])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
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
        ref={triggerRef}
        type="button"
        aria-label={`Más opciones para ${childCode}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          if (!open && !mutation.isPending) resetMenu()
          setOpen((value) => !value)
        }}
        className="flex size-10 items-center justify-center rounded-full bg-chip transition-colors hover:bg-track"
      >
        <img src={moreIcon} alt="" width={3} height={12} />
      </button>

      {open && (
        <ul
          id={menuId}
          role="menu"
          aria-label={step === 'actions' ? `Opciones de ${childCode}` : `Atender a ${childCode}`}
          onKeyDown={(event) => {
            if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
            const opciones = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"], [role="menuitemradio"]'))
              .filter((item) => !item.hasAttribute('disabled'))
            if (!opciones.length) return
            event.preventDefault()
            const actual = opciones.indexOf(document.activeElement as HTMLElement)
            const siguiente = event.key === 'Home' ? 0 : event.key === 'End' ? opciones.length - 1
              : (actual + (event.key === 'ArrowUp' ? -1 : 1) + opciones.length) % opciones.length
            opciones[siguiente]?.focus()
          }}
          className="absolute top-full right-0 z-20 mt-1 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-white p-1 shadow-[0px_8px_24px_rgba(0,0,0,0.12)]"
        >
          {step === 'actions' && pendingAlarms.length > 0 && (
            <li role="none">
              <button type="button" role="menuitem" disabled={mutation.isPending} className={`${itemClass} text-brand-dark`}
                onClick={() => {
                  setAlarma(pendingAlarms.length === 1 ? pendingAlarms[0] : null)
                  setStep(pendingAlarms.length === 1 ? 'medium' : 'alarms')
                }}>Atender</button>
            </li>
          )}
          {step === 'actions' && items.map((item) => (
            <li key={item.label} role="none">
              <Link
                role="menuitem"
                to={item.to}
                onClick={() => setOpen(false)}
                className={itemClass}
              >
                {item.label}
              </Link>
            </li>
          ))}
          {step === 'alarms' && pendingAlarms.map((pendiente) => (
            <li role="none" key={pendiente.registro_id}>
              <button type="button" role="menuitem" className={itemClass}
                onClick={() => { setAlarma(pendiente); setStep('medium') }}>
                Alarma de {pendiente.semana}
              </button>
            </li>
          ))}
          {step === 'medium' && (
            <>
              <li role="none"><p className="px-3 py-2 text-xs font-semibold text-muted">Medio de atención · {alarma?.semana}</p></li>
              {medios.map((opcion) => (
                <li role="none" key={opcion.value}>
                  <button type="button" role="menuitemradio" aria-checked={medio === opcion.value}
                    disabled={mutation.isPending} className={itemClass} onClick={() => setMedio(opcion.value)}>
                    <span aria-hidden="true" className="mr-2 text-brand">{medio === opcion.value ? '●' : '○'}</span>
                    {opcion.label}
                  </button>
                </li>
              ))}
              <li role="none" className="mt-1 border-t border-line pt-1">
                <button type="button" role="menuitem" disabled={!medio || !alarma || mutation.isPending}
                  className={`${itemClass} font-semibold text-brand-dark`}
                  onClick={() => {
                    if (!medio || !alarma || mutation.isPending) return
                    mutation.mutate({ idNino: childCode, registroId: alarma.registro_id, version: alarma.version_alarma, medio }, {
                      onSuccess: () => setStep('success'),
                    })
                  }}>
                  {mutation.isPending ? 'Registrando…' : medio === 'llamada' ? 'Confirmar atención por llamada'
                    : medio === 'visita_presencial' ? 'Confirmar atención por visita presencial' : 'Confirmar atención'}
                </button>
              </li>
              {mutation.isError && <li role="none"><p role="alert" className="px-3 py-2 text-xs text-brand-dark">No se pudo registrar: {mutation.error.message}</p></li>}
            </>
          )}
          {step === 'success' && <li role="none"><p role="status" className="px-3 py-2 text-xs font-semibold text-success">
            Atendido por {mutation.data?.medio === 'llamada' ? 'llamada' : 'visita presencial'}
          </p></li>}
          {step !== 'actions' && <li role="none">
            <button type="button" role="menuitem" disabled={mutation.isPending} className={itemClass} onClick={resetMenu}>
              Volver al menú
            </button>
          </li>}
        </ul>
      )}
    </div>
  )
}
