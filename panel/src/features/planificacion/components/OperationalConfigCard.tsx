import { useId, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import calendarIcon from '../assets/calendar-red.svg'
import buildingIcon from '../assets/building.svg'
import minusIcon from '../assets/minus.svg'
import plusIcon from '../assets/plus.svg'
import refreshIcon from '../assets/refresh-white.svg'
import forkIcon from '../assets/fork-red.svg'
import { formatWeekLabel, type PlanSummary } from '../utils'
import type { WeeklyPlan } from '../types'

interface OperationalConfigCardProps {
  plan: WeeklyPlan
  summary: PlanSummary
  isGenerating: boolean
  generateError: string | null
  onGenerate: (visitCapacity: number) => void
}

const labelClass = 'text-[11px] leading-[14px] font-medium tracking-[0.55px] text-muted uppercase'

function SettingField({ label, labelId, children }: { label: ReactNode; labelId?: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 xl:flex-1">
      <p id={labelId} className={labelClass}>
        {label}
      </p>
      {children}
    </div>
  )
}

export function OperationalConfigCard({ plan, summary, isGenerating, generateError, onGenerate }: OperationalConfigCardProps) {
  const maxCapacity = Math.max(summary.total, 0)
  const [capacity, setCapacity] = useState(Math.min(plan.visitCapacity, maxCapacity))
  const capacityLabelId = useId()

  const changeCapacity = (delta: number) => setCapacity((n) => Math.min(maxCapacity, Math.max(0, n + delta)))

  return (
    <section
      aria-label="Configuración operativa de la semana"
      className="flex flex-col gap-4 rounded-[16px] border border-line bg-white p-4 drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] sm:p-6"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:flex xl:items-center xl:gap-6">
        <SettingField label="Semana">
          <div className="flex items-center gap-2.5 rounded-[12px] bg-chip py-2.5 pr-4 pl-4">
            <img src={calendarIcon} alt="" width={15} height={16.6667} className="shrink-0" />
            <div className="min-w-0">
              <p className="text-[12px] leading-4 font-semibold tracking-[0.24px] text-ink-strong">
                {formatWeekLabel(plan)}
              </p>
              <p className="text-[13px] leading-[18px] text-muted">Semana en curso (la API planifica solo la actual)</p>
            </div>
          </div>
        </SettingField>

        <SettingField label="Establecimiento de salud">
          <div className="flex items-center gap-2.5 rounded-[12px] bg-chip py-2.5 pr-4 pl-4">
            <img src={buildingIcon} alt="" width={16.6667} height={15} className="shrink-0" />
            <div className="min-w-0">
              <p className="text-[12px] leading-4 font-semibold tracking-[0.24px] text-ink-strong">
                {plan.establishmentId}
              </p>
              <p className="text-[13px] leading-[18px] text-muted">
                Padrón: {plan.rosterSize} niños
                {plan.ageRange && ` de ${plan.ageRange.minMonths}-${plan.ageRange.maxMonths} meses`}
              </p>
            </div>
          </div>
        </SettingField>

        <SettingField
          labelId={capacityLabelId}
          label={
            <span className="flex items-center justify-between gap-2">
              <span>Capacidad de visitas (N)</span>
              <span className="font-semibold tracking-[0.33px] normal-case text-brand-dark">
                {capacity} visitas disp.
              </span>
            </span>
          }
        >
          <div
            role="group"
            aria-labelledby={capacityLabelId}
            className="flex items-center gap-3 rounded-[12px] bg-chip px-3 py-1.5"
          >
            <button
              type="button"
              aria-label="Disminuir capacidad de visitas"
              onClick={() => changeCapacity(-1)}
              disabled={capacity <= 0}
              className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-chip hover:bg-white disabled:opacity-40"
            >
              <img src={minusIcon} alt="" width={9.33333} height={1.33333} />
            </button>
            <p className="flex flex-1 items-baseline justify-center gap-1.5" aria-live="polite">
              <span className="text-[18px] leading-6 font-semibold text-ink-strong">{capacity}</span>
              <span className="text-[13px] leading-[18px] text-muted">familias</span>
            </p>
            <button
              type="button"
              aria-label="Aumentar capacidad de visitas"
              onClick={() => changeCapacity(1)}
              disabled={capacity >= maxCapacity}
              className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-chip hover:bg-white disabled:opacity-40"
            >
              <img src={plusIcon} alt="" width={9.33333} height={9.33333} />
            </button>
          </div>
        </SettingField>

        <div className="flex flex-col items-center justify-end md:items-end xl:items-center">
          <button
            type="button"
            onClick={() => onGenerate(capacity)}
            disabled={isGenerating}
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 text-center text-[12px] leading-4 font-semibold tracking-[0.24px] text-white drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] hover:bg-brand-dark disabled:opacity-70',
              capacity !== Math.min(plan.visitCapacity, maxCapacity) && !isGenerating && 'ring-2 ring-brand/30 ring-offset-2',
            )}
          >
            <img src={refreshIcon} alt="" width={12} height={12} className={cn(isGenerating && 'animate-spin')} />
            {isGenerating ? 'Calculando…' : 'Generar planificación'}
          </button>
          <p className="pt-1 text-center text-[11px] leading-[14px] font-medium tracking-[0.33px] text-muted">
            Vuelve a ordenar con la capacidad N
          </p>
        </div>
      </div>

      {generateError && (
        <p role="alert" className="rounded-[12px] bg-brand-soft px-4 py-2 text-[13px] leading-[18px] text-brand">
          No se pudo generar la planificación: {generateError}
        </p>
      )}

      <div className="flex flex-col gap-3 rounded-[12px] bg-chip px-4 pt-3 pb-2">
        <div className="flex items-start gap-2">
          <img src={forkIcon} alt="" width={12} height={13.3333} className="mt-[2.33px] shrink-0" />
          <p className="text-[13px] leading-[18px] text-muted">
            Regla de corte activa: los <strong className="font-semibold text-ink-strong">{summary.homeVisits} primeros</strong>{' '}
            niños con mayor urgencia van a{' '}
            <strong className="font-semibold text-ink-strong">VISITA DOMICILIARIA PRESENCIAL</strong>; los{' '}
            <strong className="font-semibold text-ink-strong">{summary.whatsapp} siguientes</strong> a{' '}
            <strong className="font-semibold text-ink-strong">SEGUIMIENTO POR WHATSAPP</strong>.
          </p>
        </div>
        <p className="text-[11px] leading-[14px] font-medium tracking-[0.33px] text-nav-ink">
          Capacidad de campo: {summary.capacityPct}% comprometida
        </p>
      </div>
    </section>
  )
}
