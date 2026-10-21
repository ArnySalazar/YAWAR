import { cn } from '@/lib/cn'
import type { PriorityFilter } from '../utils'

/** Las mismas reglas de la API: R1 = nivel 0, R2 = nivel 1, R3 = nivel 2 (por puntaje). */
const FILTERS: Array<{ id: PriorityFilter; label: string; dotClass?: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'R1', label: 'No le di / Problema (R1)', dotClass: 'bg-brand-dark' },
  { id: 'R2', label: 'Sin respuesta 7d (R2)', dotClass: 'bg-[#603e00]' },
  { id: 'R3', label: 'Por puntaje (R3)', dotClass: 'bg-muted' },
]

interface QuickFiltersProps {
  id?: string
  counts: Record<PriorityFilter, number>
  value: PriorityFilter
  onChange: (value: PriorityFilter) => void
}

export function QuickFilters({ id, counts, value, onChange }: QuickFiltersProps) {
  return (
    <div id={id} role="group" aria-label="Filtrar por motivo de prioridad" className="flex flex-wrap items-center gap-2">
      {FILTERS.map((filter) => {
        const active = filter.id === value
        return (
          <button
            key={filter.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(filter.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-medium leading-[14px] tracking-[0.33px] transition-colors',
              active ? 'bg-ink text-[#ebf3eb]' : 'bg-track text-nav-ink hover:bg-line',
            )}
          >
            {filter.dotClass && <span aria-hidden className={cn('size-2 shrink-0 rounded-full', filter.dotClass)} />}
            {filter.label} ({counts[filter.id]})
          </button>
        )
      })}
    </div>
  )
}
