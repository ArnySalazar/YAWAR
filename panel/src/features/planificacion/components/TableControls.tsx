import { useId } from 'react'
import { cn } from '@/lib/cn'
import { etiquetaSemana } from '@/lib/semana'
import searchIcon from '../assets/search.svg'
import caretDownIcon from '../assets/caret-down.svg'
import viewTableIcon from '../assets/view-table.svg'
import viewGridIcon from '../assets/view-grid.svg'

export type QuickFilter = 'all' | 'home_visit' | 'whatsapp' | 'difficulty'
export type ChannelFilter = 'all' | 'home_visit' | 'whatsapp'
export type ViewMode = 'table' | 'grid'

const channelOptions: { value: ChannelFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'home_visit', label: 'Visita domiciliaria' },
  { value: 'whatsapp', label: 'WhatsApp' },
]

interface TableControlsProps {
  search: string
  onSearchChange: (value: string) => void
  channel: ChannelFilter
  onChannelChange: (value: ChannelFilter) => void
  quickFilter: QuickFilter
  onQuickFilterChange: (value: QuickFilter) => void
  counts: Record<QuickFilter, number>
  resultCount: number
  selectedCount: number
  semana: string
  view: ViewMode
  onViewChange: (value: ViewMode) => void
}

const shadow = 'drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)]'

export function TableControls({
  search,
  onSearchChange,
  channel,
  onChannelChange,
  quickFilter,
  onQuickFilterChange,
  counts,
  resultCount,
  selectedCount,
  semana,
  view,
  onViewChange,
}: TableControlsProps) {
  const channelId = useId()
  const pills: { value: QuickFilter; label: string }[] = [
    { value: 'all', label: `Todos (${counts.all})` },
    { value: 'home_visit', label: `Asignados a Visita (${counts.home_visit})` },
    { value: 'whatsapp', label: `Asignados a WhatsApp (${counts.whatsapp})` },
    { value: 'difficulty', label: `Con dificultad R1 (${counts.difficulty})` },
  ]
  const channelLabel = channelOptions.find((option) => option.value === channel)?.label ?? 'Todos'

  return (
    <div className="flex flex-col gap-3 print:hidden">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col items-start gap-3 lg:gap-5 lg:py-[5px]">
          <label
            className={cn(
              'flex w-full items-center rounded-full bg-white px-4 py-2 focus-within:ring-2 focus-within:ring-brand/40 sm:w-[320px]',
              shadow,
            )}
          >
            <span className="sr-only">Buscar por código o cuidador</span>
            <img src={searchIcon} alt="" width={21.5} height={13.5} className="shrink-0" />
            <input
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Buscar por código (ej. N0001) o cuidador..."
              className="min-w-0 flex-1 bg-transparent py-px text-[13px] leading-[normal] text-ink-strong outline-none placeholder:text-muted"
            />
          </label>

          <div
            className={cn(
              'relative inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-brand/40',
              shadow,
            )}
          >
            <label htmlFor={channelId} className="text-[11px] leading-[14px] font-medium tracking-[0.33px] text-muted">
              Canal:
            </label>
            <span aria-hidden className="text-[11px] leading-[14px] font-semibold tracking-[0.33px] text-ink-strong">
              {channelLabel}
            </span>
            <img src={caretDownIcon} alt="" width={5.83333} height={2.91667} />
            <select
              id={channelId}
              value={channel}
              onChange={(event) => onChannelChange(event.target.value as ChannelFilter)}
              className="absolute inset-0 size-full cursor-pointer appearance-none rounded-full opacity-0"
            >
              {channelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          role="group"
          aria-label="Filtros rápidos"
          className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
        >
          {pills.map((pill) => {
            const active = quickFilter === pill.value
            return (
              <button
                key={pill.value}
                type="button"
                aria-pressed={active}
                onClick={() => onQuickFilterChange(pill.value)}
                className={cn(
                  'shrink-0 rounded-full py-1.5 text-center text-[12px] leading-4 font-semibold tracking-[0.24px] whitespace-nowrap transition-colors',
                  shadow,
                  active ? 'bg-[#2b322d] px-4 text-[#ebf3eb]' : 'bg-white px-3.5 text-nav-ink hover:bg-chip',
                )}
              >
                {pill.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 px-1">
        <p className="text-[11px] leading-[14px] font-medium tracking-[0.33px] text-muted" aria-live="polite">
          Mostrando <strong className="font-semibold text-ink-strong">{resultCount} niños</strong> de la{' '}
          {etiquetaSemana(semana).toLowerCase()}
          {selectedCount > 0 && (
            <>
              {' '}
              · <strong className="font-semibold text-ink-strong">{selectedCount} seleccionados</strong>
            </>
          )}
        </p>
        <div role="group" aria-label="Vista de resultados" className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label="Vista de tabla"
            aria-pressed={view === 'table'}
            onClick={() => onViewChange('table')}
            className={cn('flex items-center justify-center rounded-[8px] p-1.5', view === 'table' ? 'bg-chip' : 'hover:bg-chip')}
          >
            <img src={viewTableIcon} alt="" width={13.3333} height={10.6667} />
          </button>
          <button
            type="button"
            aria-label="Vista de tarjetas"
            aria-pressed={view === 'grid'}
            onClick={() => onViewChange('grid')}
            className={cn('flex items-center justify-center rounded-[8px] p-1.5', view === 'grid' ? 'bg-chip' : 'hover:bg-chip')}
          >
            <img src={viewGridIcon} alt="" width={12} height={12} />
          </button>
        </div>
      </div>
    </div>
  )
}
