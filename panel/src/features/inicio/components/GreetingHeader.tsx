import { Link } from 'react-router'
import { useHoy } from '@/api/queries'
import { EtiquetaSeguimiento } from '@/components/ui/EtiquetaSeguimiento'
import { useEstablecimiento } from '@/features/establecimiento/EstablecimientoProvider'
import { paths } from '@/routes/paths'
import { useGreeting } from '../hooks'
import { plural, weekLabel } from '../utils'
import printIcon from '../assets/icon-print.svg'
import calendarAddIcon from '../assets/icon-calendar-add.svg'

/** Saludo sin nombre (la API no tiene usuarios), establecimiento, semana ISO y tamaño del padrón. */
export function GreetingHeader({ rosterSize }: { rosterSize?: number }) {
  const { semana } = useHoy()
  const { establecimiento } = useEstablecimiento()
  const greeting = useGreeting()

  return (
    <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 flex-col gap-0.5">
        <EtiquetaSeguimiento />

        <h1 className="pt-0.5 text-[28px] font-bold leading-9 tracking-[-0.8px] text-ink sm:text-[32px] sm:leading-10">
          {greeting}
        </h1>

        <div className="flex flex-col items-start gap-x-2 gap-y-1 text-sm leading-5 text-muted sm:flex-row sm:flex-wrap sm:items-center">
          <span>
            Establecimiento <span className="font-semibold text-ink">{establecimiento}</span>
          </span>
          <span aria-hidden className="hidden sm:inline">
            ·
          </span>
          <span>{weekLabel(semana)}</span>
          {rosterSize !== undefined && (
            <>
              <span aria-hidden className="hidden sm:inline">
                ·
              </span>
              <span className="rounded-full bg-chip px-2 py-0.5 text-xs font-semibold leading-4 tracking-[0.24px] text-ink">
                Padrón nominal activo: {plural(rosterSize, 'niño')}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2.5 shadow-[0px_1px_1px_rgba(0,0,0,0.05)] transition-colors hover:bg-chip"
        >
          <img src={printIcon} alt="" width={15} height={13.5} />
          <span className="text-xs font-semibold leading-4 tracking-[0.24px] text-ink">Exportar Lista A4</span>
        </button>
        <Link
          to={paths.planificacion}
          className="flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 shadow-[0px_1px_1px_rgba(0,0,0,0.05)] transition-colors hover:bg-brand-dark"
        >
          <img src={calendarAddIcon} alt="" width={14.25} height={15} />
          <span className="text-xs font-semibold leading-4 tracking-[0.24px] text-white">Nueva Planificación</span>
        </Link>
      </div>
    </section>
  )
}
