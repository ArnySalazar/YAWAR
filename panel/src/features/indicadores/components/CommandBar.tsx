import buildingIcon from '../assets/building.svg'
import calendarIcon from '../assets/calendar.svg'
import chevronDownIcon from '../assets/chevron-down.svg'
import type { SemanaIso } from '@/api/yawar'
import { EtiquetaSeguimiento } from '@/components/ui/EtiquetaSeguimiento'
import { cn } from '@/lib/cn'
import { ExportMenu } from './ExportMenu'
import type { DifficultySummary, IndicatorsReport, WeekOption } from '../types'

interface CommandBarProps {
  establishments: readonly string[]
  establishmentId: string
  onEstablishmentChange: (id: string) => void
  weeks: WeekOption[]
  selectedWeek: SemanaIso | undefined
  onWeekChange: (semana: SemanaIso) => void
  report: IndicatorsReport | undefined
  difficulties: DifficultySummary | undefined
}

/** Sub-cabecera: etiqueta común, título, selectores de contexto y exportación. */
export function CommandBar({
  establishments,
  establishmentId,
  onEstablishmentChange,
  weeks,
  selectedWeek,
  onWeekChange,
  report,
  difficulties,
}: CommandBarProps) {
  return (
    <section
      aria-label="Controles de contexto"
      className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between xl:gap-10"
    >
      <div className="flex max-w-[768px] flex-col gap-1">
        <EtiquetaSeguimiento />
        <h1 className="text-2xl leading-8 font-semibold tracking-[-0.6px] text-ink-strong">Indicadores de seguimiento</h1>
        <p className="max-w-[440px] text-sm leading-5 text-muted">
          Monitoreo del canal automatizado y acompañamiento oportuno en suplementación con hierro en el marco del
          programa CRED (6 a 35 meses).
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 2xl:gap-x-[38px] print:hidden">
        <PillSelect
          icon={buildingIcon}
          iconSize={[13.333, 12]}
          label="Establecimiento"
          className="w-full gap-3 sm:w-[200px]"
          value={establishmentId}
          options={establishments.map((id) => ({ value: id, label: id }))}
          onChange={onEstablishmentChange}
        />
        <PillSelect
          icon={calendarIcon}
          iconSize={[12, 13.333]}
          label="Semana"
          className="w-full gap-2 sm:w-[276px]"
          value={selectedWeek ?? ''}
          options={weeks.map((week) => ({ value: week.semana, label: week.label }))}
          onChange={onWeekChange}
        />
        <ExportMenu report={report} difficulties={difficulties} />
      </div>
    </section>
  )
}

interface PillSelectProps {
  icon: string
  iconSize: [number, number]
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
  className?: string
}

/** Selector con forma de píldora: el <select> nativo va encima, invisible, para mantener accesibilidad. */
function PillSelect({ icon, iconSize, label, value, options, onChange, className }: PillSelectProps) {
  const selected = options.find((option) => option.value === value)

  return (
    <label
      className={cn(
        'relative flex items-center rounded-full bg-white px-3.5 py-1.5 shadow-[0px_1px_1px_rgba(0,0,0,0.05)] focus-within:ring-2 focus-within:ring-brand/30 hover:bg-chip',
        className,
      )}
    >
      <img src={icon} alt="" width={iconSize[0]} height={iconSize[1]} className="shrink-0" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[11px] leading-[14px] font-medium tracking-[0.33px] text-muted">{label}</span>
        <span className="truncate text-xs leading-4 font-semibold tracking-[0.24px] text-ink-strong">
          {selected?.label ?? '—'}
        </span>
      </span>
      <img src={chevronDownIcon} alt="" width={12} height={4.933} className="shrink-0" />
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={options.length === 0}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
