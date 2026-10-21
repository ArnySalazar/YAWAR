import { useRef, type KeyboardEvent } from 'react'
import type { Razon, SemanaIso } from '@/api/yawar'
import { ORDEN_RAZONES, RAZONES } from '@/lib/dominio'
import { cn } from '@/lib/cn'
import searchIcon from '../assets/icon-search.svg'
import chevronDownIcon from '../assets/icon-chevron-down.svg'
import { TAB_LABELS, TAB_ORDER } from '../presentation'
import type { ResponseTab, ResponseTabCounts, WeekOption } from '../types'
import { cardClass } from './ResponseParts'

interface PillSelectOption {
  value: string
  label: string
}

interface PillSelectProps {
  label: string
  value: string
  options: PillSelectOption[]
  onChange: (value: string) => void
  className?: string
  disabled?: boolean
}

/** Select nativo (accesible) con la apariencia de píldora del Figma: "Semana: Semana 43 (actual)". */
function PillSelect({ label, value, options, onChange, className, disabled }: PillSelectProps) {
  const current = options.find((option) => option.value === value)
  return (
    <div
      className={cn(
        'relative flex h-11 min-w-0 items-center rounded-full border border-line bg-chip pl-4 pr-9 transition-colors focus-within:border-ink/30 focus-within:ring-2 focus-within:ring-brand/20 hover:bg-track',
        disabled && 'opacity-60',
        className,
      )}
    >
      <span aria-hidden className="truncate text-[13px] leading-[18px] text-ink">
        {label}: {current?.label ?? '…'}
      </span>
      <img
        src={chevronDownIcon}
        alt=""
        width={9}
        height={5.55}
        className="pointer-events-none absolute right-[14px] top-1/2 -translate-y-1/2"
      />
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="absolute inset-0 size-full cursor-pointer appearance-none rounded-full opacity-0 disabled:cursor-default"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

const REASON_OPTIONS: PillSelectOption[] = [
  { value: 'todos', label: 'Todos los motivos' },
  ...ORDEN_RAZONES.map((value) => ({ value, label: RAZONES[value] })),
]

interface FiltersPanelProps {
  listId: string
  tab: ResponseTab
  counts: ResponseTabCounts | undefined
  onTabChange: (tab: ResponseTab) => void
  search: string
  onSearchChange: (value: string) => void
  week: SemanaIso
  weekOptions: WeekOption[]
  onWeekChange: (week: SemanaIso) => void
  reason: Razon | 'todos'
  onReasonChange: (reason: Razon | 'todos') => void
}

export function FiltersPanel(props: FiltersPanelProps) {
  const { listId, tab, counts, onTabChange } = props
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = TAB_ORDER.length - 1
    const next =
      event.key === 'ArrowRight'
        ? index === last ? 0 : index + 1
        : event.key === 'ArrowLeft'
          ? index === 0 ? last : index - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null
    if (next === null) return
    event.preventDefault()
    onTabChange(TAB_ORDER[next])
    tabRefs.current[next]?.focus()
  }

  return (
    <section aria-label="Filtros y búsqueda" className={cn(cardClass, 'flex flex-col gap-4 p-4')}>
      <div className="max-w-full overflow-x-auto rounded-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div role="tablist" aria-label="Tipo de respuesta" className="flex w-max gap-1 rounded-full bg-chip p-1">
          {TAB_ORDER.map((value, index) => {
            const selected = value === tab
            return (
              <button
                key={value}
                ref={(element) => {
                  tabRefs.current[index] = element
                }}
                type="button"
                role="tab"
                id={`comunicacion-tab-${value}`}
                aria-selected={selected}
                aria-controls={listId}
                tabIndex={selected ? 0 : -1}
                onClick={() => onTabChange(value)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                className={cn(
                  'whitespace-nowrap rounded-full px-4 py-1.5 text-center text-xs font-semibold leading-4 tracking-[0.24px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand',
                  selected
                    ? 'bg-ink text-white shadow-[0px_1px_1px_rgba(0,0,0,0.05)]'
                    : 'text-muted hover:bg-white/70 hover:text-ink',
                )}
              >
                {TAB_LABELS[value]}
                {counts ? ` (${counts[value]})` : ''}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2 xl:grid-cols-12">
        <div className="relative sm:col-span-2 xl:col-span-6">
          <img
            src={searchIcon}
            alt=""
            width={13.5}
            height={13.5}
            className="pointer-events-none absolute left-[14px] top-1/2 -translate-y-1/2"
          />
          <input
            type="search"
            value={props.search}
            onChange={(event) => props.onSearchChange(event.target.value)}
            aria-label="Buscar por código del niño o alias del cuidador"
            placeholder="Buscar por código del niño (ej. N0001) o alias del cuidador..."
            className="h-11 w-full min-w-0 rounded-full border border-line bg-chip pl-10 pr-4 text-[13px] text-ink outline-none transition-colors placeholder:text-muted focus:border-ink/30 focus:ring-2 focus:ring-brand/20"
          />
        </div>

        <PillSelect
          className="xl:col-span-3"
          label="Semana"
          value={props.week}
          options={props.weekOptions.map((option) => ({ value: option.value, label: option.label }))}
          onChange={(value) => props.onWeekChange(value)}
        />
        <PillSelect
          className="xl:col-span-3"
          label="Motivo"
          value={props.reason}
          options={REASON_OPTIONS}
          onChange={(value) => props.onReasonChange(value as Razon | 'todos')}
        />
      </div>
    </section>
  )
}
