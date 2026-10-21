import { useEffect, useRef } from 'react'
import { cn } from '@/lib/cn'
import { AGE_GROUP_LABEL, DELIVERY_LABEL, RESPONSE_KIND_LABEL, SEGMENT_LABEL } from '../format'
import { SEGMENTS } from '../utils'
import type { AgeGroup, ChildSegment, ChildrenFilterParams, ResponseKind, WeeklyActionChannel } from '../types'
import { FilterSelect } from './FilterSelect'
import searchIcon from '../assets/icon-search.svg'
import filterIcon from '../assets/icon-filter.svg'
import listViewIcon from '../assets/icon-view-list.svg'
import gridViewIcon from '../assets/icon-view-grid.svg'

export type ListView = 'list' | 'grid'

type SelectFilterKey = 'ageGroup' | 'delivery' | 'response'

interface ChildrenToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  filters: ChildrenFilterParams
  onFilterChange: <K extends SelectFilterKey | 'segment'>(key: K, value: ChildrenFilterParams[K]) => void
  onClearFilters: () => void
  /** Sin el conteo de un chip (historial cargando), se muestra sin número. */
  segmentCounts: Partial<Record<ChildSegment, number>>
  activeFilterCount: number
  selectsOpen: boolean
  onToggleSelects: () => void
  quickFiltersId: string
  advancedOpen: boolean
  advancedPanelId: string
  view: ListView
  onViewChange: (view: ListView) => void
}

const SEGMENT_DOT: Partial<Record<ChildSegment, string>> = {
  priorizados: 'bg-[#f2a413]',
  dificultades: 'bg-brand',
  sin_respuesta: 'bg-[#a3a3a3]',
  si_le_di: 'bg-[#059669]',
}

const AGE_OPTIONS: ReadonlyArray<{ value: AgeGroup | 'todos'; label: string }> = [
  { value: 'todos', label: 'Todos (6-35m)' },
  ...(Object.keys(AGE_GROUP_LABEL) as AgeGroup[]).map((value) => ({ value, label: AGE_GROUP_LABEL[value] })),
]

const DELIVERY_OPTIONS: ReadonlyArray<{ value: WeeklyActionChannel | 'todos'; label: string }> = [
  { value: 'todos', label: 'Todos' },
  ...(Object.keys(DELIVERY_LABEL) as WeeklyActionChannel[]).map((value) => ({ value, label: DELIVERY_LABEL[value] })),
]

const RESPONSE_OPTIONS: ReadonlyArray<{ value: ResponseKind | 'todos'; label: string }> = [
  { value: 'todos', label: 'Todas' },
  ...(Object.keys(RESPONSE_KIND_LABEL) as ResponseKind[]).map((value) => ({
    value,
    label: RESPONSE_KIND_LABEL[value],
  })),
]

