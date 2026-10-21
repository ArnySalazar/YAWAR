import { Link, NavLink } from 'react-router'
import logo from '@/assets/yawar-cred-logo.png'
import establishmentIcon from '@/assets/icons/establishment.svg'
import chevronDown from '@/assets/icons/chevron-down.svg'
import bellIcon from '@/assets/icons/bell.svg'
import { useHoy, useIndicadores, useListaSemana } from '@/api/queries'
import { useEstablecimiento } from '@/features/establecimiento/EstablecimientoProvider'
import { etiquetaSemanaLarga } from '@/lib/semana'
import { paths } from '@/routes/paths'
import { cn } from '@/lib/cn'

const NAV_ITEMS = [
  { label: 'Inicio', to: paths.inicio, end: true },
  { label: 'Planificación', to: paths.planificacion },
  { label: 'Niños', to: paths.ninos },
  { label: 'Comunicación', to: paths.comunicacion },
  { label: 'Indicadores', to: paths.indicadores },
  { label: 'Administración', to: paths.administracion },
]

function MainNav({ className }: { className?: string }) {
  return (
    <nav aria-label="Principal" className={cn('flex w-max items-center rounded-full bg-track p-1', className)}>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              'flex h-10 items-center whitespace-nowrap rounded-full px-4 transition-colors lg:px-5',
              isActive
                ? 'bg-black text-base font-normal tracking-[0.24px] text-white'
                : 'text-xs font-semibold tracking-[0.24px] text-nav-ink hover:bg-white/60',
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

/** Selector de establecimiento: la API maneja varios (EESS01, EESS02…). */
function EstablishmentSelect({ className }: { className?: string }) {
  const { establecimientos, establecimiento, setEstablecimiento } = useEstablecimiento()
  return (
    <label
      title="Cambiar establecimiento"
      className={cn(
        'relative min-w-0 items-center gap-1 rounded-full bg-chip px-3 py-1.5 focus-within:ring-2 focus-within:ring-brand/40 hover:bg-track',
        className,
      )}
    >
      <img src={establishmentIcon} alt="" width={12} height={12} className="shrink-0" />
      <span aria-hidden className="truncate text-xs font-semibold leading-4 tracking-[0.24px] text-ink">
        {establecimiento}
      </span>
      <img src={chevronDown} alt="" width={8} height={4.933} className="shrink-0" />
      <select
        aria-label="Establecimiento"
        value={establecimiento}
        onChange={(event) => setEstablecimiento(event.target.value)}
        className="absolute inset-0 size-full cursor-pointer appearance-none opacity-0"
      >
        {establecimientos.map((id) => (
          <option key={id} value={id}>
            {id}
          </option>
        ))}
      </select>
    </label>
  )
}

/** Hay algo que mirar (las mismas alertas de Inicio): niños con señal R1 o R2, o meta-alerta. */
function useHayAlertas() {
  const lista = useListaSemana()
  const indicadores = useIndicadores()
  return Boolean(indicadores.data?.meta_alerta) || Boolean(lista.data?.some((fila) => fila.nivel !== 2))
}

export function AppHeader() {
  const { semana, modoPrueba } = useHoy()
  const hayAlertas = useHayAlertas()

  return (
    <header className="sticky top-0 z-30 print:hidden border-b border-line bg-white/95 shadow-[0px_1px_4px_rgba(0,0,0,0.04)] backdrop-blur-[12px]">
      <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:h-20 lg:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <Link to={paths.inicio} className="shrink-0">
            <img src={logo} alt="YAWAR CRED" width={128} height={32} className="h-8 w-32 object-contain" />
          </Link>
          <EstablishmentSelect className="flex" />
        </div>

        <MainNav className="hidden xl:flex" />

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden flex-col items-end sm:flex">
            <span className="text-[11px] leading-[14px] font-semibold tracking-[0.33px] text-ink">
              {etiquetaSemanaLarga(semana)}
            </span>
            {modoPrueba && (
              <span className="text-[11px] leading-[14px] font-medium tracking-[0.33px] text-brand-dark">
                Modo prueba · no se envían WhatsApp reales
              </span>
            )}
          </div>
          <Link
            to={paths.inicio}
            aria-label={hayAlertas ? 'Hay alertas de seguimiento' : 'Sin alertas de seguimiento'}
            title={hayAlertas ? 'Hay alertas de seguimiento' : 'Sin alertas de seguimiento'}
            className="relative flex items-center justify-center rounded-full px-2 pt-2 pb-2.5 hover:bg-chip"
          >
            <img src={bellIcon} alt="" width={13.333} height={16.667} />
            {hayAlertas && (
              <span className="absolute top-1.5 right-[6.33px] size-2 rounded-full bg-brand shadow-[0px_0px_0px_2px_#f4fbf4]" />
            )}
          </Link>
        </div>
      </div>

      {/* En pantallas medianas/pequeñas el menú baja a una segunda fila con scroll horizontal. */}
      <div className="overflow-x-auto border-t border-line px-4 py-2 sm:px-6 xl:hidden">
        <MainNav />
      </div>
    </header>
  )
}
