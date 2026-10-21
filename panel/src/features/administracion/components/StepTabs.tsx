import { useRef, type KeyboardEvent } from 'react'
import { cn } from '@/lib/cn'
import connectionIcon from '../assets/tab-connection.svg'
import exportPrintIcon from '../assets/tab-export-print.svg'
import uploadCloudIcon from '../assets/tab-upload-cloud.svg'

export type AdminStepId = 'padron' | 'conexion' | 'exportacion'

interface AdminStep {
  id: AdminStepId
  label: string
  icon: string
  iconWidth: number
  iconHeight: number
  /**
   * Color con el que viene el icono del diseño: `light` (blanco, pensado para la pestaña activa)
   * o `dark` (gris #5b5858, para la inactiva). Se ajusta con filtros CSS al cambiar de estado.
   */
  iconTone: 'light' | 'dark'
}

export const ADMIN_STEPS: AdminStep[] = [
  { id: 'padron', label: '1. Cargar padrón', icon: uploadCloudIcon, iconWidth: 15.5833, iconHeight: 11.3333, iconTone: 'light' },
  {
    id: 'conexion',
    label: '2. Configuración de conexión',
    icon: connectionIcon,
    iconWidth: 17,
    iconHeight: 16.2917,
    iconTone: 'dark',
  },
  {
    id: 'exportacion',
    label: '3. Exportación y respaldo físico',
    icon: exportPrintIcon,
    iconWidth: 14.1667,
    iconHeight: 12.75,
    iconTone: 'dark',
  },
]

export const stepTabId = (id: AdminStepId) => `administracion-tab-${id}`
export const stepPanelId = (id: AdminStepId) => `administracion-panel-${id}`

function iconFilter(tone: AdminStep['iconTone'], active: boolean) {
  if (tone === 'light') return active ? undefined : 'brightness-[0.357]' // blanco -> #5b5b5b
  return active ? 'brightness-0 invert' : undefined // #5b5858 -> blanco
}

interface StepTabsProps {
  active: AdminStepId
  onChange: (id: AdminStepId) => void
}

/** Barra de pestañas internas (píldora encapsulada); se desplaza en horizontal en pantallas angostas. */
export function StepTabs({ active, onChange }: StepTabsProps) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = ADMIN_STEPS.findIndex((step) => step.id === active)
    const last = ADMIN_STEPS.length - 1
    const next =
      event.key === 'ArrowRight'
        ? (current + 1) % ADMIN_STEPS.length
        : event.key === 'ArrowLeft'
          ? (current - 1 + ADMIN_STEPS.length) % ADMIN_STEPS.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null
    if (next === null) return
    event.preventDefault()
    onChange(ADMIN_STEPS[next].id)
    tabRefs.current[next]?.focus()
  }

  return (
    <div className="max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div
        role="tablist"
        aria-label="Pasos de administración del padrón"
        onKeyDown={handleKeyDown}
        className="flex w-max items-start rounded-full border border-line bg-chip p-1 drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)]"
      >
        {ADMIN_STEPS.map((step, index) => {
          const selected = step.id === active
          return (
            <button
              key={step.id}
              ref={(element) => {
                tabRefs.current[index] = element
              }}
              type="button"
              role="tab"
              id={stepTabId(step.id)}
              aria-selected={selected}
              aria-controls={stepPanelId(step.id)}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(step.id)}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-full px-5 py-2 text-[12px] leading-4 font-semibold tracking-[0.24px] whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                selected
                  ? 'bg-ink text-white drop-shadow-[0px_2px_3px_rgba(35,31,31,0.15)]'
                  : 'text-[#5b5858] hover:bg-white/70',
              )}
            >
              <img
                src={step.icon}
                alt=""
                width={step.iconWidth}
                height={step.iconHeight}
                className={cn('shrink-0', iconFilter(step.iconTone, selected))}
              />
              {step.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