export function ChildrenToolbar({
  search,
  onSearchChange,
  filters,
  onFilterChange,
  onClearFilters,
  segmentCounts,
  activeFilterCount,
  selectsOpen,
  onToggleSelects,
  quickFiltersId,
  advancedOpen,
  advancedPanelId,
  view,
  onViewChange,
}: ChildrenToolbarProps) {
  const advancedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (advancedOpen) advancedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [advancedOpen])

  return (
    <section
      aria-label="Búsqueda y filtros"
      className="flex flex-col gap-[14px] rounded-[20px] border border-line bg-white p-4 shadow-[0_1px_1px_rgba(0,0,0,0.05)]"
    >
      {/* Búsqueda + filtros + vista */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-[672px] sm:flex-1">
          <img
            src={searchIcon}
            alt=""
            width={16}
            height={16}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            aria-label="Buscar niños por código o alias del cuidador"
            placeholder="Buscar por código (ej. N0001) o alias del cuidador..."
            className="h-[38px] w-full rounded-xl border border-transparent bg-[rgba(241,243,242,0.7)] pr-7 pl-10 text-xs text-ink transition-colors placeholder:text-[#a3a3a3] focus:border-line focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/20"
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onToggleSelects}
            aria-expanded={selectsOpen}
            aria-controls={quickFiltersId}
            className="flex items-center gap-2 rounded-xl bg-chip px-3.5 py-2 text-xs leading-4 font-semibold text-ink transition-colors hover:bg-[#e8ebe9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <img src={filterIcon} alt="" width={14} height={14} />
            Filtros
            {activeFilterCount > 0 && (
              <span className="flex size-4 items-center justify-center rounded-full bg-ink text-[10px] leading-4 font-bold text-white">
                <span className="sr-only">(</span>
                {activeFilterCount}
                <span className="sr-only"> activos)</span>
              </span>
            )}
          </button>

          <div
            role="group"
            aria-label="Vista del listado"
            className="flex items-center rounded-xl border border-[#e5e5e5] bg-chip p-0.5"
          >
            <button
              type="button"
              aria-label="Vista de lista"
              aria-pressed={view === 'list'}
              onClick={() => onViewChange('list')}
              className={cn(
                'rounded-lg p-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-brand',
                view === 'list' ? 'bg-white' : 'hover:bg-white/60',
              )}
            >
              <img src={listViewIcon} alt="" width={16} height={16} className={cn(view !== 'list' && 'opacity-40')} />
            </button>
            <button
              type="button"
              aria-label="Vista de tarjetas"
              aria-pressed={view === 'grid'}
              onClick={() => onViewChange('grid')}
              className={cn(
                'rounded-lg p-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-brand',
                view === 'grid' ? 'bg-white' : 'hover:bg-white/60',
              )}
            >
              <img
                src={gridViewIcon}
                alt=""
                width={16}
                height={16}
                className={cn(view === 'grid' && 'brightness-20')}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Chips + selectores */}
      <div className="flex flex-col gap-3 border-t border-[#f5f5f5] pt-2">
        <div role="group" aria-label="Segmentos del padrón" className="flex flex-wrap items-center gap-1.5">
          {SEGMENTS.map((segment) => {
            const active = filters.segment === segment
            const count = segmentCounts[segment]
            return (
              <button
                key={segment}
                type="button"
                aria-pressed={active}
                onClick={() => onFilterChange('segment', segment)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-center text-xs leading-4 font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                  active
                    ? 'bg-ink text-white'
                    : segment === 'dificultades'
                      ? 'bg-[#feecec] text-brand hover:bg-[#fbdcdc]'
                      : 'bg-chip text-[#404040] hover:bg-[#e8ebe9]',
                )}
              >
                {SEGMENT_DOT[segment] && (
                  <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', SEGMENT_DOT[segment])} />
                )}
                {SEGMENT_LABEL[segment]}
                {count !== undefined && ` (${count})`}
              </button>
            )
          })}
        </div>

        {selectsOpen && (
          <div id={quickFiltersId} className="flex flex-wrap items-center gap-2">
            <FilterSelect
              label="Edad"
              value={filters.ageGroup}
              options={AGE_OPTIONS}
              onChange={(value) => onFilterChange('ageGroup', value)}
            />
            <FilterSelect
              label="Entrega"
              value={filters.delivery}
              options={DELIVERY_OPTIONS}
              onChange={(value) => onFilterChange('delivery', value)}
            />
          </div>
        )}

        {advancedOpen && (
          <div
            ref={advancedRef}
            id={advancedPanelId}
            className="flex scroll-mt-4 flex-col gap-2 rounded-xl border border-dashed border-line bg-[#fafbfa] p-3 sm:flex-row sm:flex-wrap sm:items-center"
          >
            <p className="text-[11px] leading-[16.5px] font-bold tracking-[0.55px] text-[#737373] uppercase">
              Filtros avanzados
            </p>
            <FilterSelect
              label="Respuesta de la semana"
              value={filters.response}
              options={RESPONSE_OPTIONS}
              onChange={(value) => onFilterChange('response', value)}
            />
            <button
              type="button"
              onClick={onClearFilters}
              className="self-start rounded-lg px-2 py-1 text-xs leading-4 font-semibold text-brand hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-brand sm:ml-auto sm:self-auto"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
