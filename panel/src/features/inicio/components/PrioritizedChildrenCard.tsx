import { useId, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { cn } from '@/lib/cn'
import { paths } from '@/routes/paths'
import { countByRule, plural, type PriorityFilter } from '../utils'
import type { HomeOverview } from '../types'
import { QuickFilters } from './QuickFilters'
import { WeeklyProgress } from './WeeklyProgress'
import { PrioritizedChildRow } from './PrioritizedChildRow'
import headingIcon from '../assets/icon-priorizados-heading.svg'
import filterIcon from '../assets/icon-filter.svg'
import arrowRightIcon from '../assets/icon-arrow-right.svg'

/** Cuántos niños se muestran en la vista previa del Inicio (la lista completa está en Planificación). */
const PREVIEW_LIMIT = 5

/**
 * Lista de la semana en orden de prioridad (R1 → R2 → R3), sin agenda por día: la API asigna
 * visita o WhatsApp para la semana, sin fecha ni hora.
 */
export function PrioritizedChildrenCard({ overview }: { overview: HomeOverview }) {
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [filter, setFilter] = useState<PriorityFilter>('all')
  const headingId = useId()
  const filtersId = useId()

  const { children } = overview
  const counts = useMemo(() => countByRule(children), [children])
  const visible = filter === 'all' ? children : children.filter((child) => child.rule === filter)
  const preview = visible.slice(0, PREVIEW_LIMIT)

  return (
    <section
      aria-labelledby={headingId}
      className="flex min-w-0 flex-col gap-4 rounded-xl border border-line bg-white p-4 shadow-[0px_1px_1px_rgba(0,0,0,0.05)] sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <img src={headingIcon} alt="" width={18} height={20} className="shrink-0" />
            <h2 id={headingId} className="text-lg font-semibold leading-6 text-ink">
              Lista de Prioridad de la Semana
            </h2>
          </div>
          <p className="pt-0.5 text-[13px] leading-[18px] text-muted">
            {plural(overview.homeVisits.assigned, 'visita')} y {overview.whatsappFollowUps} por WhatsApp · priorizados:{' '}
            {counts.R1 + counts.R2} con señal R1 o R2
          </p>
        </div>
        <button
          type="button"
          aria-label={filtersOpen ? 'Ocultar filtros' : 'Mostrar filtros'}
          aria-expanded={filtersOpen}
          aria-controls={filtersOpen ? filtersId : undefined}
          onClick={() => setFiltersOpen((value) => !value)}
          className={cn(
            'flex items-center justify-center rounded-full px-1.5 pt-1.5 pb-2 transition-colors',
            filtersOpen ? 'bg-chip hover:bg-track' : 'bg-track hover:bg-line',
          )}
        >
          <img src={filterIcon} alt="" width={12} height={8} />
        </button>
      </div>

      {filtersOpen && <QuickFilters id={filtersId} counts={counts} value={filter} onChange={setFilter} />}

      <WeeklyProgress />

      <div className="pt-1">
        {visible.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-canvas px-4 py-8 text-center text-[13px] leading-[18px] text-muted">
            No hay niños con este motivo de prioridad esta semana.
          </p>
        ) : (
          <ul aria-label="Niños de la lista de la semana" className="flex flex-col gap-2">
            {preview.map((child) => (
              <PrioritizedChildRow key={child.id} child={child} />
            ))}
          </ul>
        )}
      </div>

      <div
        className={cn(
          'flex flex-wrap items-center gap-2 pt-2',
          visible.length > preview.length ? 'justify-between' : 'justify-end',
        )}
      >
        {visible.length > preview.length && (
          <span className="text-[11px] font-medium leading-[14px] tracking-[0.33px] text-muted">
            Mostrando {preview.length} de {visible.length}
          </span>
        )}
        <Link
          to={paths.planificacion}
          className="flex items-center gap-2 text-xs font-bold leading-4 tracking-[0.24px] text-brand-dark hover:underline"
        >
          Ver la lista completa en Planificación ({plural(children.length, 'niño')})
          <img src={arrowRightIcon} alt="" width={10.667} height={10.667} className="shrink-0" />
        </Link>
      </div>
    </section>
  )
}
