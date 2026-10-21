import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/AsyncContent'
import { cn } from '@/lib/cn'
import { formatPercent } from '../format'
import type { ChildrenSummary } from '../types'
import padronIcon from '../assets/icon-kpi-padron.svg'
import weeklyResponseIcon from '../assets/icon-kpi-weekly-response.svg'
import homeVisitIcon from '../assets/icon-kpi-home-visit.svg'
import alertIcon from '../assets/icon-kpi-alert.svg'
import trendUpIcon from '../assets/icon-trend-up.svg'

interface KpiCardProps {
  title: string
  icon: string
  iconBg: string
  /** "…" mientras carga; "—" si el dato no se pudo leer. */
  value: number | string
  valueClassName?: string
  unit: string
  unitClassName?: string
  footer: ReactNode
}

function KpiCard({ title, icon, iconBg, value, valueClassName, unit, unitClassName, footer }: KpiCardProps) {
  return (
    <article className="flex flex-col justify-between rounded-[20px] border border-line bg-white p-4 shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs leading-4 font-semibold tracking-[0.6px] text-[#737373] uppercase">{title}</h2>
        <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full', iconBg)}>
          <img src={icon} alt="" width={16} height={16} />
        </span>
      </div>
      <div className="flex flex-col gap-[3.5px] pt-3">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className={cn('text-[30px] leading-9 font-bold text-ink', valueClassName)}>{value}</span>
          <span className={cn('text-sm leading-5 font-semibold text-[#a3a3a3]', unitClassName)}>{unit}</span>
        </p>
        <div className="flex items-center gap-1.5 text-xs leading-4">{footer}</div>
      </div>
    </article>
  )
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

function WeeklyResponseCard({ weeklyResponse }: Pick<ChildrenSummary, 'weeklyResponse'>) {
  const common = { title: 'Con respuesta semanal', icon: weeklyResponseIcon, iconBg: 'bg-[#e8f5e9]' }
  if (weeklyResponse === undefined) {
    return <KpiCard {...common} value="…" unit="" footer={<span className="text-[#737373]">Cargando indicadores…</span>} />
  }
  if (weeklyResponse === null) {
    return (
      <KpiCard
        {...common}
        value="—"
        unit=""
        footer={<span className="text-[#737373]">No se pudieron leer los indicadores de la semana</span>}
      />
    )
  }
  return (
    <KpiCard
      {...common}
      value={weeklyResponse.responded}
      unit={`/ ${weeklyResponse.contacted} contactados`}
      footer={
        weeklyResponse.returnRate === null ? (
          <span className="text-[#737373]">Sin recordatorios enviados esta semana</span>
        ) : (
          <>
            <img src={trendUpIcon} alt="" width={14} height={14} className="shrink-0" />
            <span className="font-semibold text-[#047857]">
              {formatPercent(weeklyResponse.returnRate)} tasa de respuesta esta semana
            </span>
          </>
        )
      }
    />
  )
}

function AlertsCard({ alerts }: Pick<ChildrenSummary, 'alerts'>) {
  return (
    <KpiCard
      title="Alertas y dificultades"
      icon={alertIcon}
      iconBg="bg-[#feecec]"
      value={alerts === undefined ? '…' : alerts === null ? '—' : alerts.active}
      valueClassName="text-brand"
      unit="casos activos"
      footer={
        <>
          <span aria-hidden className="size-1.5 shrink-0 rounded-[3px] bg-brand" />
          <span className="font-medium text-brand">
            {alerts === undefined
              ? 'Cargando respuestas de los cuidadores…'
              : alerts === null
                ? 'No se pudieron leer las respuestas'
                : `${plural(alerts.problems, 'reportó un problema', 'reportaron un problema')} · ${plural(alerts.refusals, 'no le dio', 'no le dieron')}`}
          </span>
        </>
      }
    />
  )
}

export function KpiCards({ summary }: { summary: ChildrenSummary }) {
  const { totalActive, ageRange, weeklyResponse, homeVisits, alerts } = summary
  return (
    <section aria-label="Indicadores del padrón" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        title="Total en padrón activo"
        icon={padronIcon}
        iconBg="bg-chip"
        value={totalActive}
        unit="niños"
        footer={
          <>
            <span aria-hidden className="size-2 shrink-0 rounded-full bg-brand" />
            <span className="text-[#737373]">
              {ageRange ? `${ageRange.minMonths} a ${ageRange.maxMonths} meses de edad en jurisdicción` : 'Sin niños'}
            </span>
          </>
        }
      />
      <WeeklyResponseCard weeklyResponse={weeklyResponse} />
      <KpiCard
        title="Visitas domiciliarias"
        icon={homeVisitIcon}
        iconBg="bg-[#fff4e5]"
        value={homeVisits.assigned}
        unit="asignadas esta semana"
        unitClassName="text-[#9e5b00]"
        footer={
          <>
            <span aria-hidden className="size-1.5 shrink-0 rounded-[3px] bg-[#f2a413]" />
            <span className="text-[#737373]">{homeVisits.whatsapp} con seguimiento por WhatsApp</span>
          </>
        }
      />
      <AlertsCard alerts={alerts} />
    </section>
  )
}

export function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy>
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-[133.5px]" />
      ))}
    </div>
  )
}
