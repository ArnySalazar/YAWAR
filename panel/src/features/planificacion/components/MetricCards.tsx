import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import listIcon from '../assets/list-numbered.svg'
import homeVisitIcon from '../assets/home-visit.svg'
import messageIcon from '../assets/message-gray.svg'
import alertIcon from '../assets/alert-circle.svg'
import type { PlanSummary } from '../utils'
import type { WeeklyPlan } from '../types'

interface MetricCardProps {
  label: string
  icon: ReactNode
  iconBg: string
  value: number
  valueClass?: string
  aside: ReactNode
  footer: ReactNode
}

function MetricCard({ label, icon, iconBg, value, valueClass, aside, footer }: MetricCardProps) {
  return (
    <article className="flex flex-col justify-between rounded-[16px] bg-white p-5 drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between gap-3 pb-3">
        <h2 className="text-[11px] leading-[14px] font-semibold tracking-[0.55px] text-muted uppercase">{label}</h2>
        <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', iconBg)}>{icon}</span>
      </div>
      <div className="flex flex-col gap-2">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className={cn('text-[32px] leading-10 font-bold tracking-[-0.8px] text-ink-strong', valueClass)}>
            {value}
          </span>
          {aside}
        </p>
        {footer}
      </div>
    </article>
  )
}

const unitClass = 'text-[12px] leading-4 font-semibold tracking-[0.24px] text-muted'
const footerClass = 'text-[13px] leading-[18px] text-muted'

export function MetricCards({ plan, summary }: { plan: WeeklyPlan; summary: PlanSummary }) {
  return (
    <section aria-label="Resumen de la planificación" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label="Priorizados (señal R1 o R2)"
        iconBg="bg-chip"
        icon={<img src={listIcon} alt="" width={13.5} height={15} />}
        value={summary.withSignal}
        aside={<span className={unitClass}>niños</span>}
        footer={
          <p className={cn(footerClass, 'flex flex-wrap items-center gap-1.5')}>
            <span className="font-semibold text-ink-strong">{summary.signalPct}%</span>
            <span>del padrón de {plan.rosterSize}</span>
          </p>
        }
      />
      <MetricCard
        label="Asignados a visita"
        iconBg="bg-chip"
        icon={<img src={homeVisitIcon} alt="" width={12} height={13.5} />}
        value={summary.homeVisits}
        aside={
          <span className="rounded-full bg-chip px-2 py-0.5 text-[11px] leading-[14px] font-medium tracking-[0.33px] text-ink-strong">
            Capacidad N = {plan.visitCapacity}
          </span>
        }
        footer={
          <p className={cn(footerClass, 'flex items-center gap-1.5')}>
            <span aria-hidden className="size-2 shrink-0 rounded-full bg-brand-dark" />
            Máxima atención en terreno
          </p>
        }
      />
      <MetricCard
        label="Asignados a WhatsApp"
        iconBg="bg-chip"
        icon={<img src={messageIcon} alt="" width={15} height={15} />}
        value={summary.whatsapp}
        aside={<span className={unitClass}>cuidadores</span>}
        footer={
          <p className={cn(footerClass, 'flex items-center gap-1.5')}>
            <span aria-hidden className="size-2 shrink-0 rounded-full bg-muted" />
            Recordatorio semanal automático
          </p>
        }
      />
      <MetricCard
        label="Dificultades reportadas"
        iconBg="bg-[#ffdad7]"
        icon={<img src={alertIcon} alt="" width={15} height={15} />}
        value={summary.difficulties}
        valueClass="text-brand-dark"
        aside={
          <span className="rounded-full bg-[#ffdad7] px-2 py-0.5 text-[11px] leading-[14px] font-semibold tracking-[0.33px] text-[#930018]">
            Regla R1
          </span>
        }
        footer={<p className={footerClass}>Respondieron «No le di» o «Tuve un problema» la semana pasada</p>}
      />
    </section>
  )
}
